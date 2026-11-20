// Client-safe shapes shared by the admin product form and its server actions.

/** One row of the "Varian & Harga" editor, sent to the server as JSON. */
export type VariantInput = {
  /** Existing ProductVariant id; absent for a newly added row. */
  id?: string;
  /** "" for a product without options (single row). */
  name: string;
  price: number;
  /** READY only, new rows only: stock bought for the first time. */
  initialStock?: number | null;
  /** Owner only: purchase price per pcs for initialStock. */
  initialCost?: number | null;
  /** Barcode on this variant's packaging; "" / null when it has none. */
  barcode?: string | null;
  /** Expiry month "YYYY-MM"; null for none. */
  expDate?: string | null;
  /** "Harga coret", higher than price; null for none. */
  compareAtPrice?: number | null;
  /** Uploaded photo of this variant (public Storage URL); null for none. */
  imageUrl?: string | null;
};

export type VariantRowValue = {
  id: string;
  name: string;
  price: number;
  stockQty: number | null;
  barcode?: string | null;
  imageUrl?: string | null;
  compareAtPrice?: number | null;
  /** "YYYY-MM" */
  expDate?: string | null;
};

/** "YYYY-MM" of a stored expiry date (the 1st of its month). */
export function expMonth(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const iso = typeof d === "string" ? d : d.toISOString();
  return /^\d{4}-\d{2}/.test(iso) ? iso.slice(0, 7) : null;
}

/** "Mar 2027" for an expiry month "YYYY-MM". */
export function fmtExp(ym: string | null | undefined, locale = "id-ID"): string {
  if (!ym) return "";
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString(locale, { month: "short", year: "numeric", timeZone: "UTC" });
}

/** Months from now until an expiry month (negative = already past). */
export function monthsLeft(ym: string, now = new Date()): number {
  const [y, m] = ym.split("-").map(Number);
  return (y - now.getUTCFullYear()) * 12 + (m - 1 - now.getUTCMonth());
}

/** Whole-percent discount of price against a struck-through price, or null. */
export function discountPct(price: number, compareAt?: number | null): number | null {
  if (!compareAt || compareAt <= price || price <= 0) return null;
  const pct = Math.round((1 - price / compareAt) * 100);
  return pct >= 1 ? pct : null;
}

/**
 * Discount shown on a product card: the struck-through price of the
 * cheapest variant (the price the card shows), and the biggest discount
 * among the variants ("up to" when they differ).
 */
export function cardDiscount(variants: { price: number; compareAtPrice?: number | null }[]) {
  if (!variants.length) return { compareAt: null, off: null, offUpTo: false };
  const cheapest = [...variants].sort(
    (a, b) => a.price - b.price || Number(Boolean(b.compareAtPrice)) - Number(Boolean(a.compareAtPrice))
  )[0];
  const pcts = variants.map((v) => discountPct(v.price, v.compareAtPrice));
  const real = pcts.filter((x): x is number => x !== null);
  const off = real.length ? Math.max(...real) : null;
  return {
    compareAt: discountPct(cheapest.price, cheapest.compareAtPrice) ? cheapest.compareAtPrice! : null,
    off,
    offUpTo: off !== null && new Set(pcts).size > 1,
  };
}

/** "Rp12.000" or "Rp12.000 – Rp15.000" for a price range. */
export function formatPriceRange(min: number, max?: number | null) {
  const fmt = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
  return max && max > min ? `${fmt(min)} – ${fmt(max)}` : fmt(min);
}
