"use client";

import { useEffect, useState } from "react";
import { getCartShippingRates } from "@/lib/actions/shipping";
import type { CartItem } from "@/lib/store/cart";
import type { ShippingRateOption } from "@/lib/rajaongkir";

// Parent should render this with `key={destinationId}` so a destination
// change fully remounts it — the fetch effect below only needs to run once
// per mount, and state naturally starts fresh instead of needing a reset.
function ShippingMethodPickerInner({
  destinationId,
  cart,
  onSelect,
}: {
  destinationId: string;
  cart: CartItem[];
  onSelect: (rate: ShippingRateOption | null) => void;
}) {
  const [rates, setRates] = useState<ShippingRateOption[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  useEffect(() => {
    getCartShippingRates(destinationId, cart).then((result) => {
      setLoading(false);
      if (!result.ok) {
        setError(
          result.reason === "quota_exceeded"
            ? "Ongkos kirim otomatis sedang tidak tersedia (kuota harian habis)."
            : "Gagal mengambil ongkos kirim. Coba lagi atau hubungi admin."
        );
        setWhatsappUrl(result.whatsappUrl ?? null);
        return;
      }
      setRates(result.rates);
      if (result.rates.length === 0) {
        setError("Tidak ada layanan kurir tersedia untuk tujuan ini.");
      }
    });
    // Runs once per mount (parent remounts this via `key` on destination change).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">Menghitung ongkir...</p>;
  if (error) {
    return (
      <div className="space-y-1">
        <p className="text-sm text-destructive">{error}</p>
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary underline"
          >
            Hubungi admin via WhatsApp untuk konfirmasi ongkir
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rates.map((rate) => {
        const key = `${rate.courierCode}-${rate.service}`;
        return (
          <label
            key={key}
            className="flex cursor-pointer items-center justify-between rounded-md border p-3 text-sm has-[:checked]:border-primary"
          >
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="shipping-method"
                checked={selectedKey === key}
                onChange={() => {
                  setSelectedKey(key);
                  onSelect(rate);
                }}
              />
              <div>
                <p className="font-medium">
                  {rate.courierName} — {rate.service}
                </p>
                <p className="text-xs text-muted-foreground">
                  {rate.description} · Estimasi {rate.etd} hari
                </p>
              </div>
            </div>
            <span className="font-semibold">Rp{rate.cost.toLocaleString("id-ID")}</span>
          </label>
        );
      })}
    </div>
  );
}

export function ShippingMethodPicker({
  destinationId,
  cart,
  onSelect,
}: {
  destinationId: string | null;
  cart: CartItem[];
  onSelect: (rate: ShippingRateOption | null) => void;
}) {
  if (!destinationId) {
    return (
      <p className="text-sm text-muted-foreground">
        Pilih tujuan pengiriman dulu untuk melihat opsi kurir.
      </p>
    );
  }

  return (
    <ShippingMethodPickerInner
      key={destinationId}
      destinationId={destinationId}
      cart={cart}
      onSelect={onSelect}
    />
  );
}
