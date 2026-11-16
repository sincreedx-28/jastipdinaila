"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCartStore } from "@/lib/store/cart";
import { checkWaCheckout, submitWaOrder, type WaCheckoutCheck } from "@/lib/actions/wa-checkout";
import { buildWaMessage, newWaCode, type WaBuyer, type WaLine } from "@/lib/wa-order";
import type { CartItem } from "@/lib/store/cart";
import { rp } from "@/lib/rekap";

const BUYER_KEY = "jastip-wa-buyer";

function loadBuyer(defaultName: string): WaBuyer {
  try {
    const saved = JSON.parse(localStorage.getItem(BUYER_KEY) ?? "null");
    if (saved && typeof saved === "object") return { name: "", phone: "", address: "", note: "", ...saved };
  } catch {}
  return { name: defaultName, phone: "", address: "", note: "" };
}

function Section({ title, sub, lines }: { title: string; sub: string; lines: WaLine[] }) {
  if (!lines.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-heading text-lg font-bold">{title}</h2>
        <span className="text-xs text-muted-foreground">{sub}</span>
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {lines.map((l, i) => (
          <li key={i} className="flex justify-between gap-3 px-4 py-2.5 text-sm">
            <span>
              {l.name}
              {l.variant && <span className="text-muted-foreground"> ({l.variant})</span>} ×{l.qty}
            </span>
            <b className="shrink-0">{rp(l.price * l.qty)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Checkout via WhatsApp: the buyer fills in name, number and address, and
 * the order is sent as a chat to the shop. Pre-Order always goes this way;
 * Ready Stock may too. Shipping is confirmed by the admin in the chat.
 */
export function WaCheckout({ defaultName }: { defaultName: string }) {
  const items = useCartStore((s) => s.items);
  const hydrated = useCartStore((s) => s.hasHydrated);
  const clear = useCartStore((s) => s.clear);
  const [check, setCheck] = useState<WaCheckoutCheck | null>(null);
  const [buyer, setBuyer] = useState<WaBuyer>(() =>
    typeof window === "undefined" ? { name: defaultName, phone: "", address: "", note: "" } : loadBuyer(defaultName)
  );
  const [sent, setSent] = useState(false);
  // Printed in the chat and stored with the order, so the admin can match
  // the WhatsApp message to the order waiting in Rekap Order.
  const [code] = useState(newWaCode);
  const [submitted, setSubmitted] = useState<{ cart: CartItem[]; buyer: WaBuyer } | null>(null);

  // Saving is fire-and-forget while WhatsApp opens; it's retried (same code,
  // so stored once) whenever this page is visible again, to be sure it lands.
  useEffect(() => {
    if (!submitted) return;
    const send = () => submitWaOrder(code, submitted.cart, submitted.buyer).catch(() => {});
    send();
    const onVisible = () => document.visibilityState === "visible" && send();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [submitted, code]);

  const cartKey = JSON.stringify(items.map((i) => [i.productId, i.variantId, i.variant, i.qty]));
  useEffect(() => {
    if (!hydrated || items.length === 0) return;
    let live = true;
    checkWaCheckout(items).then((r) => live && setCheck(r));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, cartKey]);

  const update = (patch: Partial<WaBuyer>) => {
    const next = { ...buyer, ...patch };
    setBuyer(next);
    try {
      localStorage.setItem(BUYER_KEY, JSON.stringify(next));
    } catch {}
  };

  const lines = useMemo(() => (check?.ok ? check.lines : []), [check]);
  const message = useMemo(() => buildWaMessage(lines, buyer, code), [lines, buyer, code]);
  const ready = buyer.name.trim() && buyer.phone.trim() && buyer.address.trim() && lines.length > 0;
  const href = check?.ok ? `https://wa.me/${check.waNumber}?text=${encodeURIComponent(message)}` : "#";
  const total = lines.reduce((a, l) => a + l.price * l.qty, 0);

  if (sent) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-14 text-center">
        <h1 className="mb-2 font-heading text-2xl font-bold">Thank you! 🎀</h1>
        <p className="mb-2 text-muted-foreground">
          Your order was opened in WhatsApp. Make sure the chat is sent; the admin will reply with
          the shipping cost and payment details.
        </p>
        <p className="mb-6 text-sm">
          Order code: <b>{code}</b>
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button render={<a href={href} target="_blank" rel="noopener noreferrer">Open WhatsApp again</a>} />
          <Button variant="outline" render={<Link href="/produk">Keep shopping</Link>} />
        </div>
      </main>
    );
  }

  if (!hydrated) return null;
  if (items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-16 text-center">
        <p className="mb-4 text-muted-foreground">Your cart is empty.</p>
        <Button render={<Link href="/produk">Start Shopping</Link>} />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8">
      <div>
        <Link href="/keranjang" className="text-sm font-bold">
          ← Back to Cart
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-bold">Order via WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Fill in your details, then send the order as a WhatsApp chat. The admin will confirm the
          shipping cost and how to pay.
        </p>
      </div>

      {!check ? (
        <p className="text-sm text-muted-foreground">Checking your cart…</p>
      ) : !check.ok ? (
        <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{check.error}</p>
      ) : (
        <>
          {check.problems.length > 0 && (
            <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-bold">Some items were left out:</p>
              <ul className="list-disc pl-5">
                {check.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <Link href="/keranjang" className="font-bold underline">
                Update cart
              </Link>
            </div>
          )}
          <Section title="Ready Stock" sub="ships after payment" lines={lines.filter((l) => l.type === "READY")} />
          <Section title="Pre-Order" sub="ships after the goods arrive" lines={lines.filter((l) => l.type === "PO")} />
          <div className="flex justify-between border-t pt-3 text-lg font-extrabold">
            <span>Total</span>
            <span>{rp(total)}</span>
          </div>
          <p className="-mt-4 text-right text-xs text-muted-foreground">+ shipping, confirmed by admin</p>
        </>
      )}

      <div className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="font-heading text-lg font-bold">Shipping details</h2>
        <div className="space-y-2">
          <Label htmlFor="wa-name">Recipient name</Label>
          <Input id="wa-name" autoComplete="name" value={buyer.name} onChange={(e) => update({ name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wa-phone">Phone / WhatsApp</Label>
          <Input
            id="wa-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={buyer.phone}
            onChange={(e) => update({ phone: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wa-address">Full address</Label>
          <Textarea
            id="wa-address"
            rows={3}
            autoComplete="street-address"
            value={buyer.address}
            onChange={(e) => update({ address: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wa-note">Note (optional)</Label>
          <Textarea
            id="wa-note"
            rows={2}
            placeholder="e.g. backup colour, preferred courier"
            value={buyer.note}
            onChange={(e) => update({ note: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Button
          className="h-12 w-full bg-[#1f8f4e] text-base font-bold text-white hover:bg-[#19773f]"
          disabled={!ready}
          render={
            <a
              href={ready ? href : undefined}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (!ready) return;
                setSubmitted({ cart: items, buyer });
                setSent(true);
                clear();
              }}
            >
              Send order via WhatsApp
            </a>
          }
        />
        <Button
          variant="outline"
          className="w-full"
          disabled={!lines.length}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(message);
              toast.success("Order text copied");
            } catch {
              window.prompt("Copy this text:", message);
            }
          }}
        >
          Copy order text
        </Button>
        {!ready && (
          <p className="text-center text-xs text-muted-foreground">
            Fill in name, phone and address to send the order.
          </p>
        )}
      </div>
    </main>
  );
}
