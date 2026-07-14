"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cart";
import { SiteHeader } from "@/components/storefront/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function CartPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const removeItem = useCartStore((s) => s.removeItem);
  // Zustand's persisted store hydrates client-side only — avoid an SSR/CSR
  // mismatch by rendering the empty state until hydration completes.
  const hydrated = useCartStore((s) => s.hasHydrated);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="mb-4 text-xl font-semibold">Keranjang</h1>

        {!hydrated ? null : items.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p>Keranjang kamu masih kosong.</p>
            <Button className="mt-4" render={<Link href="/produk">Lihat Produk</Link>} />
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-4 rounded-lg border p-3"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-muted">
                  {item.imageUrl && (
                    <Image src={item.imageUrl} alt="" fill className="object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <Badge
                    variant={item.type === "READY" ? "default" : "secondary"}
                    className="mb-1"
                  >
                    {item.type === "READY" ? "Ready" : "PO"}
                  </Badge>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
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

            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-sm text-muted-foreground">Subtotal barang</span>
              <span className="text-lg font-semibold">
                Rp{subtotal.toLocaleString("id-ID")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Ongkos kirim dihitung di halaman checkout.
            </p>
            <Button className="w-full" onClick={() => router.push("/checkout")}>
              Lanjut ke Checkout
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
