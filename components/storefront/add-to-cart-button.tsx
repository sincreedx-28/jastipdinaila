"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCartStore, type CartItem } from "@/lib/store/cart";
import { Button } from "@/components/ui/button";

export type BuyVariant = {
  id: string;
  name: string;
  price: number;
  /** null = not stock-limited (Pre-Order). */
  stockQty: number | null;
};

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export function AddToCartButton({
  product,
  variants,
  soldOut,
}: {
  product: Omit<CartItem, "qty" | "variant" | "variantId" | "price">;
  variants: BuyVariant[];
  soldOut: boolean;
}) {
  const available = (v: BuyVariant) => v.stockQty === null || v.stockQty > 0;
  const [qty, setQty] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => (variants.find(available) ?? variants[0])?.id ?? null
  );
  const addItem = useCartStore((s) => s.addItem);
  const router = useRouter();

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
  const named = variants.filter((v) => v.name);
  const pricesDiffer = new Set(variants.map((v) => v.price)).size > 1;
  const maxQty = selected?.stockQty ?? Infinity;

  const lineFor = () => ({
    ...product,
    price: selected.price,
    variant: selected.name || null,
    variantId: selected.id,
  });

  if (soldOut || !selected) {
    return (
      <Button disabled className="w-full">
        Out of Stock
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {named.length > 0 && (
        <div>
          <div className="mb-2 text-sm font-bold">Variant</div>
          <div className="flex flex-wrap gap-2.5">
            {named.map((v) => {
              const out = !available(v);
              const active = selected?.id === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={out}
                  onClick={() => {
                    setSelectedId(v.id);
                    if (v.stockQty !== null) setQty((q) => Math.min(q, Math.max(1, v.stockQty!)));
                  }}
                  aria-pressed={active}
                  className={`min-h-11 rounded-lg border px-4.5 py-2 text-sm font-bold ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground"
                  } ${out ? "cursor-not-allowed opacity-40 line-through" : ""}`}
                >
                  {v.name}
                  {pricesDiffer && (
                    <span className="block text-[11px] font-semibold opacity-80">{rp(v.price)}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selected && (pricesDiffer || (selected.stockQty !== null && selected.stockQty <= 5)) && (
        <p className="text-sm">
          {pricesDiffer && (
            <span className="text-lg font-extrabold text-primary">{rp(selected.price)}</span>
          )}
          {selected.stockQty !== null && selected.stockQty <= 5 && (
            <span className="ml-2 font-semibold text-amber-700">
              Only {selected.stockQty} left
            </span>
          )}
        </p>
      )}

      {/* On phones the quantity stepper and buy buttons are pinned to the
          bottom of the screen in one row, so they never need scrolling to
          reach (the page adds bottom padding to make room); from sm up they
          sit inline as before. */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex flex-wrap items-center gap-x-4.5 gap-y-4 border-t border-border bg-card px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-6px_20px_-12px_rgb(0_0_0/0.25)] max-sm:flex-nowrap max-sm:gap-2 sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <div className="text-sm font-bold max-sm:hidden">Quantity</div>
        <div className="flex flex-none items-center rounded-lg border sm:mr-auto">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
            className="flex h-11 w-9 items-center justify-center text-lg font-bold sm:w-10"
          >
            −
          </button>
          <div className="w-7 text-center font-bold sm:w-9">{qty}</div>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            disabled={qty >= maxQty}
            aria-label="Increase quantity"
            className="flex h-11 w-9 items-center justify-center text-lg font-bold sm:w-10"
          >
            +
          </button>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 sm:basis-full sm:gap-3">
          <Button
            className="h-11 min-w-0 flex-1 text-base font-bold"
            onClick={() => {
              addItem(lineFor(), qty);
              toast.success(`${product.name} added to cart`);
            }}
          >
            Add to Cart
          </Button>
          <Button
            variant="outline"
            className="h-11 px-3 text-base font-bold sm:px-4"
            onClick={() => {
              addItem(lineFor(), qty);
              router.push("/keranjang");
            }}
          >
            Buy Now
          </Button>
        </div>
      </div>
    </div>
  );
}
