"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SETTINGS_KEYS } from "@/lib/settings";
import { getCurrentAdmin } from "@/lib/admin-auth";

export type SettingsFormState = { success?: boolean; error?: string } | undefined;

export async function updateSettings(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const admin = await getCurrentAdmin();
  if (!admin?.isSuperAdmin) {
    return { error: "Hanya super admin yang bisa mengubah pengaturan ini." };
  }

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
