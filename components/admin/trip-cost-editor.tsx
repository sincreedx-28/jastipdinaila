"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveTripCosts } from "@/lib/actions/po-events";
import { rp } from "@/lib/rekap";

type Row = { label: string; amount: string };

/** "+ Biaya trip": baggage, transport, fees… subtracted from a batch's profit. */
export function TripCostEditor({
  eventId,
  initial,
}: {
  eventId: string;
  initial: { label: string; amount: number }[];
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [pending, start] = useTransition();

  const begin = () => {
    setRows(
      initial.length
        ? initial.map((c) => ({ label: c.label, amount: String(c.amount) }))
        : [
            { label: "Bagasi", amount: "" },
            { label: "Transport", amount: "" },
          ]
    );
    setOpen(true);
  };
  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const total = rows.reduce((a, r) => a + (Number(r.amount) || 0), 0);

  if (!open)
    return (
      <Button size="sm" variant="outline" onClick={begin}>
        {initial.length ? "Ubah biaya trip" : "+ Biaya trip"}
      </Button>
    );

  return (
    <div className="space-y-2 rounded-xl bg-secondary/60 p-3">
      <p className="text-sm">
        <b>Biaya trip</b>{" "}
        <span className="text-muted-foreground">
          mis. bagasi, transport, fee titip, ongkir dari luar negeri. Dikurangkan dari untung batch ini.
        </span>
      </p>
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2">
          <Input value={r.label} onChange={(e) => set(i, { label: e.target.value })} aria-label="Nama biaya" className="flex-1" />
          <div className="relative w-36">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
            <Input
              inputMode="numeric"
              className="pl-8"
              value={r.amount ? Number(r.amount).toLocaleString("id-ID") : ""}
              onChange={(e) => set(i, { amount: e.target.value.replace(/\D/g, "") })}
              aria-label={`Jumlah ${r.label}`}
            />
          </div>
          <button
            type="button"
            aria-label="Hapus baris"
            className="h-11 w-11 shrink-0 rounded-xl border bg-background text-lg"
            onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setRows((rs) => [...rs, { label: "", amount: "" }])}>
          + Baris
        </Button>
        <span className="ml-auto text-sm">
          Total <b>{rp(total)}</b>
        </span>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveTripCosts(
                eventId,
                rows.map((x) => ({ label: x.label, amount: Number(x.amount) || 0 }))
              );
              if (!r.ok) return void toast.error(r.error);
              toast.success("Biaya trip disimpan");
              setOpen(false);
            })
          }
        >
          Simpan
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
          Batal
        </Button>
      </div>
    </div>
  );
}
