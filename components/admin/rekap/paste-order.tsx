"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addPoOrder, createBuyer } from "@/lib/actions/rekap";
import { fmtPhone, rp } from "@/lib/rekap";
import { parseWaMessage, type ParsedWaOrder } from "@/lib/wa-order";
import type { Buyer } from "./shared";
import type { CatalogEntry } from "./rekap-app";

/**
 * "Tempel pesanan dari WhatsApp": paste the chat a buyer sent from the web's
 * WhatsApp checkout; its Pre-Order lines are added to this PO Event under
 * that buyer (registered on the spot if the number is new).
 */
export function PasteOrder({
  eventId,
  eventName,
  buyers,
  catalog,
}: {
  eventId: string;
  eventName: string;
  buyers: Buyer[];
  catalog: CatalogEntry[];
}) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedWaOrder | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const existing = parsed?.phone ? buyers.find((b) => b.phone === parsed.phone) : undefined;
  const findProduct = (n: string) => catalog.find((p) => p.name.toLowerCase() === n.toLowerCase());
  const otherBatch = parsed?.lines.find((l) => l.batch && l.batch !== eventName)?.batch;

  const read = () => {
    const p = parseWaMessage(text);
    setParsed(p);
    setName(p.name);
    setPhone(p.phone ? fmtPhone(p.phone) : "");
    setError("");
  };

  const add = () =>
    startTransition(async () => {
      if (!parsed) return;
      setError("");
      let buyer = existing;
      if (!buyer) {
        const r = await createBuyer(name, phone);
        if (!r.ok) return setError(r.error);
        buyer = r.buyer;
      }
      let added = 0;
      for (const l of parsed.lines) {
        const r = await addPoOrder({
          eventId,
          buyerId: buyer.id,
          productId: findProduct(l.name)?.id ?? null,
          name: l.name,
          variant: l.variant,
          qty: l.qty,
          price: l.price,
        });
        if (!r.ok) return setError(`${added} barang masuk, lalu gagal: ${r.error}`);
        added++;
      }
      toast.success(`${added} barang dari ${buyer.name} masuk ke rekap`);
      setText("");
      setParsed(null);
    });

  return (
    <details className="box px-4 py-3">
      <summary className="cursor-pointer font-semibold">Tempel pesanan dari WhatsApp</summary>
      <div className="mt-3 space-y-2">
        <p className="text-sm text-muted-foreground">
          Salin chat pesanan yang masuk dari tombol WhatsApp di web, lalu tempel di sini. Hanya
          barang Pre-Order yang diambil.
        </p>
        <Textarea
          rows={5}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setParsed(null);
          }}
          placeholder="Halo jastipdinaila, saya mau order: …"
        />
        <Button type="button" size="sm" variant="outline" disabled={!text.trim()} onClick={read}>
          Baca pesanan
        </Button>

        {parsed && (
          <div className="space-y-3 rounded-xl bg-secondary/60 p-3 text-sm">
            {parsed.lines.length === 0 ? (
              <p className="font-semibold text-destructive">
                Tidak ada barang Pre-Order yang terbaca di pesanan ini.
              </p>
            ) : (
              <>
                {existing ? (
                  <p>
                    Customer: <b>{existing.name}</b>{" "}
                    <span className="text-muted-foreground">{fmtPhone(existing.phone)}</span>
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p>Nomor ini belum terdaftar. Cek data customer barunya:</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Nama customer" />
                      <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="No HP customer" />
                    </div>
                  </div>
                )}
                <ul className="divide-y rounded-lg bg-background">
                  {parsed.lines.map((l, i) => (
                    <li key={i} className="flex justify-between gap-2 px-3 py-1.5">
                      <span>
                        {l.name}
                        {l.variant ? ` (${l.variant})` : ""} <b>x{l.qty}</b>
                        {!findProduct(l.name) && (
                          <span className="text-muted-foreground"> · barang manual</span>
                        )}
                      </span>
                      <span className="shrink-0">{rp(l.price)}</span>
                    </li>
                  ))}
                </ul>
                {otherBatch && (
                  <p className="text-amber-800">
                    Pesanan ini untuk batch “{otherBatch}”, sedangkan yang terbuka sekarang “
                    {eventName}”. Pastikan batch-nya benar sebelum menambahkan.
                  </p>
                )}
                {error && <p className="font-semibold text-destructive">{error}</p>}
                <Button type="button" size="sm" disabled={pending} onClick={add}>
                  {pending
                    ? "Menambahkan..."
                    : `${existing ? "" : "Daftarkan customer & "}tambahkan ${parsed.lines.length} barang`}
                </Button>
              </>
            )}
            {parsed.readyCount > 0 && (
              <p className="text-muted-foreground">
                {parsed.readyCount} barang Ready Stock di pesanan ini tidak ikut. Catat di mode
                Ready Stock.
              </p>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
