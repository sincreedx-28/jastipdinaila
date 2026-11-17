"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/admin-auth";
import { cleanBarcode, isBarcode } from "@/lib/barcode";

export type BarcodeMatch = {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  type: "READY" | "PO";
};

/** Which product/variant (if any) already uses this barcode. */
export async function lookupBarcode(raw: string): Promise<BarcodeMatch | null> {
  await requireAdminAction();
  const code = cleanBarcode(raw);
  if (!isBarcode(code)) return null;
  const v = await prisma.productVariant.findUnique({
    where: { barcode: code },
    include: { product: { select: { id: true, name: true, type: true } } },
  });
  if (!v) return null;
  return {
    productId: v.product.id,
    productName: v.product.name,
    variantId: v.id,
    variantName: v.name,
    type: v.product.type,
  };
}
