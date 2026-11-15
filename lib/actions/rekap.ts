"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/admin-auth";
import { Prisma } from "@/lib/generated/prisma/client";
import { OutOfStockError, syncProductTotals, takeVariantStock } from "@/lib/product-stock";
import { fmtPhone, itemKey, nameKey, normPhone, tidy, validPhone } from "@/lib/rekap";

export type RekapResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const done = () => revalidatePath("/admin/rekap");
const fail = (error: string) => ({ ok: false as const, error });
const int = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : NaN;
};

// --- PO Event ---------------------------------------------------------------

export async function createPoEvent(name: string): Promise<RekapResult<{ id: string }>> {
  await requireAdminAction();
  const clean = tidy(name).slice(0, 80);
  if (!clean) return fail("Isi nama PO Event, mis. Live Jepang 20 Nov.");
  const ev = await prisma.poEvent.create({ data: { name: clean } });
  done();
  return { ok: true, id: ev.id };
}

// --- Customers --------------------------------------------------------------

async function checkBuyer(name: string, phone: string, exceptId?: string) {
  const clean = tidy(name).slice(0, 80);
  const ph = normPhone(phone);
  if (!clean) return { error: "Isi nama customer." };
  if (!validPhone(ph)) return { error: "No. HP tidak valid (contoh: 081234567890)." };
  const [byPhone, byName] = await Promise.all([
    prisma.buyer.findUnique({ where: { phone: ph } }),
    prisma.buyer.findUnique({ where: { nameKey: nameKey(clean) } }),
  ]);
  if (byPhone && byPhone.id !== exceptId)
    return { error: `No. HP ini sudah terdaftar atas nama ${byPhone.name}.` };
  if (byName && byName.id !== exceptId)
    return {
      error: `Nama "${byName.name}" sudah dipakai (${fmtPhone(byName.phone)}). Tambahkan pembeda, misal "${clean} Bekasi".`,
    };
  return { name: clean, phone: ph };
}

export type BuyerDTO = { id: string; name: string; phone: string };

export async function createBuyer(
  name: string,
  phone: string
): Promise<RekapResult<{ buyer: BuyerDTO }>> {
  await requireAdminAction();
  const c = await checkBuyer(name, phone);
  if ("error" in c) return fail(c.error!);
  try {
    const b = await prisma.buyer.create({
      data: { name: c.name, nameKey: nameKey(c.name), phone: c.phone },
    });
    done();
    return { ok: true, buyer: { id: b.id, name: b.name, phone: b.phone } };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return fail("Nama atau no. HP ini baru saja didaftarkan. Cari lagi di daftar.");
    throw e;
  }
}

export async function updateBuyer(id: string, name: string, phone: string): Promise<RekapResult> {
  await requireAdminAction();
  const c = await checkBuyer(name, phone, id);
  if ("error" in c) return fail(c.error!);
  await prisma.buyer.update({
    where: { id },
    data: { name: c.name, nameKey: nameKey(c.name), phone: c.phone },
  });
  done();
  return { ok: true };
}

export async function deleteBuyer(id: string): Promise<RekapResult> {
  await requireAdminAction();
  const [po, sales] = await Promise.all([
    prisma.poOrder.count({ where: { buyerId: id } }),
    prisma.readySale.count({ where: { buyerId: id } }),
  ]);
  if (po + sales > 0)
    return fail(`Customer ini masih punya ${po + sales} order/penjualan, jadi tidak bisa dihapus.`);
  await prisma.buyer.delete({ where: { id } });
  done();
  return { ok: true };
}

/** Bulk add from a pasted spreadsheet; the client already checked the rows. */
export async function importBuyers(
  rows: { name: string; phone: string }[]
): Promise<RekapResult<{ added: number; skipped: number }>> {
  await requireAdminAction();
  if (!Array.isArray(rows) || rows.length > 2000) return fail("Data impor tidak valid.");
  const data = rows
    .map((r) => ({ name: tidy(r.name).slice(0, 80), phone: normPhone(r.phone) }))
    .filter((r) => r.name && validPhone(r.phone))
    .map((r) => ({ ...r, nameKey: nameKey(r.name) }));
  // skipDuplicates: anything clashing with an existing name or number is left alone.
  const { count } = await prisma.buyer.createMany({ data, skipDuplicates: true });
  done();
  return { ok: true, added: count, skipped: rows.length - count };
}

// --- Pre-Order recap ----------------------------------------------------------

export async function addPoOrder(input: {
  eventId: string;
  buyerId: string;
  name: string;
  variant: string;
  qty: number;
  price: number;
}): Promise<RekapResult> {
  const admin = await requireAdminAction();
  const name = tidy(input.name).slice(0, 120);
  const variant = tidy(input.variant).slice(0, 60);
  const qty = int(input.qty);
  const price = Math.max(0, int(input.price) || 0);
  if (!name) return fail("Isi nama barang.");
  if (!Number.isFinite(qty) || qty < 1 || qty > 999) return fail("Jumlah tidak valid.");

  const [event, buyer] = await Promise.all([
    prisma.poEvent.findUnique({ where: { id: input.eventId } }),
    prisma.buyer.findUnique({ where: { id: input.buyerId } }),
  ]);
  if (!event) return fail("PO Event tidak ditemukan.");
  if (!buyer) return fail("Pilih customer dulu.");

  const key = itemKey(name, variant);
  const product = await prisma.product.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    let item = await tx.poItem.findUnique({ where: { eventId_key: { eventId: event.id, key } } });
    if (!item) {
      item = await tx.poItem.upsert({
        where: { eventId_key: { eventId: event.id, key } },
        create: { eventId: event.id, key, name, variant, price, productId: product?.id },
        update: {},
      });
    } else if (price > 0 && item.price === 0) {
      await tx.poItem.update({ where: { id: item.id }, data: { price } });
    }
    await tx.poOrder.create({
      data: { eventId: event.id, itemId: item.id, buyerId: buyer.id, qty, adminName: admin.name },
    });
  });
  done();
  return { ok: true };
}

