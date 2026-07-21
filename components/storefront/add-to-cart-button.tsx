"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCartStore, type CartItem } from "@/lib/store/cart";
import { Button } from "@/components/ui/button";

export function AddToCartButton({
  product,
  variants,
  soldOut,
}: {
  product: Omit<CartItem, "qty" | "variant">;
  variants: string[];
  soldOut: boolean;
}) {
  const [qty, setQty] = useState(1);
  const [variant, setVariant] = useState<string | null>(variants[0] ?? null);
  const addItem = useCartStore((s) => s.addItem);
  const router = useRouter();

  if (soldOut) {
    return (
      <Button disabled className="w-full">
        Stok Habis
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {variants.length > 0 && (
        <div>
          <div className="mb-2 text-sm font-bold">Varian</div>
          <div className="flex flex-wrap gap-2.5">
            {variants.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVariant(v)}
                className={`rounded-lg border px-4.5 py-2.5 text-sm font-bold ${
                  variant === v
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4.5">
        <div className="text-sm font-bold">Jumlah</div>
        <div className="flex items-center rounded-lg border">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-9 w-9 items-center justify-center text-lg font-bold"
          >
            −
          </button>
          <div className="w-9 text-center font-bold">{qty}</div>
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            className="flex h-9 w-9 items-center justify-center text-lg font-bold"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          className="flex-1"
          onClick={() => {
            addItem({ ...product, variant }, qty);
            toast.success(`${product.name} ditambahkan ke keranjang`);
          }}
        >
          Tambah ke Keranjang
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            addItem({ ...product, variant }, qty);
            router.push("/keranjang");
          }}
        >
          Beli Sekarang
        </Button>
      </div>
    </div>
  );
}
