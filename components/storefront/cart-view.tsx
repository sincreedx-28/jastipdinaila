"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function CartView() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const hydrated = useCartStore((s) => s.hasHydrated);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <main
      className="mx-auto w-full max-w-3xl flex-1 px-4 py-8"
      style={{ background: "var(--brand-cream)" }}
    >
      <h1 className="mb-4 text-xl font-bold" style={{ color: "var(--brand-ink)" }}>
        Keranjang
      </h1>

      {!hydrated ? null : items.length === 0 ? (
        <div className="py-16 text-center text-[var(--brand-muted)]">
          <p>Keranjang kamu masih kosong.</p>
          <Button
            className="mt-4"
            style={{ background: "var(--brand-accent)" }}
            render={<Link href="/produk">Lihat Produk</Link>}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex items-center gap-4 rounded-xl border p-3"
              style={{ borderColor: "var(--brand-chip-border)", background: "white" }}
            >
              <div
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg"
                style={{ background: "var(--brand-chip-bg)" }}
              >
                {item.imageUrl && <Image src={item.imageUrl} alt="" fill className="object-cover" />}
              </div>
              <div className="flex-1">
                <Badge
                  className="mb-1 border-none text-white"
                  style={{ background: item.type === "READY" ? "var(--brand-accent)" : "var(--brand-ink)" }}
                >
                  {item.type === "READY" ? "Ready" : "PO"}
                </Badge>
                <p className="text-sm font-semibold" style={{ color: "var(--brand-ink)" }}>
                  {item.name}
                </p>
                <p className="text-sm text-[var(--brand-muted)]">
                  Rp{item.price.toLocaleString("id-ID")}
                </p>
              </div>
              <Input
                type="number"
                min={1}
                value={item.qty}
                onChange={(e) => setQty(item.productId, Number(e.target.value) || 1)}
                className="w-16"
              />
              <Button variant="ghost" size="sm" onClick={() => removeItem(item.productId)}>
                Hapus
              </Button>
            </div>
          ))}

          <div
            className="flex items-center justify-between border-t pt-4"
            style={{ borderColor: "var(--brand-chip-border)" }}
          >
            <span className="text-sm text-[var(--brand-muted)]">Subtotal barang</span>
            <span className="text-lg font-bold" style={{ color: "var(--brand-accent)" }}>
              Rp{subtotal.toLocaleString("id-ID")}
            </span>
          </div>
          <p className="text-xs text-[var(--brand-muted)]">
            Ongkos kirim dihitung di halaman checkout.
          </p>
          <Button
            className="w-full"
            style={{ background: "var(--brand-accent)" }}
            onClick={() => router.push("/checkout")}
          >
            Lanjut ke Checkout
          </Button>
        </div>
      )}
    </main>
  );
}
