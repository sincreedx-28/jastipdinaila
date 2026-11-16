"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addPoOrder, changePoOrderQty, deletePoOrder } from "@/lib/actions/rekap";
import { itemKey, rp, tidy, type ItemRow } from "@/lib/rekap";
import { BuyerPicker } from "./buyer-picker";
import { Stepper, useRekapAction, type Buyer } from "./shared";
import type { RekapData } from "./rekap-app";

const time = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });

/**
 * "Catat order": pick the customer once, then type item after item. The
 * customer stays selected so a buyer's whole list goes in quickly.
 */
export function PoCatat({
  data,
  buyersById,
  rows,
}: {
  data: RekapData;
  buyersById: Map<string, Buyer>;
  rows: ItemRow[];
}) {
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [name, setName] = useState("");
  const [variant, setVariant] = useState("");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const { pending, run } = useRekapAction();

  const itemsById = useMemo(() => new Map(data.items.map((i) => [i.id, i])), [data.items]);
  const byKey = useMemo(() => new Map(rows.map((r) => [r.key, r])), [rows]);

  // Suggestions: items already in this event first, then catalog products.
  const nameOptions = useMemo(
    () => [...new Set([...data.items.map((i) => i.name), ...data.catalog.map((p) => p.name)])],
    [data.items, data.catalog]
  );
  const product = data.catalog.find((p) => p.name.toLowerCase() === tidy(name).toLowerCase());
  const variantOptions = useMemo(() => {
    const k = itemKey(name, "").split("|")[0];
    return [
      ...new Set([
        ...(product?.variants.map((v) => v.name) ?? []),
        ...data.items.filter((i) => i.key.split("|")[0] === k && i.variant).map((i) => i.variant),
      ]),
    ];
  }, [name, product, data.items]);

  const existing = name.trim() ? byKey.get(itemKey(name, variant)) : undefined;
  const webPrice = product
    ? (product.variants.find((v) => v.name.toLowerCase() === tidy(variant).toLowerCase())?.price ??
      product.price)
    : 0;
  const suggested = existing && existing.price > 0 ? existing.price : webPrice;
  const hint = !name.trim()
    ? ""
    : existing
      ? `Sudah ada di rekap: ${existing.need} pcs dipesan${existing.price ? ` · harga ${rp(existing.price)}` : ""}`
      : webPrice
        ? `Harga dari web ${rp(webPrice)}, kosongkan kolom harga untuk memakainya`
        : "Barang baru di PO Event ini";

  const save = () => {
    if (!buyer) return run(async () => ({ ok: false as const, error: "Pilih customer dulu." }));
    if (!name.trim()) return run(async () => ({ ok: false as const, error: "Isi nama barang." }));
    const p = Number(price.replace(/\D/g, "")) || suggested || 0;
    run(
      () => addPoOrder({ eventId: data.eventId!, buyerId: buyer.id, name, variant, qty, price: p }),
      {
        success: `Tersimpan: ${buyer.name} · ${tidy(name)}${variant ? ` (${tidy(variant)})` : ""} x${qty}`,
        onOk: () => {
          setName("");
          setVariant("");
          setQty(1);
          setPrice("");
          nameRef.current?.focus();
        },
      }
    );
  };

  const recent = [...data.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12);

  return (
    <div className="space-y-5">
      <form
        className="box space-y-4 p-4"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="space-y-1.5">
          <span className="text-sm font-semibold">Customer</span>
          <BuyerPicker
            buyers={data.buyers}
            value={buyer}
            onChange={(b) => {
              setBuyer(b);
              if (b) setTimeout(() => nameRef.current?.focus());
            }}
          />
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">Barang</span>
          <Input
            ref={nameRef}
            list="rekap-names"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ketik atau pilih barang"
          />
          <datalist id="rekap-names">
            {nameOptions.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </label>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Varian (opsional)</span>
            <Input
              list="rekap-variants"
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              placeholder="Size / shade / warna"
            />
            <datalist id="rekap-variants">
              {variantOptions.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </label>
          <div className="space-y-1.5">
            <span className="text-sm font-semibold">Jumlah</span>
            <Stepper value={qty} label="jumlah" onChange={(d) => setQty((q) => Math.max(1, q + d))} />
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">Harga satuan</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              Rp
            </span>
            <Input
              inputMode="numeric"
              className="pl-9"
              value={price ? Number(price).toLocaleString("id-ID") : ""}
              onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
              placeholder={suggested ? suggested.toLocaleString("id-ID") : "boleh diisi nanti"}
            />
          </div>
          {hint && <span className="block text-sm text-muted-foreground">{hint}</span>}
        </label>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan order"}
        </Button>
      </form>

      <section className="space-y-2">
        <h3 className="text-lg">Order terakhir</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada order di PO Event ini.</p>
        ) : (
          <ul className="box divide-y">
            {recent.map((o) => {
              const it = itemsById.get(o.itemId);
              return (
                <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                  <div className="min-w-0 flex-1 basis-48">
                    <b>{buyersById.get(o.buyerId)?.name ?? "?"}</b>
                    {" · "}
                    {it?.name}
                    {it?.variant ? ` (${it.variant})` : ""}
                    <div className="text-xs text-muted-foreground">{time(o.createdAt)}</div>
                  </div>
                  <Stepper
                    value={o.qty}
                    label={`jumlah ${it?.name ?? ""}`}
                    disabled={pending}
                    onChange={(d) => run(() => changePoOrderQty(o.id, d))}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={confirmDel === o.id ? "text-destructive!" : ""}
                    onClick={() => {
                      if (confirmDel !== o.id) return setConfirmDel(o.id);
                      setConfirmDel(null);
                      run(() => deletePoOrder(o.id), { success: "Order dihapus" });
                    }}
                    onBlur={() => setConfirmDel((c) => (c === o.id ? null : c))}
                  >
                    {confirmDel === o.id ? "Yakin hapus?" : "Hapus"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
