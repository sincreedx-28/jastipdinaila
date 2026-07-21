"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function CartView() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const removeItem = useCartStore((s) => s.removeItem);
  // Zustand's persisted store hydrates client-side only — avoid an SSR/CSR
  // mismatch by rendering the empty state until hydration completes.
  const hydrated = useCartStore((s) => s.hasHydrated);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <h1 className="mb-6 font-heading text-2xl font-bold">Shopping Cart</h1>

      {!hydrated ? null : items.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <p className="mb-4">Your cart is empty.</p>
          <Button render={<Link href="/produk">Start Shopping</Link>} />
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-9">
          <div className="flex min-w-[280px] flex-1 flex-col gap-3.5">
            {items.map((item) => (
              <div
                key={`${item.productId}:${item.variant ?? ""}`}
                className="flex gap-3.5 rounded-xl border bg-card p-3.5"
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {item.imageUrl && (
                    <Image src={item.imageUrl} alt="" fill className="object-cover" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge
                        variant={item.type === "READY" ? "default" : "secondary"}
                        className="mb-1"
                      >
                        {item.type === "READY" ? "Ready" : "PO"}
                      </Badge>
                      <p className="text-sm font-bold">{item.name}</p>
                      {item.variant && (
                        <p className="text-xs text-muted-foreground">
                          Variant: {item.variant}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId, item.variant)}
                      className="shrink-0 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center rounded-lg border">
                      <button
                        type="button"
                        onClick={() => setQty(item.productId, item.variant, item.qty - 1)}
                        className="flex h-8 w-8 items-center justify-center text-base font-bold"
                      >
                        −
                      </button>
                      <div className="w-7 text-center text-sm font-bold">{item.qty}</div>
                      <button
                        type="button"
                        onClick={() => setQty(item.productId, item.variant, item.qty + 1)}
                        className="flex h-8 w-8 items-center justify-center text-base font-bold"
                      >
                        +
                      </button>
                    </div>
                    <div className="font-bold text-primary">
                      Rp{(item.price * item.qty).toLocaleString("id-ID")}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="sticky top-24 w-full min-w-[260px] flex-1 rounded-xl bg-background p-5 sm:max-w-[300px]">
            <div className="mb-4 font-heading text-lg font-bold">Order Summary</div>
            <div className="mb-2 flex justify-between text-sm">
              <span>Subtotal</span>
              <span>Rp{subtotal.toLocaleString("id-ID")}</span>
            </div>
            <div className="mb-4 flex justify-between text-sm">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="mb-5 flex justify-between border-t pt-3 text-lg font-extrabold">
              <span>Total</span>
              <span>Rp{subtotal.toLocaleString("id-ID")}</span>
            </div>
            <Button className="w-full" onClick={() => router.push("/checkout")}>
              Checkout
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
