// Client-safe helpers for Rekap Order: normalizing names and phone numbers,
// item keys, and the first-come-first-served (FIFO) allocation of what was
// actually bought to the buyers who ordered it.

/** Trim and collapse spaces. */
export const tidy = (s: string) => String(s ?? "").replace(/\s+/g, " ").trim();

/** Case-insensitive identity of a customer name. */
export const nameKey = (s: string) => tidy(s).toLowerCase();

/** "0812-3456-7890", "+62 812…", "812…" → "6281234567890". */
export function normPhone(s: string) {
  let d = String(s ?? "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return d;
}

export const validPhone = (p: string) => /^62\d{8,13}$/.test(p);

/** "6281234567890" → "0812-3456-7890". */
export function fmtPhone(p: string) {
  let d = String(p ?? "");
  if (d.startsWith("62")) d = "0" + d.slice(2);
  return d.replace(/^(\d{4})(\d{4})(\d+)$/, "$1-$2-$3");
}

/** Does a customer match a search by name or (part of) phone number? */
export function buyerMatches(b: { name: string; phone: string }, q: string) {
  const query = q.trim().toLowerCase();
  if (!query) return true;
  if (b.name.toLowerCase().includes(query)) return true;
  const digits = query.replace(/\D/g, "");
  if (digits.length < 3 || digits.length < query.replace(/[\s-]/g, "").length) return false;
  return b.phone.includes(digits) || ("0" + b.phone.slice(2)).includes(digits);
}

const slug = (s: string) =>
  tidy(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Same item + variant always lands on the same shopping-list line. */
export const itemKey = (name: string, variant: string) => `${slug(name)}|${slug(variant)}`;

/**
 * Catalog products are keyed by id, so every order of the same product +
 * variant is one SKU even if the product is renamed later.
 */
export const productItemKey = (productId: string, variant: string) => `p:${productId}|${slug(variant)}`;

export const rp = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

// --- FIFO allocation --------------------------------------------------------

export type RekapItem = {
  id: string;
  key: string;
  name: string;
  variant: string;
  price: number;
  got: number;
  soldOut: boolean;
  /** Owner only; undefined for other admins. */
  cost?: number | null;
  productId?: string | null;
  /** Product photo, or the photo taken for a hand-typed item. */
  image?: string | null;
};

export type RekapOrder = {
  id: string;
  itemId: string;
  buyerId: string;
  qty: number;
  /** ISO time; earlier orders get the goods first. */
  createdAt: string;
};

export type ItemRow = RekapItem & {
  need: number;
  orders: RekapOrder[];
};

/**
 * Hands out each item's "got" count to its orders in the order they were
 * placed. Returns the per-item rows and, per order id, how many pcs it gets.
 */
export function allocate(items: RekapItem[], orders: RekapOrder[]) {
  const byItem = new Map<string, RekapOrder[]>();
  for (const o of orders) {
    const list = byItem.get(o.itemId) ?? [];
    list.push(o);
    byItem.set(o.itemId, list);
  }
  const alloc = new Map<string, number>();
  const rows: ItemRow[] = [];
  for (const it of items) {
    const os = (byItem.get(it.id) ?? [])
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    let remaining = it.got;
    let need = 0;
    for (const o of os) {
      need += o.qty;
      const a = Math.min(o.qty, Math.max(0, remaining));
      remaining -= a;
      alloc.set(o.id, a);
    }
    if (need > 0 || it.got > 0) rows.push({ ...it, need, orders: os });
  }
  return { rows, alloc };
}

export type ItemStatus = "kurang" | "lebih" | "pas" | "habis";

/** Shopping-list status of one line. */
export function itemStatus(r: { got: number; need: number; soldOut: boolean }): [ItemStatus, string] {
  if (r.soldOut && r.got < r.need) return ["habis", `Stok habis · ${r.need - r.got} pcs tidak dapat`];
  if (r.got < r.need) return ["kurang", `Kurang ${r.need - r.got}`];
  if (r.got > r.need) return ["lebih", `Lebih ${r.got - r.need}`];
  return ["pas", "Pas"];
}

export type OrderStatus = "dapat" | "part" | "wait" | "no";

/** What one buyer's order line gets, given its allocation. */
export function orderStatus(qty: number, got: number, soldOut: boolean): [OrderStatus, string] {
  if (got >= qty) return ["dapat", `Dapat ${got}`];
  if (soldOut) return got > 0 ? ["part", `Dapat ${got} dari ${qty}, sisanya tidak dapat`] : ["no", "Tidak dapat (stok habis)"];
  return got > 0 ? ["part", `Baru dapat ${got} dari ${qty}`] : ["wait", "Belum diambil"];
}
