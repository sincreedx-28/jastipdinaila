"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VariantInput, VariantRowValue } from "@/lib/variant-types";
import { cleanBarcode } from "@/lib/barcode";
import { lookupBarcode, type BarcodeMatch } from "@/lib/actions/barcode";

type Row = {
  key: string;
  id?: string;
  name: string;
  price: string; // digits only
  initialStock: string;
  initialCost: string; // digits only
  barcode: string;
};

let keySeq = 0;
const newKey = () => `r${++keySeq}`;

function toRow(v: VariantRowValue): Row {
  return {
    key: newKey(),
    id: v.id,
    name: v.name,
    price: String(v.price),
    initialStock: "",
    initialCost: "",
    barcode: v.barcode ?? "",
  };
}

function emptyRow(price = ""): Row {
  return { key: newKey(), name: "", price, initialStock: "", initialCost: "", barcode: "" };
}

const fmt = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function MoneyInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (digits: string) => void;
  placeholder?: string;
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        Rp
      </span>
      <Input
        inputMode="numeric"
        aria-label={ariaLabel}
        className="pl-8"
        value={fmt(value)}
        placeholder={placeholder ?? "0"}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      />
    </div>
  );
}

/**
 * "Varian & Harga" section of the product form. Each variant has its own
 * selling price; for Ready products, brand-new rows can also take a first
 * stock count (and, for the owner, the purchase price per pcs). Stock of rows
 * that already exist is changed from the stock panel on the edit page, so
 * every change leaves a trail and the average cost stays correct.
 */
