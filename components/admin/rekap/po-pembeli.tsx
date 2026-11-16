"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buyerMatches, fmtPhone, orderStatus, rp, type ItemRow, type OrderStatus } from "@/lib/rekap";
import { copyText, Empty, type Buyer } from "./shared";

const LINE_CLASS: Record<OrderStatus, string> = {
  dapat: "text-emerald-700",
  part: "text-amber-700",
  wait: "text-muted-foreground",
  no: "text-destructive",
};

type Line = {
  orderId: string;
  name: string;
  variant: string;
  qty: number;
  got: number;
  price: number;
  status: OrderStatus;
  label: string;
};

type BuyerRecap = { buyer: Buyer; lines: Line[]; total: number; final: boolean; missingPrice: boolean };

function buildRecaps(rows: ItemRow[], alloc: Map<string, number>, buyersById: Map<string, Buyer>) {
  const map = new Map<string, BuyerRecap>();
  for (const r of rows) {
    for (const o of r.orders) {
      const buyer = buyersById.get(o.buyerId) ?? { id: o.buyerId, name: "?", phone: "" };
      const got = alloc.get(o.id) ?? 0;
      const [status, label] = orderStatus(o.qty, got, r.soldOut);
      const rec = map.get(o.buyerId) ?? { buyer, lines: [], total: 0, final: true, missingPrice: false };
      rec.lines.push({ orderId: o.id, name: r.name, variant: r.variant, qty: o.qty, got, price: r.price, status, label });
      rec.total += got * r.price;
      if (status === "wait" || (status === "part" && !r.soldOut)) rec.final = false;
      if (got > 0 && !r.price) rec.missingPrice = true;
      map.set(o.buyerId, rec);
    }
  }
  return [...map.values()].sort((a, b) => a.buyer.name.localeCompare(b.buyer.name, "id"));
}

function waText(rec: BuyerRecap, eventName: string) {
  const lines = rec.lines.map((l, i) => {
    const what = `${l.name}${l.variant ? ` (${l.variant})` : ""}`;
    if (l.got === 0) return `${i + 1}. ${what} x${l.qty}: ${l.status === "no" ? "tidak dapat (stok habis)" : "belum didapat"}`;
    const part = l.got < l.qty ? ` (dapat ${l.got} dari ${l.qty})` : "";
    const sum = l.price ? `${rp(l.price)} x${l.got} = ${rp(l.price * l.got)}` : `x${l.got} (harga menyusul)`;
    return `${i + 1}. ${what} ${sum}${part}`;
  });
  return [
    `Halo kak ${rec.buyer.name}, ini rekap pesanan ${eventName} dari jastipdinaila:`,
    "",
    ...lines,
    "",
    `Total: ${rp(rec.total)}${rec.final ? "" : " (sementara, masih ada barang yang dicari)"}`,
    "",
    "Terima kasih kak 🙏",
  ].join("\n");
}

/** "Per pembeli": each buyer's lines, what they got, total, and WA text. */
export function PoPembeli({
  rows,
  alloc,
  buyersById,
  eventName,
}: {
  rows: ItemRow[];
  alloc: Map<string, number>;
  buyersById: Map<string, Buyer>;
  eventName: string;
}) {
  const [q, setQ] = useState("");
  const all = buildRecaps(rows, alloc, buyersById);
  const list = all.filter((r) => buyerMatches(r.buyer, q));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama atau no. HP"
          className="min-w-48 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          disabled={all.length === 0}
          onClick={() =>
            copyText(all.map((r) => waText(r, eventName)).join("\n\n-----\n\n"), "Semua rekap")
          }
        >
          Salin semua rekap
        </Button>
      </div>

      {list.length === 0 ? (
        <Empty>{q ? "Pembeli tidak ditemukan." : "Belum ada order."}</Empty>
      ) : (
        <ul className="space-y-2.5">
          {list.map((rec) => (
            <li key={rec.buyer.id} className="box space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <b className="block truncate text-lg">{rec.buyer.name}</b>
                  <span className="text-sm text-muted-foreground">{fmtPhone(rec.buyer.phone)}</span>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    rec.final ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {rec.final ? "Final" : "Sementara"}
                </span>
              </div>
              <ul className="divide-y border-y">
                {rec.lines.map((l) => (
                  <li key={l.orderId} className="flex items-start justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      {l.name}
                      {l.variant ? ` (${l.variant})` : ""}{" "}
                      <span className="text-muted-foreground">x{l.qty}</span>
                      <div className={`text-xs font-semibold ${LINE_CLASS[l.status]}`}>{l.label}</div>
                    </div>
                    <b className="shrink-0">{l.got ? (l.price ? rp(l.got * l.price) : "harga?") : "–"}</b>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between font-heading text-lg font-bold">
                <span>Total</span>
                <span>{rp(rec.total)}</span>
              </div>
              {rec.missingPrice && (
                <p className="text-sm text-destructive">
                  Ada barang yang harganya belum diisi (isi di Daftar belanja).
                </p>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => copyText(waText(rec, eventName), `Rekap ${rec.buyer.name}`)}
              >
                Salin rekap untuk WA
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
