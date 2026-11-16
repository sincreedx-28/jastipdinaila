import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * Products a shopper can see: active, and not a Pre-Order of an archived
 * PO Event (archiving a batch hides its products from the shop).
 */
export const shopVisible: Prisma.ProductWhereInput = {
  isActive: true,
  NOT: { type: "PO", poEvent: { status: "ARCHIVED" } },
};

export const poEventSelect = {
  id: true,
  name: true,
  status: true,
  place: true,
  openDate: true,
  closeDate: true,
  etaDate: true,
  etaNote: true,
  note: true,
} satisfies Prisma.PoEventSelect;
