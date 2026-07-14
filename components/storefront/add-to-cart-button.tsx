"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCartStore, type CartItem } from "@/lib/store/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddToCartButton({
  product,
  soldOut,
}: {
  product: Omit<CartItem, "qty">;
  soldOut: boolean;
}) {
  const [qty, setQty] = useState(1);
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
    <div className="flex items-center gap-3">
      <Input
        type="number"
        min={1}
        value={qty}
        onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
        className="w-20"
      />
      <Button
        className="flex-1"
        onClick={() => {
          addItem(product, qty);
          toast.success(`${product.name} ditambahkan ke keranjang`);
        }}
      >
        Tambah ke Keranjang
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          addItem(product, qty);
          router.push("/keranjang");
        }}
      >
        Beli Sekarang
      </Button>
    </div>
  );
}
