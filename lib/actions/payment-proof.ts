"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const PAYMENT_PROOF_BUCKET = "payment-proofs";

export type UploadProofState = { error?: string; success?: boolean } | undefined;

export async function uploadPaymentProof(
  orderId: string,
  _prevState: UploadProofState,
  formData: FormData
): Promise<UploadProofState> {
  const file = formData.get("proof");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pilih file bukti transfer terlebih dahulu." };
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Pesanan tidak ditemukan." };

  const supabase = await createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${orderId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PAYMENT_PROOF_BUCKET)
    .upload(path, file, { upsert: true });

  if (uploadError) {
    return { error: `Gagal upload: ${uploadError.message}` };
  }

  const { data } = supabase.storage.from(PAYMENT_PROOF_BUCKET).getPublicUrl(path);

  await prisma.order.update({
    where: { id: orderId },
    data: { paymentProofUrl: data.publicUrl },
  });

  revalidatePath(`/pesanan/${orderId}`);
  return { success: true };
}
