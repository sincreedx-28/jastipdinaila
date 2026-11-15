"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/admin-auth";
import { lockVariant, nextAvgCost, syncProductTotals } from "@/lib/product-stock";

export type StockFormState = { error?: string; ok?: string } | undefined;

function readInt(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").replace(/\D/g, "");
  return raw === "" ? NaN : Number(raw);
}

function revalidateStock(productId: string) {
  revalidatePath(`/admin/produk/${productId}`);
  revalidatePath("/admin/produk");
  revalidatePath("/produk");
  revalidatePath("/");
}

/**
 * "Tambah stok (belanja)": stock bought on a shopping trip at a known price.
 * Owner only, because it reveals and changes the purchase cost.
 */
export async function addPurchaseStock(
  variantId: string,
  _prev: StockFormState,
  formData: FormData
): Promise<StockFormState> {
  const admin = await requireAdminAction();
  if (!admin.isSuperAdmin) return { error: "Hanya owner yang bisa mencatat belanja stok." };

  const qty = readInt(formData, "qty");
  const unitCost = readInt(formData, "unitCost");
  const note = String(formData.get("note") ?? "").trim().slice(0, 200) || null;
  if (!Number.isFinite(qty) || qty <= 0 || qty > 100000) return { error: "Jumlah tidak valid." };
  if (!Number.isFinite(unitCost) || unitCost <= 0) return { error: "Isi harga beli per pcs." };

  const result = await prisma.$transaction(async (tx) => {
    const v = await lockVariant(tx, variantId);
    if (!v || v.product.type !== "READY") return null;
    const before = v.stockQty ?? 0;
    const avgCost = nextAvgCost(before, v.avgCost, qty, unitCost);
    const stockAfter = before + qty;
    await tx.productVariant.update({
      where: { id: variantId },
      data: { stockQty: stockAfter, avgCost },
    });
    await tx.stockMovement.create({
      data: {
        variantId,
        type: "PURCHASE",
        qty,
        unitCost,
        stockAfter,
        avgCostAfter: avgCost,
        note,
        adminUserId: admin.id,
        adminName: admin.name,
      },
    });
    await syncProductTotals(tx, v.productId);
    return { productId: v.productId, stockAfter, avgCost };
  });
  if (!result) return { error: "Varian tidak ditemukan." };

  revalidateStock(result.productId);
  return {
    ok: `Stok jadi ${result.stockAfter} pcs, modal rata-rata Rp${result.avgCost.toLocaleString("id-ID")}.`,
  };
}

/**
 * "Koreksi stok": set the count to what is actually on the shelf (recount,
 * damaged, given away…). Any admin can do this; it never changes the average
 * cost.
 */
export async function correctStock(
  variantId: string,
  _prev: StockFormState,
  formData: FormData
): Promise<StockFormState> {
  const admin = await requireAdminAction();

  const actual = readInt(formData, "actualQty");
  const note = String(formData.get("note") ?? "").trim().slice(0, 200) || null;
  if (!Number.isFinite(actual) || actual < 0 || actual > 100000) {
    return { error: "Isi jumlah stok yang sebenarnya." };
  }

  const result = await prisma.$transaction(async (tx) => {
    const v = await lockVariant(tx, variantId);
    if (!v || v.product.type !== "READY") return null;
    const delta = actual - (v.stockQty ?? 0);
    if (delta === 0) return { productId: v.productId, delta };
    await tx.productVariant.update({ where: { id: variantId }, data: { stockQty: actual } });
    await tx.stockMovement.create({
      data: {
        variantId,
        type: "ADJUSTMENT",
        qty: delta,
        stockAfter: actual,
        avgCostAfter: v.avgCost,
        note,
        adminUserId: admin.id,
        adminName: admin.name,
      },
    });
    await syncProductTotals(tx, v.productId);
    return { productId: v.productId, delta };
  });
  if (!result) return { error: "Varian tidak ditemukan." };

  revalidateStock(result.productId);
  return {
    ok:
      result.delta === 0
        ? "Stok sudah sesuai, tidak ada perubahan."
        : `Stok dikoreksi jadi ${actual} pcs (${result.delta > 0 ? "+" : ""}${result.delta}).`,
  };
}
