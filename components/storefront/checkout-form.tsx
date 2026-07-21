"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cart";
import { createOrder } from "@/lib/actions/orders";
import { DestinationPicker } from "@/components/storefront/destination-picker";
import { ShippingMethodPicker } from "@/components/storefront/shipping-method-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DestinationOption, ShippingRateOption } from "@/lib/rajaongkir";
import type { CustomerAddress } from "@/lib/generated/prisma/client";

const NEW_ADDRESS = "__new";

function toDestinationOption(a: CustomerAddress): DestinationOption {
  return {
    id: a.rajaongkirDestinationId,
    label: `${a.district}, ${a.city}, ${a.province} ${a.postalCode}`,
    subdistrict: "",
    district: a.district,
    city: a.city,
    province: a.province,
    postalCode: a.postalCode,
  };
}

export function CheckoutForm({
  isLoggedIn,
  savedAddresses,
}: {
  isLoggedIn: boolean;
  savedAddresses: CustomerAddress[];
}) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const hydrated = useCartStore((s) => s.hasHydrated);

  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    savedAddresses[0]?.id ?? NEW_ADDRESS
  );
  // Tracks which address the below fields were last prefilled from, so a
  // change can be detected and applied during render (see "Adjusting some
  // state when a prop changes" in the React docs) instead of in an effect.
  const [prefilledFor, setPrefilledFor] = useState(selectedAddressId);

  const [customerName, setCustomerName] = useState(
    () => savedAddresses.find((a) => a.id === selectedAddressId)?.recipientName ?? ""
  );
  const [customerPhone, setCustomerPhone] = useState(
    () => savedAddresses.find((a) => a.id === selectedAddressId)?.recipientPhone ?? ""
  );
  const [shippingAddress, setShippingAddress] = useState(
    () => savedAddresses.find((a) => a.id === selectedAddressId)?.address ?? ""
  );
  const [destination, setDestination] = useState<DestinationOption | null>(() => {
    const addr = savedAddresses.find((a) => a.id === selectedAddressId);
    return addr ? toDestinationOption(addr) : null;
  });
  const [rate, setRate] = useState<ShippingRateOption | null>(null);
  const [saveAddress, setSaveAddress] = useState(false);
  const [saveAddressLabel, setSaveAddressLabel] = useState("");

  const [state, formAction, pending] = useActionState(createOrder, undefined);

  if (selectedAddressId !== prefilledFor) {
    setPrefilledFor(selectedAddressId);
    const addr = savedAddresses.find((a) => a.id === selectedAddressId);
    setCustomerName(addr?.recipientName ?? "");
    setCustomerPhone(addr?.recipientPhone ?? "");
    setShippingAddress(addr?.address ?? "");
    setDestination(addr ? toDestinationOption(addr) : null);
    setRate(null);
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shippingCost = rate?.cost ?? 0;

  useEffect(() => {
    if (hydrated && items.length === 0) {
      router.replace("/keranjang");
    }
  }, [hydrated, items.length, router]);

  if (!hydrated || items.length === 0) return null;

  const canSubmit = Boolean(destination && rate);
  const usingNewAddress = selectedAddressId === NEW_ADDRESS;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-4 text-xl font-semibold">Checkout</h1>

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="cart" value={JSON.stringify(items)} />
        <input type="hidden" name="rajaongkirDestinationId" value={destination?.id ?? ""} />
        <input type="hidden" name="shippingDistrict" value={destination?.district ?? ""} />
        <input type="hidden" name="shippingCity" value={destination?.city ?? ""} />
        <input type="hidden" name="shippingProvince" value={destination?.province ?? ""} />
        <input type="hidden" name="shippingPostalCode" value={destination?.postalCode ?? ""} />
        <input type="hidden" name="courierCode" value={rate?.courierCode ?? ""} />
        <input type="hidden" name="courierName" value={rate?.courierName ?? ""} />
        <input type="hidden" name="courierService" value={rate?.service ?? ""} />
        <input type="hidden" name="shippingCost" value={rate?.cost ?? ""} />
        <input type="hidden" name="shippingEtd" value={rate?.etd ?? ""} />

        {isLoggedIn && savedAddresses.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-medium">Alamat Tersimpan</h2>
            <div className="grid gap-2">
              {savedAddresses.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAddressId(a.id)}
                  className={`rounded-lg border bg-card p-3 text-left text-sm ${
                    selectedAddressId === a.id ? "border-primary ring-1 ring-primary" : ""
                  }`}
                >
                  <span className="font-medium">{a.label}</span>
                  <p className="text-muted-foreground">
                    {a.recipientName} · {a.recipientPhone}
                  </p>
                  <p className="text-muted-foreground">
                    {a.address}, {a.district}, {a.city}
                  </p>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedAddressId(NEW_ADDRESS)}
                className={`rounded-lg border border-dashed p-3 text-left text-sm ${
                  usingNewAddress ? "border-primary ring-1 ring-primary" : ""
                }`}
              >
                + Alamat baru
              </button>
            </div>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-sm font-medium">Data Pelanggan</h2>
          <div className="space-y-2">
            <Label htmlFor="customerName">Nama Lengkap</Label>
            <Input
              id="customerName"
              name="customerName"
              className="bg-card"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerPhone">Nomor HP / WhatsApp</Label>
            <Input
              id="customerPhone"
              name="customerPhone"
              className="bg-card"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              required
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium">Alamat Pengiriman</h2>
          <div className="space-y-2">
            <Label htmlFor="shippingAddress">Alamat Lengkap (jalan, no rumah, RT/RW)</Label>
            <Textarea
              id="shippingAddress"
              name="shippingAddress"
              className="bg-card"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Kecamatan / Kota Tujuan</Label>
            <DestinationPicker
              key={selectedAddressId}
              defaultValue={destination ?? undefined}
              onSelect={(d) => {
                setDestination(d);
                setRate(null);
              }}
            />
          </div>

          {isLoggedIn && usingNewAddress && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="saveAddress"
                checked={saveAddress}
                onChange={(e) => setSaveAddress(e.target.checked)}
              />
              Simpan alamat ini untuk order berikutnya
            </label>
          )}
          {isLoggedIn && usingNewAddress && saveAddress && (
            <div className="space-y-2">
              <Label htmlFor="saveAddressLabel">Label alamat (mis. Rumah, Kantor)</Label>
              <Input
                id="saveAddressLabel"
                name="saveAddressLabel"
                className="bg-card"
                value={saveAddressLabel}
                onChange={(e) => setSaveAddressLabel(e.target.value)}
                placeholder="Rumah"
              />
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium">Pilih Kurir</h2>
          <ShippingMethodPicker
            destinationId={destination?.id ?? null}
            cart={items}
            onSelect={setRate}
          />
        </section>

        <section className="space-y-2 rounded-lg border bg-card p-4">
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
  );
}
