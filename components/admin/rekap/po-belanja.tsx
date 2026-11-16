"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  changeItemGot,
  setItemCost,
  setItemGot,
  setItemPrice,
  setItemSoldOut,
} from "@/lib/actions/rekap";
import { itemStatus, type ItemRow, type ItemStatus } from "@/lib/rekap";
import { copyText, Empty, Stepper, useRekapAction, type Buyer } from "./shared";

const RANK: Record<ItemStatus, number> = { kurang: 0, lebih: 1, pas: 2, habis: 3 };
const STATUS_CLASS: Record<ItemStatus, string> = {
  kurang: "bg-amber-100 text-amber-800",
  lebih: "bg-sky-100 text-sky-800",
  pas: "bg-emerald-100 text-emerald-800",
  habis: "bg-destructive/10 text-destructive",
};

/** Number field that saves when it loses focus (or on Enter) if changed. */
function MoneyCell({
  label,
  value,
  placeholder,
  onSave,
}: {
  label: string;
  value: number | null | undefined;
  placeholder: string;
  onSave: (v: number | null) => void;
}) {
  const [text, setText] = useState(value ? String(value) : "");
  const [last, setLast] = useState(value);
  if (value !== last) {
    // Prop changed from the server (e.g. another admin): show the new value.
    setLast(value);
    setText(value ? String(value) : "");
  }
  const commit = () => {
    const n = text === "" ? null : Number(text);
    if ((n ?? 0) !== (value ?? 0)) onSave(n);
  };
  return (
    <label className="flex items-center gap-1.5 rounded-xl border bg-background pl-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        inputMode="numeric"
        value={text ? Number(text).toLocaleString("id-ID") : ""}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value.replace(/\D/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        aria-label={`${label} per pcs`}
        className="h-10 w-24 rounded-r-xl bg-transparent pr-2 text-base font-semibold outline-none"
      />
    </label>
  );
}

/**
 * "Daftar belanja": what to buy, how many were bought so far, and whether
 * each line is short / over / exact. Rows keep their position while you tap
 * so buttons don't jump; "Urutkan ulang" re-sorts by status.
 */
export function PoBelanja({
  rows,
  isOwner,
  buyersById,
  eventName,
}: {
  rows: ItemRow[];
  isOwner: boolean;
  buyersById: Map<string, Buyer>;
  eventName: string;
}) {
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [, startTransition] = useTransition();
  const { run } = useRekapAction();
  const [optimisticGot, addGot] = useOptimistic(
    new Map<string, number>(),
    (state, { id, delta }: { id: string; delta: number }) => {
      const next = new Map(state);
      next.set(id, (next.get(id) ?? 0) + delta);
      return next;
    }
  );

  const sorted = (list: ItemRow[]) =>
    list
      .slice()
      .sort(
        (a, b) =>
          RANK[itemStatus(a)[0]] - RANK[itemStatus(b)[0]] || a.name.localeCompare(b.name, "id")
      )
      .map((r) => r.id);
  // Position is fixed when the tab opens (and on "Urutkan ulang"); new lines
  // are added at the end, so nothing jumps while you tap.
  const [order, setOrder] = useState<string[]>(() => sorted(rows));
  const known = new Set(order);
  const fresh = rows
    .filter((r) => !known.has(r.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((r) => r.id);
  const byId = new Map(rows.map((r) => [r.id, r]));
  let list = [...order, ...fresh].map((id) => byId.get(id)).filter((r): r is ItemRow => Boolean(r));
  list = list.map((r) => ({ ...r, got: Math.max(0, r.got + (optimisticGot.get(r.id) ?? 0)) }));
  if (onlyOpen) list = list.filter((r) => !r.soldOut && r.got < r.need);

  const bump = (r: ItemRow, delta: number) =>
    startTransition(async () => {
      addGot({ id: r.id, delta });
      const res = await changeItemGot(r.id, delta);
      if (!res.ok) toast.error(res.error);
    });

  const copyList = () => {
    const open = rows.filter((r) => !r.soldOut && r.got < r.need);
    const text =
      `Daftar belanja ${eventName}\n` +
      (open.length
        ? open
            .map(
              (r, i) =>
                `${i + 1}. ${r.name}${r.variant ? ` (${r.variant})` : ""}: ${r.need - r.got} pcs` +
                (r.got ? ` (sudah ${r.got} dari ${r.need})` : "")
            )
            .join("\n")
        : "Semua barang sudah lengkap.");
    copyText(text, "Daftar belanja");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="mr-auto flex min-h-10 items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={onlyOpen}
            onChange={(e) => setOnlyOpen(e.target.checked)}
          />
          Hanya yang belum lengkap
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setOrder(sorted(rows));
            toast.success("Diurutkan: yang kurang paling atas");
          }}
        >
          Urutkan ulang
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={copyList}>
          Salin daftar belanja
        </Button>
      </div>

      {list.length === 0 ? (
        <Empty>
          {onlyOpen && rows.length ? "Semua barang sudah lengkap." : "Belum ada barang. Catat order dulu."}
        </Empty>
      ) : (
        <ul className="space-y-2.5">
          {list.map((r) => {
            const [status, label] = itemStatus(r);
            const pct = r.need ? Math.min(100, (r.got / r.need) * 100) : 100;
            const buyers = new Set(r.orders.map((o) => o.buyerId)).size;
            return (
              <li key={r.id} className="box space-y-3 p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1 basis-44">
                    <b>{r.name}</b>
                    {r.variant && <span className="text-muted-foreground"> · {r.variant}</span>}
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                      <i
                        className="block h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_CLASS[status]}`}>
                        {label}
                      </span>
                      <span className="text-muted-foreground">
                        {r.orders.length} order · {buyers} pembeli
                      </span>
                    </div>
                  </div>
                  <Stepper
                    value={r.got}
                    min={0}
                    label={`yang diambil ${r.name}`}
                    sub={`dari ${r.need}`}
                    onChange={(d) => bump(r, d)}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <MoneyCell
                    label="Jual Rp"
                    value={r.price || null}
                    placeholder="harga"
                    onSave={(v) => run(() => setItemPrice(r.id, v ?? 0), { success: "Harga disimpan" })}
                  />
                  {isOwner && (
                    <MoneyCell
                      label="Modal Rp"
                      value={r.cost}
                      placeholder="modal"
                      onSave={(v) => run(() => setItemCost(r.id, v), { success: "Modal disimpan" })}
                    />
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={r.got === r.need}
                    onClick={() => run(() => setItemGot(r.id, r.need))}
                  >
                    Ambil pas ({r.need})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => run(() => setItemSoldOut(r.id, !r.soldOut))}
                  >
                    {r.soldOut ? "Buka lagi" : "Tandai stok habis"}
                  </Button>
                </div>
                {r.orders.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground">Lihat pemesan</summary>
                    <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                      {r.orders.map((o) => (
                        <li key={o.id}>
                          {buyersById.get(o.buyerId)?.name ?? "?"} x{o.qty}
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {rows.some((r) => r.price === 0 && r.need > 0) && (
        <p className="soft-note">
          Barang yang harganya belum diisi akan tertulis &quot;harga?&quot; di rekap pembeli.
        </p>
      )}
    </div>
  );
}