export function VariantEditor({
  type,
  isOwner,
  initial,
  productId,
  presetBarcode,
}: {
  type: "READY" | "PO";
  isOwner: boolean;
  initial?: VariantRowValue[];
  /** Product being edited, so its own barcodes aren't reported as taken. */
  productId?: string;
  /** Scanned code to put in (a new variant row of) this product. */
  presetBarcode?: string;
}) {
  const [rows, setRows] = useState<Row[]>(() => {
    const base = initial && initial.length > 0 ? initial.map(toRow) : [emptyRow()];
    if (!presetBarcode || base.some((r) => r.barcode === presetBarcode)) return base;
    // New product: first row gets the code. Existing product: a new
    // variant row (e.g. a new shade) carrying the scanned code.
    if (!initial?.length) return [{ ...base[0], barcode: presetBarcode }];
    return [...base, { ...emptyRow(base[base.length - 1]?.price ?? ""), barcode: presetBarcode }];
  });
  const [hasOptions, setHasOptions] = useState(
    () =>
      (initial?.length ?? 0) > 1 ||
      Boolean(initial?.[0]?.name) ||
      Boolean(presetBarcode && initial?.length && !initial.some((v) => v.barcode === presetBarcode))
  );
  // Barcode already used elsewhere in the shop, per row key.
  const [taken, setTaken] = useState<Record<string, BarcodeMatch | null>>({});
  const checkBarcode = async (row: Row) => {
    const code = cleanBarcode(row.barcode);
    if (!code) return setTaken((t) => ({ ...t, [row.key]: null }));
    const m = await lookupBarcode(code);
    const own = m && productId && m.productId === productId;
    setTaken((t) => ({ ...t, [row.key]: m && !own ? m : null }));
  };
  const [quickAdd, setQuickAdd] = useState("");

  const isReady = type === "READY";
  // Read live from props (not row state) so it follows stock changes made in
  // the stock panel below without resetting unsaved edits here.
  const currentStock = (id: string) => initial?.find((v) => v.id === id)?.stockQty ?? 0;
  const update = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const payload: VariantInput[] = (hasOptions ? rows : rows.slice(0, 1)).map((r) => ({
    id: r.id,
    name: hasOptions ? r.name : "",
    price: Number(r.price || 0),
    initialStock: isReady && !r.id && r.initialStock !== "" ? Number(r.initialStock) : null,
    initialCost: isOwner && !r.id && r.initialCost !== "" ? Number(r.initialCost) : null,
    barcode: cleanBarcode(r.barcode) || null,
  }));

  function toggleOptions(on: boolean) {
    if (on) {
      setRows((rs) => (rs.length === 1 && !rs[0].name ? [rs[0], emptyRow(rs[0].price)] : rs));
    } else if (rows.length > 1) {
      const dropped = rows.slice(1).filter((r) => r.id);
      if (
        dropped.length > 0 &&
        !window.confirm(
          `Varian selain "${rows[0].name || "baris pertama"}" akan dihapus saat disimpan. Lanjut?`
        )
      ) {
        return;
      }
      setRows((rs) => [rs[0]]);
    }
    setHasOptions(on);
  }

  function addQuick() {
    const names = quickAdd
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    const price = rows[0]?.price ?? "";
    setRows((rs) => {
      const existing = new Set(rs.map((r) => r.name.toLowerCase()));
      // Blank placeholder rows are replaced by the typed names.
      const kept = rs.filter((r) => r.name || r.id || r.initialStock || r.initialCost);
      const fresh = names
        .filter((n) => !existing.has(n.toLowerCase()))
        .map((n) => ({ ...emptyRow(price), name: n }));
      return [...kept, ...fresh];
    });
    setQuickAdd("");
  }

  function removeRow(row: Row) {
    const stock = row.id ? currentStock(row.id) : 0;
    if (stock > 0) {
      if (!window.confirm(`Varian "${row.name}" masih ada stok ${stock}. Tetap hapus?`)) {
        return;
      }
    }
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== row.key) : rs));
  }

  const showNewStockCols = isReady && rows.some((r) => !r.id);

  return (
    <div className="box space-y-3 p-4">
      <input type="hidden" name="variantsJson" value={JSON.stringify(payload)} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-base">Harga{isReady ? " & stok" : ""}</Label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={hasOptions}
            onChange={(e) => toggleOptions(e.target.checked)}
          />
          Ada pilihan varian (ukuran/warna/shade)
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Harga jual = harga final yang dilihat pelanggan, fee jastip sudah termasuk.
        {hasOptions && " Tiap varian boleh beda harga."}
      </p>

      <div className="space-y-3">
        {(hasOptions ? rows : rows.slice(0, 1)).map((row) => (
          <div
            key={row.key}
            className="relative grid grid-cols-2 items-end gap-2 rounded-xl bg-secondary/60 p-3 sm:flex sm:flex-wrap sm:pr-12"
          >
            {hasOptions && (
              <div className="col-span-2 space-y-1 pr-10 sm:w-40 sm:pr-0">
                <span className="text-xs text-muted-foreground">Nama varian</span>
                <Input
                  aria-label="Nama varian"
                  value={row.name}
                  placeholder="mis. M / 21 Natural"
                  onChange={(e) => update(row.key, { name: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-1 sm:w-36">
              <span className="text-xs text-muted-foreground">Harga jual</span>
              <MoneyInput
                ariaLabel={`Harga jual ${row.name}`}
                value={row.price}
                onChange={(price) => update(row.key, { price })}
              />
            </div>

            <div className="space-y-1 sm:w-44">
              <span className="text-xs text-muted-foreground">Barcode (opsional)</span>
              <Input
                aria-label={`Barcode ${row.name}`}
                value={row.barcode}
                inputMode="numeric"
                placeholder="scan di sini"
                onChange={(e) => update(row.key, { barcode: e.target.value })}
                onBlur={() => checkBarcode(row)}
                onKeyDown={(e) => {
                  // A scanner types the code then presses Enter: check it,
                  // don't submit the form.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    checkBarcode({ ...row, barcode: e.currentTarget.value });
                  }
                }}
              />
            </div>

            {isReady && row.id && (
              <div className="space-y-1 sm:w-28">
                <span className="text-xs text-muted-foreground">Stok sekarang</span>
                <div className="flex h-9 items-center text-sm font-semibold">
                  {currentStock(row.id)} pcs
                </div>
              </div>
            )}

            {isReady && !row.id && (
              <div className="space-y-1 sm:w-24">
                <span className="text-xs text-muted-foreground">Stok awal</span>
                <Input
                  aria-label={`Stok awal ${row.name}`}
                  inputMode="numeric"
                  value={row.initialStock}
                  placeholder="0"
                  onChange={(e) => update(row.key, { initialStock: e.target.value.replace(/\D/g, "") })}
                />
              </div>
            )}
            {isReady && !row.id && isOwner && (
              <div className="space-y-1 sm:w-36">
                <span className="text-xs text-muted-foreground">Harga beli / pcs</span>
                <MoneyInput
                  ariaLabel={`Harga beli ${row.name}`}
                  value={row.initialCost}
                  placeholder="modal"
                  onChange={(initialCost) => update(row.key, { initialCost })}
                />
              </div>
            )}

            {taken[row.key] && (
              <p className="col-span-2 basis-full text-sm font-semibold text-destructive">
                Barcode ini sudah dipakai{" "}
                <a
                  href={`/admin/produk/${taken[row.key]!.productId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {taken[row.key]!.productName}
                  {taken[row.key]!.variantName ? ` (${taken[row.key]!.variantName})` : ""}
                </a>
                . Kalau barangnya sama, tambah stok/varian di produk itu saja supaya tidak dobel.
              </p>
            )}

            {hasOptions && rows.length > 1 && (
              <button
                type="button"
                aria-label={`Hapus varian ${row.name}`}
                title="Hapus varian"
                onClick={() => removeRow(row)}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl border bg-background text-lg font-bold hover:bg-secondary sm:top-auto sm:bottom-3"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {hasOptions && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows((rs) => [...rs, emptyRow(rs[rs.length - 1]?.price ?? "")])}
            >
              + Tambah varian
            </Button>
            {rows.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRows((rs) => rs.map((r) => ({ ...r, price: rs[0].price })))}
              >
                Samakan harga semua varian
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              aria-label="Tambah cepat varian"
              value={quickAdd}
              placeholder="Tambah cepat: S, M, L, XL"
              onChange={(e) => setQuickAdd(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addQuick();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addQuick}>
              Tambah
            </Button>
          </div>
        </div>
      )}

      {isReady && (showNewStockCols || rows.some((r) => r.id)) && (
        <p className="text-xs text-muted-foreground">
          {rows.some((r) => r.id)
            ? "Stok yang sudah ada ditambah/dikoreksi lewat bagian “Stok & Modal” di bawah form, supaya tercatat riwayatnya."
            : isOwner
              ? "Isi harga beli supaya modal rata-rata dan untungnya bisa dihitung."
              : "Harga beli (modal) diisi oleh owner."}
        </p>
      )}
    </div>
  );
}
