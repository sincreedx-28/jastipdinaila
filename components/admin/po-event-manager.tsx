"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  deletePoEvent,
  duplicatePoEvent,
  savePoEvent,
  setPoEventArchived,
  type PoEventInput,
} from "@/lib/actions/po-events";
import { daysLeft, eventState, fmtDay, type PoEventInfo, type PoEventState } from "@/lib/po-event-state";

type EventRow = PoEventInfo & {
  productCount: number;
  orderCount: number;
  products: { id: string; name: string; isActive: boolean }[];
};

const STATE_LABEL: Record<PoEventState, string> = {
  open: "Order dibuka",
  soon: "Belum dibuka",
  closed: "Order ditutup",
  archived: "Diarsipkan",
};
const STATE_CLASS: Record<PoEventState, string> = {
  open: "bg-emerald-100 text-emerald-800",
  soon: "bg-sky-100 text-sky-800",
  closed: "bg-amber-100 text-amber-800",
  archived: "bg-secondary text-secondary-foreground",
};
const RANK: Record<PoEventState, number> = { open: 0, soon: 1, closed: 2, archived: 3 };

const empty: PoEventInput = { name: "", place: "", openDate: "", closeDate: "", etaDate: "", etaNote: "", note: "" };
const toInput = (e: PoEventInfo): PoEventInput => ({
  name: e.name,
  place: e.place ?? "",
  openDate: e.openDate ?? "",
  closeDate: e.closeDate ?? "",
  etaDate: e.etaDate ?? "",
  etaNote: e.etaNote ?? "",
  note: e.note ?? "",
});

function periodText(e: PoEventInfo) {
  if (e.openDate && e.closeDate) return `${fmtDay(e.openDate, { id: true })} – ${fmtDay(e.closeDate, { id: true, year: true })}`;
  if (e.closeDate) return `s/d ${fmtDay(e.closeDate, { id: true, year: true })}`;
  if (e.openDate) return `mulai ${fmtDay(e.openDate, { id: true })}`;
  return "tanpa batas tanggal";
}
const etaText = (e: PoEventInfo) =>
  e.etaDate ? fmtDay(e.etaDate, { id: true, year: true }) : e.etaNote || "belum diisi";

