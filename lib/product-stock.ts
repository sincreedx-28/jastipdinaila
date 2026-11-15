import type { Prisma } from "@/lib/generated/prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Weighted average purchase cost ("modal rata-rata") after buying `qty` more
 * units at `unitCost` each.
 *
 * Example: 4 pcs in stock at an average of Rp50.000, buy 6 more at Rp60.000
 * → (4×50.000 + 6×60.000) / 10 = Rp56.000 per pcs.
 *
 * Stock that has no known cost yet (avgCost null) is assumed to have cost the
 * same as this purchase, and with nothing in stock the new price simply
 * becomes the average.
 */
export function nextAvgCost(
  stockBefore: number,
  avgBefore: number | null,
  qty: number,
  unitCost: number
): number {
  const prev = Math.max(0, stockBefore);
  if (avgBefore === null || prev === 0) return unitCost;
  return Math.round((prev * avgBefore + qty * unitCost) / (prev + qty));
}

/**
 * Product.price and Product.stockQty are derived copies of the variant rows
 * (cheapest price, total stock) so listing pages can sort and show "sold out"
 * without joining. Call this after any change to a product's variants.
 */
export async function syncProductTotals(tx: Tx, productId: string) {
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: { type: true, variants: { select: { price: true, stockQty: true } } },
  });
  if (!product || product.variants.length === 0) return;

  const price = Math.min(...product.variants.map((v) => v.price));
  const stockQty =
    product.type === "READY"
      ? product.variants.reduce((sum, v) => sum + Math.max(0, v.stockQty ?? 0), 0)
      : null;

  await tx.product.update({ where: { id: productId }, data: { price, stockQty } });
}

export class OutOfStockError extends Error {}

/**
 * Takes `qty` units out of a READY variant only if that many are actually in
 * stock, in a single conditional UPDATE — two shoppers checking out the last
 * item at the same moment can't both get it, and stock never goes negative.
 */
export async function takeVariantStock(tx: Tx, variantId: string, qty: number) {
  const { count } = await tx.productVariant.updateMany({
    where: { id: variantId, stockQty: { gte: qty } },
    data: { stockQty: { decrement: qty } },
  });
  if (count === 0) throw new OutOfStockError(variantId);
}

/** Locks a variant row for the rest of the transaction and returns it. */
export async function lockVariant(tx: Tx, variantId: string) {
  await tx.$queryRaw`SELECT 1 FROM "ProductVariant" WHERE "id" = ${variantId} FOR UPDATE`;
  return tx.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { id: true, type: true, name: true } } },
  });
}
