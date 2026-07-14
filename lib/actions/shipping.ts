"use server";

import {
  searchDestination,
  getShippingRates,
  chargeableWeightGrams,
  type DestinationOption,
  type ShippingRateResult,
} from "@/lib/rajaongkir";
import { getSettings, whatsappLink } from "@/lib/settings";
import type { CartItem } from "@/lib/store/cart";

export async function searchDestinationAction(query: string): Promise<DestinationOption[]> {
  return searchDestination(query);
}

export async function getCartShippingRates(
  destinationId: string,
  cart: CartItem[]
): Promise<ShippingRateResult & { chargeableGrams?: number; whatsappUrl?: string | null }> {
  if (!destinationId || cart.length === 0) {
    return { ok: false, reason: "api_error" };
  }

  const totalGrams = cart.reduce((sum, item) => {
    return (
      sum +
      chargeableWeightGrams(
        item.weightGrams,
        item.lengthCm,
        item.widthCm,
        item.heightCm
      ) *
        item.qty
    );
  }, 0);

  const result = await getShippingRates(destinationId, Math.ceil(totalGrams));

  if (!result.ok && result.reason === "quota_exceeded") {
    const settings = await getSettings();
    const waUrl = whatsappLink(
      settings.whatsapp_number,
      "Halo, saya mau tanya ongkos kirim untuk pesanan karena kalkulator otomatis sedang tidak tersedia."
    );
    return { ...result, chargeableGrams: Math.ceil(totalGrams), whatsappUrl: waUrl };
  }

  return { ...result, chargeableGrams: Math.ceil(totalGrams) };
}