function Fields({ v, set }: { v: PoEventInput; set: (p: Partial<PoEventInput>) => void }) {
  const field = (label: string, el: React.ReactNode, hint?: string) => (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold">
        {label}
        {hint && <span className="font-normal text-muted-foreground"> {hint}</span>}
      </span>
      {el}
    </label>
  );
  return (
    <div className="space-y-4">
      {field("Nama PO Event", <Input value={v.name} onChange={(e) => set({ name: e.target.value })} placeholder="mis. Live Jepang 20 Nov" />)}
      {field("Tempat / negara", <Input value={v.place} onChange={(e) => set({ place: e.target.value })} placeholder="mis. Tokyo, Jepang" />, "(opsional)")}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("Order dibuka", <Input type="date" value={v.openDate} onChange={(e) => set({ openDate: e.target.value })} />, "(opsional)")}
        {field("Order ditutup (close)", <Input type="date" value={v.closeDate} onChange={(e) => set({ closeDate: e.target.value })} />)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("Estimasi barang tiba (ETA)", <Input type="date" value={v.etaDate} onChange={(e) => set({ etaDate: e.target.value })} />)}
        {field("…atau tulis estimasinya", <Input value={v.etaNote} onChange={(e) => set({ etaNote: e.target.value })} placeholder="mis. akhir Desember" />, "(opsional)")}
      </div>
      {field(
        "Catatan untuk pembeli",
        <Textarea rows={3} value={v.note} onChange={(e) => set({ note: e.target.value })} placeholder="mis. DP 50%, pelunasan saat barang tiba" />,
        "(opsional)"
      )}
      {v.etaDate && v.closeDate && v.etaDate < v.closeDate && (
        <p className="text-sm font-semibold text-amber-700">
          Estimasi tiba lebih awal dari tanggal close order. Pastikan tanggalnya sudah benar.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Periode order dan estimasi tiba tampil di atas produk batch ini di halaman Pre-Order toko.
        Setelah tanggal close lewat, produknya otomatis tidak bisa dipesan lagi.
      </p>
    </div>
  );
}

/** "PO Event": every shopping trip / batch with its dates, archive and copy. */
export function PoEventManager({ events }: { events: EventRow[] }) {
  const [editing, setEditing] = useState<{ id: string | null; v: PoEventInput } | null>(null);
  const [dup, setDup] = useState<{ src: EventRow; v: PoEventInput; ids: Set<string>; archiveOld: boolean } | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      toast.success(success);
      after?.();
    });

  const withState = events.map((e) => ({ ...e, state: eventState(e) }));
  const active = withState.filter((e) => e.state !== "archived").sort((a, b) => RANK[a.state] - RANK[b.state]);
  const archived = withState.filter((e) => e.state === "archived");

  const header = (
    <div>
      <h2 className="text-2xl">PO Event</h2>
      <p className="text-sm text-muted-foreground">
        Satu PO Event = satu trip/batch belanja. Batch yang diarsipkan, beserta produknya,
        disembunyikan dari toko.
      </p>
    </div>
  );

  if (editing) {
    return (
      <div className="max-w-2xl space-y-5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <button type="button" className="text-sm font-bold text-primary hover:underline" onClick={() => setEditing(null)}>
            ← Daftar PO Event
          </button>
          <h2 className="text-2xl">{editing.id ? "Edit PO Event" : "PO Event baru"}</h2>
        </div>
        <div className="box p-4">
          <Fields v={editing.v} set={(p) => setEditing({ ...editing, v: { ...editing.v, ...p } })} />
        </div>
        <div className="flex gap-2">
          <Button
            disabled={pending}
            onClick={() => run(() => savePoEvent(editing.id, editing.v), "PO Event tersimpan", () => setEditing(null))}
          >
            {pending ? "Menyimpan..." : "Simpan"}
          </Button>
          <Button variant="outline" onClick={() => setEditing(null)}>
            Batal
          </Button>
        </div>
      </div>
    );
  }

  if (dup) {
    const toggle = (id: string) => {
      const ids = new Set(dup.ids);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      setDup({ ...dup, ids });
    };
    return (
      <div className="max-w-2xl space-y-5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <button type="button" className="text-sm font-bold text-primary hover:underline" onClick={() => setDup(null)}>
            ← Daftar PO Event
          </button>
          <h2 className="text-2xl">Duplikat untuk batch berikutnya</h2>
        </div>
        <p className="soft-note">
          Dari <b>{dup.src.name}</b>. Produk terpilih disalin lengkap dengan harga, varian, dan
          fotonya ke batch baru. Batch lama tidak berubah.
        </p>
        <div className="box p-4">
          <Fields v={dup.v} set={(p) => setDup({ ...dup, v: { ...dup.v, ...p } })} />
        </div>
        <div className="box space-y-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <b>Produk yang disalin ({dup.ids.size}/{dup.src.products.length})</b>
            <button
              type="button"
              className="text-sm font-bold text-primary"
              onClick={() =>
                setDup({
                  ...dup,
                  ids: dup.ids.size === dup.src.products.length ? new Set() : new Set(dup.src.products.map((p) => p.id)),
                })
              }
            >
              {dup.ids.size === dup.src.products.length ? "Kosongkan" : "Pilih semua"}
            </button>
          </div>
          {dup.src.products.length === 0 ? (
            <p className="text-sm text-muted-foreground">Batch ini belum punya produk.</p>
          ) : (
            <ul className="max-h-80 divide-y overflow-auto rounded-xl border">
              {dup.src.products.map((p) => (
                <li key={p.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3">
                    <input type="checkbox" className="h-5 w-5" checked={dup.ids.has(p.id)} onChange={() => toggle(p.id)} />
                    <span className={p.isActive ? "" : "text-muted-foreground"}>
                      {p.name}
                      {!p.isActive && " (disembunyikan)"}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={dup.archiveOld}
              onChange={(e) => setDup({ ...dup, archiveOld: e.target.checked })}
            />
            Arsipkan “{dup.src.name}” (sembunyikan dari toko)
          </label>
        </div>
        <div className="flex gap-2">
          <Button
            disabled={pending}
            onClick={() =>
              run(
                () => duplicatePoEvent(dup.src.id, dup.v, [...dup.ids], dup.archiveOld),
                `${dup.v.name || "PO Event"} dibuat, ${dup.ids.size} produk disalin`,
                () => setDup(null)
              )
            }
          >
            {pending ? "Menyalin..." : `Buat batch & salin ${dup.ids.size} produk`}
          </Button>
          <Button variant="outline" onClick={() => setDup(null)}>
            Batal
          </Button>
        </div>
      </div>
    );
  }

  const card = (e: (typeof withState)[number]) => {
    const left = e.state === "open" && e.closeDate ? daysLeft(e.closeDate) : null;
    const canDelete = e.productCount === 0 && e.orderCount === 0;
    return (
      <li key={e.id} className={`box space-y-3 p-4 ${e.state === "archived" ? "opacity-75" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <b className="text-lg">{e.name}</b>
            {e.place && <span className="text-muted-foreground"> · {e.place}</span>}
            <p className="text-sm text-muted-foreground">
              Order {periodText(e)} · tiba {etaText(e)}
            </p>
            <p className="text-sm text-muted-foreground">
              {e.productCount} produk ·{" "}
              <Link href={`/admin/rekap?event=${e.id}`} className="font-semibold text-primary hover:underline">
                {e.orderCount} order di Rekap
              </Link>
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${STATE_CLASS[e.state]}`}>
            {STATE_LABEL[e.state]}
            {left !== null &&
              left <= 3 &&
              ` · ${left <= 0 ? "hari terakhir" : left === 1 ? "tutup besok" : `tutup ${left} hari lagi`}`}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing({ id: e.id, v: toInput(e) })}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setDup({
                src: e,
                v: { ...empty, name: "", place: e.place ?? "", note: e.note ?? "" },
                ids: new Set(e.products.map((p) => p.id)),
                archiveOld: e.state !== "archived",
              })
            }
          >
            Duplikat untuk batch berikutnya
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(
                () => setPoEventArchived(e.id, e.state !== "archived"),
                e.state === "archived" ? `${e.name} tampil lagi di toko` : `${e.name} diarsipkan`
              )
            }
          >
            {e.state === "archived" ? "Tampilkan lagi" : "Arsipkan"}
          </Button>
          {canDelete && (
            <Button
              size="sm"
              variant="outline"
              className={confirmDel === e.id ? "text-destructive!" : ""}
              onBlur={() => setConfirmDel(null)}
              onClick={() => {
                if (confirmDel !== e.id) return setConfirmDel(e.id);
                run(() => deletePoEvent(e.id), "PO Event dihapus");
              }}
            >
              {confirmDel === e.id ? "Yakin hapus?" : "Hapus"}
            </Button>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {header}
        <Button onClick={() => setEditing({ id: null, v: empty })}>+ PO Event baru</Button>
      </div>
      {active.length === 0 ? (
        <p className="box p-8 text-center text-muted-foreground">Belum ada PO Event aktif.</p>
      ) : (
        <ul className="space-y-3">{active.map(card)}</ul>
      )}
      {archived.length > 0 && (
        <details className="box px-4 py-3">
          <summary className="cursor-pointer font-semibold">
            Arsip <span className="font-normal text-muted-foreground">· {archived.length} event</span>
          </summary>
          <ul className="mt-3 space-y-3">{archived.map(card)}</ul>
        </details>
      )}
    </div>
  );
}
