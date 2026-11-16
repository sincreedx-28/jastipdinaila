"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPoEvent } from "@/lib/actions/rekap";
import { allocate, type RekapItem, type RekapOrder } from "@/lib/rekap";
import { useRekapAction, useStoredChoice, type Buyer } from "./shared";
import { PoCatat } from "./po-catat";
import { PoBelanja } from "./po-belanja";
import { PoPembeli } from "./po-pembeli";
import { CustomerTab } from "./customer-tab";
import { ReadyMode } from "./ready-mode";
import { WebOrders, type WebOrder } from "./web-orders";

export type CatalogEntry = {
  id: string;
  name: string;
  type: "READY" | "PO";
  /** Belongs to the PO Event being recorded. */
  inEvent: boolean;
  image: string | null;
  price: number;
  variants: { name: string; price: number }[];
};
export type ReadyProduct = {
  id: string;
  name: string;
  group: string | null;
  isActive: boolean;
  variants: { id: string; name: string; price: number; stockQty: number }[];
};
export type SaleRow = {
  id: string;
  buyerId: string;
  productName: string;
  variantName: string;
  qty: number;
  price: number;
  createdAt: string;
};

export type RekapData = {
  mode: "po" | "ready";
  isOwner: boolean;
  events: { id: string; name: string; archived: boolean }[];
  eventId: string | null;
  buyers: Buyer[];
  items: RekapItem[];
  orders: RekapOrder[];
  catalog: CatalogEntry[];
  readyProducts: ReadyProduct[];
  sales: SaleRow[];
  month: string;
  months: string[];
  webOrders: WebOrder[];
};

type PoTab = "catat" | "belanja" | "pembeli" | "customer";
const PO_TAB_KEYS = ["catat", "belanja", "pembeli", "customer"] as const;
const PO_TABS: [PoTab, string][] = [
  ["catat", "Catat order"],
  ["belanja", "Daftar belanja"],
  ["pembeli", "Per pembeli"],
  ["customer", "Customer"],
];

export function RekapApp({ data }: { data: RekapData }) {
  const router = useRouter();
  const [tab, setTab] = useStoredChoice<PoTab>("rekap-tab", "catat", PO_TAB_KEYS);
  const [newEvent, setNewEvent] = useState(false);
  const [eventName, setEventName] = useState("");
  const { pending, run } = useRekapAction();

  const buyersById = useMemo(() => new Map(data.buyers.map((b) => [b.id, b])), [data.buyers]);
  const { rows, alloc } = useMemo(() => allocate(data.items, data.orders), [data.items, data.orders]);
  const event = data.events.find((e) => e.id === data.eventId) ?? null;

  const modeTabs = (
    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1">
      {(
        [
          ["po", "Pre-Order"],
          ["ready", "Ready Stock"],
        ] as const
      ).map(([m, label]) => (
        <button
          key={m}
          type="button"
          onClick={() => router.push(m === "po" ? "/admin/rekap" : "/admin/rekap?mode=ready")}
          className={`min-h-11 rounded-xl font-heading text-base font-bold ${
            data.mode === m ? "bg-background text-primary shadow-sm" : "text-secondary-foreground"
          }`}
          aria-pressed={data.mode === m}
        >
          {label}
        </button>
      ))}
    </div>
  );

  if (data.mode === "ready") {
    return (
      <div className="space-y-4">
        <Title />
        <WebOrders orders={data.webOrders} eventId={null} />
        {modeTabs}
        <ReadyMode data={data} buyersById={buyersById} />
      </div>
    );
  }

  const createEvent = () =>
    run(() => createPoEvent(eventName), {
      success: "PO Event dibuat",
      onOk: (r) => {
        setNewEvent(false);
        setEventName("");
        router.push(`/admin/rekap?event=${r.id}`);
      },
    });

  const need = rows.reduce((a, r) => a + r.need, 0);
  const got = rows.reduce((a, r) => a + Math.min(r.got, r.need), 0);
  const short = rows.filter((r) => !r.soldOut && r.got < r.need).length;
  const buyerCount = new Set(data.orders.map((o) => o.buyerId)).size;

  return (
    <div className="space-y-4">
      <Title />
      <WebOrders orders={data.webOrders} eventId={data.eventId} />
      {modeTabs}

      <div className="flex flex-wrap gap-2">
        {data.events.length > 0 && (
          <select
            aria-label="Pilih PO Event"
            value={data.eventId ?? ""}
            onChange={(e) => router.push(`/admin/rekap?event=${e.target.value}`)}
            className="h-11 min-w-0 flex-1 rounded-xl border bg-background px-3 text-base font-semibold"
          >
            {data.events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
                {e.archived ? " (arsip)" : ""}
              </option>
            ))}
          </select>
        )}
        {!newEvent && data.events.length > 0 && (
          <Button type="button" variant="outline" onClick={() => setNewEvent(true)}>
            + PO Event baru
          </Button>
        )}
      </div>

      {(newEvent || data.events.length === 0) && (
        <div className="box space-y-3 p-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Nama PO Event</span>
            <Input
              autoFocus
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createEvent();
              }}
              placeholder="mis. Live Jepang 20 Nov"
            />
          </label>
          <p className="text-sm text-muted-foreground">
            Satu PO Event = satu trip/batch belanja. Semua order dari live itu dicatat di sini.
            Tanggal close, estimasi ready, dan tempat bisa dilengkapi di menu <b>PO Event</b>.
          </p>
          <div className="flex gap-2">
            <Button type="button" onClick={createEvent} disabled={pending}>
              Buat PO Event
            </Button>
            {data.events.length > 0 && (
              <Button type="button" variant="outline" onClick={() => setNewEvent(false)}>
                Batal
              </Button>
            )}
          </div>
        </div>
      )}

      {event && (
        <>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              [data.orders.length, "order"],
              [buyerCount, "pembeli"],
              [`${got}/${need}`, "pcs diambil"],
              [short, "barang kurang"],
            ].map(([v, l], i) => (
              <div
                key={l as string}
                className={`rounded-2xl border p-2 ${i === 3 && short > 0 ? "border-amber-300 bg-amber-50" : ""}`}
              >
                <b className="block font-heading text-xl">{v}</b>
                <span className="text-xs text-muted-foreground">{l}</span>
              </div>
            ))}
          </div>

          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {PO_TABS.map(([k, l]) => (
              <button
                key={k}
                type="button"
                className="pill"
                data-active={tab === k}
                onClick={() => setTab(k)}
              >
                {l}
              </button>
            ))}
          </div>

          {tab === "catat" && <PoCatat data={data} buyersById={buyersById} rows={rows} />}
          {tab === "belanja" && (
            <PoBelanja rows={rows} isOwner={data.isOwner} buyersById={buyersById} eventName={event.name} />
          )}
          {tab === "pembeli" && (
            <PoPembeli rows={rows} alloc={alloc} buyersById={buyersById} eventName={event.name} />
          )}
          {tab === "customer" && <CustomerTab buyers={data.buyers} orders={data.orders} />}
        </>
      )}
    </div>
  );
}

function Title() {
  return (
    <div>
      <h2 className="text-2xl">Rekap Order</h2>
      <p className="text-sm text-muted-foreground">
        Catat orderan dari live shopping, DM, dan grup WhatsApp supaya tidak ada yang kelewat.
      </p>
    </div>
  );
}
