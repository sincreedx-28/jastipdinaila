"use server";

import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import type { CartItem } from "@/lib/store/cart";
import { isWaCode, type WaBuyer, type WaLine } from "@/lib/wa-order";
import { normPhone, tidy, validPhone } from "@/lib/rekap";

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
      productId: p.id,
      variantId: v.id,
      eventId: p.type === "PO" ? p.poEventId : null,
    });
  }
  return { ok: true, lines, waNumber, problems };
}

/**
 * Called as the shopper taps "Send order via WhatsApp": keeps a copy of the
 * order (status PENDING) under the code printed in the chat, so the admin
 * can confirm it in Rekap Order with one tap instead of copy-pasting.
 * Tapping twice is harmless: the same code is stored once.
 */
export async function submitWaOrder(
  code: string,
  cart: CartItem[],
  buyer: WaBuyer
): Promise<{ ok: boolean }> {
  if (!isWaCode(code)) return { ok: false };
  const name = tidy(buyer.name).slice(0, 80);
  const phone = normPhone(buyer.phone);
  const address = String(buyer.address ?? "").trim().slice(0, 500);
  if (!name || !validPhone(phone) || !address) return { ok: false };

  if (await prisma.waOrder.findUnique({ where: { code }, select: { id: true } })) return { ok: true };
  // A light brake on abuse of this public form.
  const recent = await prisma.waOrder.count({
    where: { phone, createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
  });
  if (recent >= 15) return { ok: false };

  const check = await checkWaCheckout(cart);
  if (!check.ok || check.lines.length === 0) return { ok: false };
  try {
    await prisma.waOrder.create({
      data: {
        code,
        name,
        phone,
        address,
        note: String(buyer.note ?? "").trim().slice(0, 500) || null,
        lines: check.lines,
        total: check.lines.reduce((a, l) => a + l.price * l.qty, 0),
      },
    });
  } catch {
    // Unique code race from a double tap: the first insert already won.
  }
  return { ok: true };
}
