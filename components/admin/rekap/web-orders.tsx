"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { confirmWaOrder, rejectWaOrder } from "@/lib/actions/rekap";
import { fmtPhone, rp } from "@/lib/rekap";
import { useRekapAction } from "./shared";

export type WebOrder = {
  id: string;
  code: string;
  name: string;
  phone: string;
  address: string;
  note: string | null;
  total: number;
  createdAt: string;
  lines: { name: string; variant: string; qty: number; price: number; type: "READY" | "PO"; batch: string | null }[];
};

function WebOrderCard({ o, eventId }: { o: WebOrder; eventId: string | null }) {
  const [confirmReject, setConfirmReject] = useState(false);
  const { pending, run } = useRekapAction();
  return (
    <li className="space-y-2 rounded-xl border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <b className="text-base">{o.name}</b>{" "}
          <span className="text-sm text-muted-foreground">{fmtPhone(o.phone)}</span>
          <div className="text-xs text-muted-foreground">
            Kode <b>{o.code}</b> ·{" "}
            {new Date(o.createdAt).toLocaleString("id-ID", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Jakarta",
            })}
          </div>
        </div>
        <b>{rp(o.total)}</b>
      </div>
      <ul className="space-y-0.5 text-sm">
        {o.lines.map((l, i) => (
          <li key={i} className="flex justify-between gap-2">
            <span>
              <span
                className={`mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  l.type === "PO" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
                }`}
              >
                {l.type === "PO" ? "PO" : "Ready"}
              </span>
              {l.name}
              {l.variant ? ` (${l.variant})` : ""} x{l.qty}
              {l.type === "PO" && l.batch && <span className="text-muted-foreground"> · {l.batch}</span>}
            </span>
            <span className="shrink-0">{rp(l.price * l.qty)}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        {o.address}
        {o.note && <> · Catatan: {o.note}</>}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => confirmWaOrder(o.id, eventId), {
              success: `Pesanan ${o.code} masuk ke rekap`,
            })
          }
        >
          Konfirmasi
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          className={confirmReject ? "text-destructive!" : ""}
          onBlur={() => setConfirmReject(false)}
          onClick={() => {
            if (!confirmReject) return setConfirmReject(true);
            run(() => rejectWaOrder(o.id), { success: `Pesanan ${o.code} ditolak` });
          }}
        >
          {confirmReject ? "Yakin tolak?" : "Tolak"}
        </Button>
      </div>
    </li>
  );
}

/**
 * Orders shoppers sent with the web's WhatsApp button. They stay out of the
 * shopping list until the admin sees the chat (same code) and confirms.
 */
export function WebOrders({ orders, eventId }: { orders: WebOrder[]; eventId: string | null }) {
  if (orders.length === 0) return null;
  return (
    <details open className="box border-primary bg-secondary/40 px-4 py-3">
      <summary className="cursor-pointer font-heading text-lg font-bold">
        Pesanan dari web, belum dikonfirmasi{" "}
        <span className="rounded-full bg-primary px-2 py-0.5 font-sans text-sm text-primary-foreground">
          {orders.length}
        </span>
      </summary>
      <p className="mt-1 text-sm text-muted-foreground">
        Cocokkan kode dengan chat WhatsApp yang masuk. <b>Konfirmasi</b> kalau chat-nya benar ada:
        barang PO masuk ke daftar belanja batch-nya, barang Ready langsung memotong stok.
        <b> Tolak</b> kalau chat-nya tidak pernah datang.
      </p>
      <ul className="mt-3 space-y-2">
        {orders.map((o) => (
          <WebOrderCard key={o.id} o={o} eventId={eventId} />
        ))}
      </ul>
    </details>
  );
}
