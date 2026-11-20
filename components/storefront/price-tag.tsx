"use client";

import { discountPct, formatPriceRange } from "@/lib/variant-types";
import { useVariantSelection } from "@/components/storefront/variant-selection";

type PriceVariant = { id: string; price: number; compareAtPrice: number | null };

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

/**
 * Price on the product page: the chosen variant's price, with its
 * struck-through price and "% OFF" when it has one.
 */
export function PriceTag({ variants }: { variants: PriceVariant[] }) {
  const selection = useVariantSelection();
  const v = variants.find((x) => x.id === selection?.selectedId);
  if (!v) {
    const prices = variants.map((x) => x.price);
    return (
      <p className="mt-1 text-xl font-extrabold text-primary">
        {prices.length ? formatPriceRange(Math.min(...prices), Math.max(...prices)) : ""}
      </p>
    );
  }
  const off = discountPct(v.price, v.compareAtPrice);
  return (
    <p className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <span className="text-xl font-extrabold text-primary">{rp(v.price)}</span>
      {off && (
        <>
          <span className="text-base font-semibold text-muted-foreground line-through">
            {rp(v.compareAtPrice!)}
          </span>
          <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-extrabold text-primary-foreground">
            {off}% OFF
          </span>
        </>
      )}
    </p>
  );
}
