"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const PAYMENT_PROOF_BUCKET = "payment-proofs";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Client-supplied MIME type / filename extension can be spoofed, so the real
// format is sniffed from the file's magic bytes and used for both validation
// and the stored extension.
function sniffImageType(bytes: Uint8Array): { ext: string; mime: string } | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { ext: "png", mime: "image/png" };
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { ext: "webp", mime: "image/webp" };
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return { ext: "gif", mime: "image/gif" };
  }
  return null;
}

export type UploadProofState = { error?: string; success?: boolean } | undefined;

export async function uploadPaymentProof(
  orderId: string,
  _prevState: UploadProofState,
  formData: FormData
): Promise<UploadProofState> {
  const file = formData.get("proof");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a payment proof file first." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { error: "Maximum file size is 5MB." };
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImageType(buffer);
  if (!sniffed) {
    return { error: "File must be an image (JPEG, PNG, WebP, or GIF)." };
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Order not found." };

  const supabase = await createClient();
  const path = `${orderId}/${Date.now()}.${sniffed.ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PAYMENT_PROOF_BUCKET)
    .upload(path, buffer, { upsert: true, contentType: sniffed.mime });

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` };
  }

  const { data } = supabase.storage.from(PAYMENT_PROOF_BUCKET).getPublicUrl(path);

  await prisma.order.update({
    where: { id: orderId },
    data: { paymentProofUrl: data.publicUrl },
  });

  revalidatePath(`/pesanan/${orderId}`);
  return { success: true };
}
