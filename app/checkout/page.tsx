"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cart";
import { createOrder } from "@/lib/actions/orders";
import { SiteHeader } from "@/components/storefront/site-header";
import { DestinationPicker } from "@/components/storefront/destination-picker";
import { ShippingMethodPicker } from "@/components/storefront/shipping-method-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DestinationOption, ShippingRateOption } from "@/lib/rajaongkir";

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const hydrated = useCartStore((s) => s.hasHydrated);

  const [destination, setDestination] = useState<DestinationOption | null>(null);
  const [rate, setRate] = useState<ShippingRateOption | null>(null);

  const [state, formAction, pending] = useActionState(createOrder, undefined);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shippingCost = rate?.cost ?? 0;

  useEffect(() => {
    if (hydrated && items.length === 0) {
      router.replace("/keranjang");
    }
  }, [hydrated, items.length, router]);

  if (!hydrated || items.length === 0) return null;

  const canSubmit = Boolean(destination && rate);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="mb-4 text-xl font-semibold">Checkout</h1>

        <form action={formAction} className="space-y-6">
          <input type="hidden" name="cart" value={JSON.stringify(items)} />
          <input type="hidden" name="rajaongkirDestinationId" value={destination?.id ?? ""} />
          <input type="hidden" name="shippingDistrict" value={destination?.district ?? ""} />
          <input type="hidden" name="shippingCity" value={destination?.city ?? ""} />
          <input type="hidden" name="shippingProvince" value={destination?.province ?? ""} />
          <input
            type="hidden"
            name="shippingPostalCode"
            value={destination?.postalCode ?? ""}
          />
          <input type="hidden" name="courierCode" value={rate?.courierCode ?? ""} />
          <input type="hidden" name="courierName" value={rate?.courierName ?? ""} />
          <input type="hidden" name="courierService" value={rate?.service ?? ""} />
          <input type="hidden" name="shippingCost" value={rate?.cost ?? ""} />
          <input type="hidden" name="shippingEtd" value={rate?.etd ?? ""} />

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
              <Label htmlFor="shippingAddress">Alamat Lengkap (jalan, no rumah, RT/RW)</Label>
              <Textarea id="shippingAddress" name="shippingAddress" required />
            </div>
            <div className="space-y-2">
              <Label>Kecamatan / Kota Tujuan</Label>
              <DestinationPicker
                onSelect={(d) => {
                  setDestination(d);
                  setRate(null);
                }}
              />
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium">Pilih Kurir</h2>
            <ShippingMethodPicker
              destinationId={destination?.id ?? null}
              cart={items}
              onSelect={setRate}
            />
          </section>

          <section className="space-y-2 rounded-lg border p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal barang</span>
              <span>Rp{subtotal.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ongkos kirim</span>
              <span>{rate ? `Rp${shippingCost.toLocaleString("id-ID")}` : "-"}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total</span>
              <span>Rp{(subtotal + shippingCost).toLocaleString("id-ID")}</span>
            </div>
          </section>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" className="w-full" disabled={pending || !canSubmit}>
            {pending
              ? "Memproses..."
              : !canSubmit
                ? "Pilih tujuan & kurir dulu"
                : "Buat Pesanan"}
          </Button>
        </form>
      </main>
    </div>
  );
}
