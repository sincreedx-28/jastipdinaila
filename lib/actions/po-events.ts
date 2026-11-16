"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/admin-auth";
import { copyProduct } from "@/lib/product-copy";
import { tidy } from "@/lib/rekap";

export type PoEventResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export type PoEventInput = {
  name: string;
  place: string;
  openDate: string;
  closeDate: string;
  etaDate: string;
  etaNote: string;
  note: string;
};

const fail = (error: string) => ({ ok: false as const, error });
const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const toDate = (s: string) => (s ? new Date(`${s}T00:00:00Z`) : null);

function revalidate() {
  revalidatePath("/admin/po-event");
  revalidatePath("/admin/rekap");
  revalidatePath("/admin/produk");
  revalidatePath("/produk");
  revalidatePath("/");
}

function parse(input: PoEventInput) {
  const name = tidy(input.name).slice(0, 80);
  if (!name) return { error: "Isi nama PO Event, mis. Live Jepang 20 Nov." };
  for (const [k, label] of [
    ["openDate", "Order dibuka"],
    ["closeDate", "Order ditutup"],
    ["etaDate", "Estimasi ready"],
  ] as const) {
    if (input[k] && !isDay(input[k])) return { error: `Tanggal "${label}" tidak valid.` };
  }
  if (input.openDate && input.closeDate && input.closeDate < input.openDate)
    return { error: "Tanggal order ditutup tidak boleh sebelum order dibuka." };
  return {
    data: {
      name,
      place: tidy(input.place).slice(0, 80) || null,
      openDate: toDate(input.openDate),
      closeDate: toDate(input.closeDate),
      etaDate: toDate(input.etaDate),
      etaNote: tidy(input.etaNote).slice(0, 80) || null,
      note: String(input.note ?? "").trim().slice(0, 400) || null,
    },
  };
}

export async function savePoEvent(
  id: string | null,
  input: PoEventInput
): Promise<PoEventResult<{ id: string }>> {
  await requireAdminAction();
  const p = parse(input);
  if ("error" in p) return fail(p.error!);
  const ev = id
    ? await prisma.poEvent.update({ where: { id }, data: p.data })
    : await prisma.poEvent.create({ data: p.data });
  revalidate();
  return { ok: true, id: ev.id };
}

/** Archived batches and their products disappear from the shop. */
export async function setPoEventArchived(id: string, archived: boolean): Promise<PoEventResult> {
  await requireAdminAction();
  await prisma.poEvent.update({ where: { id }, data: { status: archived ? "ARCHIVED" : "OPEN" } });
  revalidate();
  return { ok: true };
}

export async function deletePoEvent(id: string): Promise<PoEventResult> {
  await requireAdminAction();
  const [products, orders] = await Promise.all([
    prisma.product.count({ where: { poEventId: id } }),
    prisma.poOrder.count({ where: { eventId: id } }),
  ]);
  if (products + orders > 0)
    return fail("PO Event ini masih punya produk atau order, jadi tidak bisa dihapus. Arsipkan saja.");
  await prisma.poEvent.delete({ where: { id } });
  revalidate();
  return { ok: true };
}

/**
 * "Duplikat untuk batch berikutnya": a new PO Event with the same place and
 * note (dates left empty to fill in), plus copies of the chosen products
 * (prices, variants, photos). Optionally archives the old batch.
 */
export async function duplicatePoEvent(
  sourceId: string,
  input: PoEventInput,
  productIds: string[],
  archiveOld: boolean
): Promise<PoEventResult<{ id: string; copied: number }>> {
  await requireAdminAction();
  const p = parse(input);
  if ("error" in p) return fail(p.error!);
  const source = await prisma.poEvent.findUnique({ where: { id: sourceId } });
  if (!source) return fail("PO Event asal tidak ditemukan.");
  if (!Array.isArray(productIds) || productIds.length > 300) return fail("Daftar produk tidak valid.");

  const ev = await prisma.poEvent.create({ data: p.data });
  const allowed = await prisma.product.findMany({
    where: { id: { in: productIds }, poEventId: sourceId },
    select: { id: true },
    orderBy: { name: "asc" },
  });
  let copied = 0;
  for (const { id } of allowed) {
    if (await copyProduct(id, { poEventId: ev.id, isActive: true })) copied++;
  }
  if (archiveOld) await prisma.poEvent.update({ where: { id: sourceId }, data: { status: "ARCHIVED" } });
  revalidate();
  return { ok: true, id: ev.id, copied };
}
