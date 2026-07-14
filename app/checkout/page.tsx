"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cart";
import { createOrder } from "@/lib/actions/orders";
import { SiteHeader } from "@/components/storefront/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const PLACEHOLDER_SHIPPING = 20000;

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const hydrated = useCartStore((s) => s.hasHydrated);

  const [state, formAction, pending] = useActionState(createOrder, undefined);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  useEffect(() => {
    if (hydrated && items.length === 0) {
      router.replace("/keranjang");
    }
  }, [hydrated, items.length, router]);

  if (!hydrated || items.length === 0) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="mb-4 text-xl font-semibold">Checkout</h1>

        <form action={formAction} className="space-y-6">
          <input type="hidden" name="cart" value={JSON.stringify(items)} />

          <section className="space-y-4">
            <h2 className="text-sm font-medium">Data Pelanggan</h2>
            <div className="space-y-2">
              <Label htmlFor="customerName">Nama Lengkap</Label>
              <Input id="customerName" name="customerName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Nomor HP / WhatsApp</Label>
              <Input id="customerPhone" name="customerPhone" required />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-medium">Alamat Pengiriman</h2>
            <div className="space-y-2">
              <Label htmlFor="shippingAddress">Alamat Lengkap</Label>
              <Textarea id="shippingAddress" name="shippingAddress" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="shippingDistrict">Kecamatan</Label>
                <Input id="shippingDistrict" name="shippingDistrict" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shippingCity">Kota/Kabupaten</Label>
                <Input id="shippingCity" name="shippingCity" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shippingProvince">Provinsi</Label>
                <Input id="shippingProvince" name="shippingProvince" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shippingPostalCode">Kode Pos</Label>
                <Input id="shippingPostalCode" name="shippingPostalCode" required />
              </div>
            </div>
          </section>

          <section className="space-y-2 rounded-lg border p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal barang</span>
              <span>Rp{subtotal.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ongkos kirim (estimasi)</span>
              <span>Rp{PLACEHOLDER_SHIPPING.toLocaleString("id-ID")}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Ongkir masih estimasi sementara — perhitungan otomatis per kurir akan
              tersedia segera. Admin akan konfirmasi total final sebelum pengiriman.
            </p>
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total</span>
              <span>Rp{(subtotal + PLACEHOLDER_SHIPPING).toLocaleString("id-ID")}</span>
            </div>
          </section>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Memproses..." : "Buat Pesanan"}
          </Button>
        </form>
      </main>
    </div>
  );
}
