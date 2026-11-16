"use server";

import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import type { CartItem } from "@/lib/store/cart";
import type { WaLine } from "@/lib/wa-order";

export type WaCheckoutCheck =
  | { ok: true; lines: WaLine[]; waNumber: string; problems: string[] }
  | { ok: false; error: string };

/**
 * Re-reads the cart against the database (current prices, batch names,
 * Ready stock) before the WhatsApp message is written, so the buyer never
 * sends stale prices. Nothing is stored: the order exists once the chat is
 * sent and the admin records it in Rekap Order.
 */
export async function checkWaCheckout(cart: CartItem[]): Promise<WaCheckoutCheck> {
  if (!Array.isArray(cart) || cart.length === 0) return { ok: false, error: "Cart is empty." };
  if (cart.length > 100) return { ok: false, error: "Too many items in the cart." };

  const [settings, products] = await Promise.all([
    getSettings(),
    prisma.product.findMany({
      where: { id: { in: cart.map((c) => String(c.productId)) }, isActive: true },
      include: { variants: true, poEvent: { select: { name: true } } },
    }),
  ]);
  const waNumber = settings.whatsapp_number.replace(/\D/g, "").replace(/^0/, "62");
  if (!waNumber) return { ok: false, error: "The shop's WhatsApp number isn't set up yet." };

  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: WaLine[] = [];
  const problems: string[] = [];
  for (const c of cart) {
    const p = byId.get(String(c.productId));
    if (!p) {
      problems.push(`"${c.name}" is no longer available.`);
      continue;
    }
    const v =
      p.variants.find((x) => x.id === c.variantId) ??
      p.variants.find((x) => x.name === (c.variant ?? ""));
    if (!v) {
      problems.push(`The option you picked for "${p.name}" is no longer available.`);
      continue;
    }
    const qty = Math.max(1, Math.min(999, Math.floor(Number(c.qty)) || 1));
    if (p.type === "READY" && (v.stockQty ?? 0) < qty) {
      problems.push(
        `Only ${v.stockQty ?? 0} left of "${p.name}${v.name ? ` (${v.name})` : ""}".`
      );
      continue;
    }
    lines.push({
      name: p.name,
      variant: v.name,
      qty,
      price: v.price,
      type: p.type,
      batch: p.type === "PO" ? (p.poEvent?.name ?? null) : null,
    });
  }
  return { ok: true, lines, waNumber, problems };
}
