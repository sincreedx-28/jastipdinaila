"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addPurchaseStock, correctStock, type StockFormState } from "@/lib/actions/stock";

type PanelVariant = {
  id: string;
  name: string;
  stockQty: number;
  price: number;
  avgCost: number | null;
};

type PanelMovement = {
  id: string;
  variantName: string;
  type: "PURCHASE" | "ADJUSTMENT";
  qty: number;
  unitCost: number | null;
  stockAfter: number;
  note: string | null;
  adminName: string | null;
  createdAt: string;
};

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const fmtDigits = (d: string) => d.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function Feedback({ state }: { state: StockFormState }) {
  if (state?.error) return <p className="text-sm text-destructive">{state.error}</p>;
  if (state?.ok) return <p className="text-sm font-medium text-emerald-700">{state.ok}</p>;
  return null;
}

function PurchaseForm({ variant, onDone }: { variant: PanelVariant; onDone: () => void }) {
  const [state, action, pending] = useActionState(
    addPurchaseStock.bind(null, variant.id),
    undefined
  );
  const [cost, setCost] = useState("");
  const done = useRef(onDone);
  useEffect(() => {
    if (state?.ok) done.current();
  }, [state]);

  return (
    <form action={action} className="space-y-2 rounded-xl bg-secondary/60 p-3">
      <p className="text-sm font-semibold">Tambah stok dari belanja</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[6rem_9rem_1fr]">
        <Input name="qty" inputMode="numeric" placeholder="Jumlah" aria-label="Jumlah" required />
        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            Rp
          </span>
          <Input
            name="unitCost"
            inputMode="numeric"
            className="pl-8"
            placeholder="Harga beli/pcs"
            aria-label="Harga beli per pcs"
            value={fmtDigits(cost)}
            onChange={(e) => setCost(e.target.value.replace(/\D/g, ""))}
            required
          />
        </div>
        <Input
          name="note"
          placeholder="Catatan (opsional), mis. Belanja Bangkok"
          aria-label="Catatan"
          className="col-span-2 sm:col-span-1"
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan"}
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

function CorrectionForm({ variant, onDone }: { variant: PanelVariant; onDone: () => void }) {
  const [state, action, pending] = useActionState(correctStock.bind(null, variant.id), undefined);
  const done = useRef(onDone);
  useEffect(() => {
    if (state?.ok) done.current();
  }, [state]);

  return (
    <form action={action} className="space-y-2 rounded-xl bg-secondary/60 p-3">
      <p className="text-sm font-semibold">Koreksi stok</p>
      <p className="text-xs text-muted-foreground">
        Isi jumlah yang benar-benar ada sekarang (mis. setelah hitung ulang, ada yang rusak,
        atau dikasih ke orang). Modal rata-rata tidak berubah.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[8rem_1fr]">
        <Input
          name="actualQty"
          inputMode="numeric"
          defaultValue={variant.stockQty}
          aria-label="Jumlah stok sebenarnya"
          required
        />
        <Input name="note" placeholder="Alasan (opsional)" aria-label="Alasan" />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan koreksi"}
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

function VariantStockRow({ variant, isOwner }: { variant: PanelVariant; isOwner: boolean }) {
  const [open, setOpen] = useState<"buy" | "fix" | null>(null);
  const margin =
    variant.avgCost !== null && variant.avgCost > 0 ? variant.price - variant.avgCost : null;

  return (
    <div className="space-y-2 border-b py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="min-w-24 font-medium">{variant.name || "Stok"}</span>
        <span
          className={`text-sm font-semibold ${
            variant.stockQty === 0
              ? "text-destructive"
              : variant.stockQty <= 3
                ? "text-amber-600"
                : ""
          }`}
        >
          {variant.stockQty} pcs
        </span>
        {isOwner && (
          <span className="text-sm text-muted-foreground">
            Modal rata-rata: {variant.avgCost !== null ? rp(variant.avgCost) : "belum ada"}
            {margin !== null && (
              <>
                {" · "}untung/pcs{" "}
                <span className={margin < 0 ? "text-destructive" : "text-emerald-700"}>
                  {rp(margin)}
                </span>
              </>
            )}
          </span>
        )}
        <div className="ml-auto flex gap-2">
          {isOwner && (
            <Button
              type="button"
              size="sm"
              variant={open === "buy" ? "default" : "outline"}
              onClick={() => setOpen(open === "buy" ? null : "buy")}
            >
              + Belanja
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant={open === "fix" ? "default" : "outline"}
            onClick={() => setOpen(open === "fix" ? null : "fix")}
          >
            Koreksi
          </Button>
        </div>
      </div>
      {open === "buy" && <PurchaseForm variant={variant} onDone={() => setOpen(null)} />}
      {open === "fix" && <CorrectionForm variant={variant} onDone={() => setOpen(null)} />}
    </div>
  );
}

/**
 * "Stok & Modal" panel on the product edit page (Ready products). The owner
 * records purchases (quantity + purchase price → weighted average cost); any
 * admin can correct a count. Every change is logged in the history below.
 */
export function StockPanel({
  isOwner,
  variants,
  movements,
}: {
  isOwner: boolean;
  variants: PanelVariant[];
  movements: PanelMovement[];
}) {
  const total = variants.reduce((s, v) => s + v.stockQty, 0);

  return (
    <section className="box max-w-2xl space-y-4 p-4">
      <div>
        <h2 className="text-xl">Stok &amp; modal</h2>
        <p className="text-sm text-muted-foreground">
          Total stok: <b>{total} pcs</b>.{" "}
          {isOwner
            ? "Barang yang sama tapi harga belinya beda tiap belanja tetap 1 produk — catat lewat “+ Belanja”, modalnya otomatis dirata-rata."
            : "Penambahan stok dari belanja dicatat oleh owner."}
        </p>
      </div>

      <div>
        {variants.map((v) => (
          <VariantStockRow key={v.id} variant={v} isOwner={isOwner} />
        ))}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer font-medium">
          Riwayat stok ({movements.length})
        </summary>
        {movements.length === 0 ? (
          <p className="mt-2 text-muted-foreground">Belum ada catatan.</p>
        ) : (
          <ul className="mt-2 divide-y">
            {movements.map((m) => (
              <li key={m.id} className="flex flex-wrap gap-x-3 py-2">
                <span className="text-muted-foreground">
                  {new Date(m.createdAt).toLocaleString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Jakarta",
                  })}
                </span>
                {m.variantName && <span className="font-medium">{m.variantName}</span>}
                <span className={m.qty < 0 ? "text-destructive" : "text-emerald-700"}>
                  {m.qty > 0 ? "+" : ""}
                  {m.qty}
                </span>
                <span>{m.type === "PURCHASE" ? "belanja" : "koreksi"}</span>
                {m.unitCost !== null && <span>@ {rp(m.unitCost)}</span>}
                <span className="text-muted-foreground">→ sisa {m.stockAfter}</span>
                {m.note && <span className="italic text-muted-foreground">“{m.note}”</span>}
                {m.adminName && <span className="text-muted-foreground">oleh {m.adminName}</span>}
              </li>
            ))}
          </ul>
        )}
      </details>
    </section>
  );
}
