"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SETTINGS_KEYS } from "@/lib/settings";

export type SettingsFormState = { success?: boolean } | undefined;

export async function updateSettings(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  await prisma.$transaction(
    SETTINGS_KEYS.map((key) =>
      prisma.settings.upsert({
        where: { key },
        create: { key, value: String(formData.get(key) ?? "").trim() },
        update: { value: String(formData.get(key) ?? "").trim() },
      })
    )
  );

  revalidatePath("/admin/pengaturan");
  revalidatePath("/pesanan", "layout");
  revalidatePath("/checkout");
  return { success: true };
}