export async function changePoOrderQty(orderId: string, delta: number): Promise<RekapResult> {
  await requireAdminAction();
  const d = int(delta);
  if (d !== 1 && d !== -1) return fail("Perubahan tidak valid.");
  // Conditional update keeps qty between 1 and 999 even with fast taps.
  await prisma.poOrder.updateMany({
    where: { id: orderId, qty: d < 0 ? { gt: 1 } : { lt: 999 } },
    data: { qty: { increment: d } },
  });
  done();
  return { ok: true };
}

export async function deletePoOrder(orderId: string): Promise<RekapResult> {
  await requireAdminAction();
  await prisma.poOrder.deleteMany({ where: { id: orderId } });
  done();
  return { ok: true };
}

/** "Diambil" counter on the shopping list: +1 / −1, never below 0. */
export async function changeItemGot(itemId: string, delta: number): Promise<RekapResult> {
  await requireAdminAction();
  const d = int(delta);
  if (!Number.isFinite(d) || Math.abs(d) > 999 || d === 0) return fail("Perubahan tidak valid.");
  if (d > 0) {
    await prisma.poItem.updateMany({ where: { id: itemId }, data: { got: { increment: d } } });
  } else {
    await prisma.poItem.updateMany({
      where: { id: itemId, got: { gte: -d } },
      data: { got: { increment: d } },
    });
  }
  done();
  return { ok: true };
}

/** "Ambil pas": set the bought count to exactly what was ordered. */
export async function setItemGot(itemId: string, got: number): Promise<RekapResult> {
  await requireAdminAction();
  const g = int(got);
  if (!Number.isFinite(g) || g < 0 || g > 99999) return fail("Jumlah tidak valid.");
  await prisma.poItem.update({ where: { id: itemId }, data: { got: g } });
  done();
  return { ok: true };
}

export async function setItemPrice(itemId: string, price: number): Promise<RekapResult> {
  await requireAdminAction();
  const p = int(price);
  if (!Number.isFinite(p) || p < 0) return fail("Harga tidak valid.");
  await prisma.poItem.update({ where: { id: itemId }, data: { price: p } });
  done();
  return { ok: true };
}

export async function setItemCost(itemId: string, cost: number | null): Promise<RekapResult> {
  const admin = await requireAdminAction();
  if (!admin.isSuperAdmin) return fail("Hanya owner yang bisa mengisi modal.");
  const c = cost === null ? null : int(cost);
  if (c !== null && (!Number.isFinite(c) || c < 0)) return fail("Modal tidak valid.");
  await prisma.poItem.update({ where: { id: itemId }, data: { cost: c || null } });
  done();
  return { ok: true };
}

export async function setItemSoldOut(itemId: string, soldOut: boolean): Promise<RekapResult> {
  await requireAdminAction();
  await prisma.poItem.update({ where: { id: itemId }, data: { soldOut: Boolean(soldOut) } });
  done();
  return { ok: true };
}

// --- Ready Stock sales --------------------------------------------------------

export async function addReadySale(input: {
  buyerId: string;
  variantId: string;
  qty: number;
  price: number;
}): Promise<RekapResult> {
  const admin = await requireAdminAction();
  const qty = int(input.qty);
  const price = int(input.price);
  if (!Number.isFinite(qty) || qty < 1 || qty > 999) return fail("Jumlah tidak valid.");
  if (!Number.isFinite(price) || price < 0) return fail("Harga tidak valid.");

  const [buyer, variant] = await Promise.all([
    prisma.buyer.findUnique({ where: { id: input.buyerId } }),
    prisma.productVariant.findUnique({
      where: { id: input.variantId },
      include: { product: { select: { id: true, name: true, type: true, group: true } } },
    }),
  ]);
  if (!buyer) return fail("Pilih customer dulu.");
  if (!variant || variant.product.type !== "READY") return fail("Pilih barang Ready Stock.");

  try {
    await prisma.$transaction(async (tx) => {
      await takeVariantStock(tx, variant.id, qty);
      await syncProductTotals(tx, variant.productId);
      await tx.readySale.create({
        data: {
          buyerId: buyer.id,
          productId: variant.productId,
          variantId: variant.id,
          productName: variant.product.name,
          variantName: variant.name,
          category: variant.product.group,
          qty,
          price,
          costSnapshot: variant.avgCost,
          adminName: admin.name,
        },
      });
    });
  } catch (e) {
    if (e instanceof OutOfStockError) {
      return fail(`Stok tidak cukup, sisa ${variant.stockQty ?? 0} pcs.`);
    }
    throw e;
  }
  done();
  revalidatePath("/produk");
  revalidatePath("/admin/produk");
  return { ok: true };
}

/** Undo a recorded sale; the stock goes back to the same variant. */
export async function deleteReadySale(saleId: string): Promise<RekapResult> {
  await requireAdminAction();
  await prisma.$transaction(async (tx) => {
    const sale = await tx.readySale.findUnique({ where: { id: saleId } });
    if (!sale) return;
    await tx.readySale.delete({ where: { id: saleId } });
    if (sale.variantId) {
      const { count } = await tx.productVariant.updateMany({
        where: { id: sale.variantId, stockQty: { not: null } },
        data: { stockQty: { increment: sale.qty } },
      });
      if (count > 0 && sale.productId) await syncProductTotals(tx, sale.productId);
    }
  });
  done();
  revalidatePath("/produk");
  revalidatePath("/admin/produk");
  return { ok: true };
}
