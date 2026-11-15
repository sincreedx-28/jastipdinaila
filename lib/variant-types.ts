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
};

export type VariantRowValue = {
  id: string;
  name: string;
  price: number;
  stockQty: number | null;
};

/** "Rp12.000" or "Rp12.000 – Rp15.000" for a price range. */
export function formatPriceRange(min: number, max?: number | null) {
  const fmt = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
  return max && max > min ? `${fmt(min)} – ${fmt(max)}` : fmt(min);
}
