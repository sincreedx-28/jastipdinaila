"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addPoOrder, changePoOrderQty, deletePoOrder } from "@/lib/actions/rekap";
import { itemKey, productItemKey, rp, tidy, type ItemRow } from "@/lib/rekap";
import { ItemPicker, Thumb, type PickedItem } from "./item-picker";
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
  const [item, setItem] = useState<PickedItem | null>(null);
  const [variant, setVariant] = useState("");
  const [otherVariant, setOtherVariant] = useState(false);
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  // Bumped after each save to give the item field a fresh, empty start.
  const [pickerKey, setPickerKey] = useState(0);
  const itemRef = useRef<HTMLInputElement>(null);
  const { pending, run } = useRekapAction();

  const itemsById = useMemo(() => new Map(data.items.map((i) => [i.id, i])), [data.items]);
  const byKey = useMemo(() => new Map(rows.map((r) => [r.key, r])), [rows]);

  const key = item
    ? item.productId
      ? productItemKey(item.productId, variant)
      : itemKey(item.name, variant)
    : "";
  const existing = key ? byKey.get(key) : undefined;
  const catalogPrice = item
    ? (item.variants.find((v) => v.name.toLowerCase() === tidy(variant).toLowerCase())?.price ?? item.price)
    : 0;
  const suggested = existing && existing.price > 0 ? existing.price : catalogPrice;
  const hint = !item
    ? ""
    : existing
      ? `Sudah ada di rekap: ${existing.need} pcs dipesan${existing.price ? ` · harga ${rp(existing.price)}` : ""}`
      : catalogPrice
        ? `Harga dari katalog ${rp(catalogPrice)}, kosongkan kolom harga untuk memakainya`
        : "Barang baru di PO Event ini";

  const pickItem = (v: PickedItem | null) => {
    setItem(v);
    setVariant("");
    setOtherVariant(false);
    setPrice("");
  };

  const save = () => {
    if (!buyer) return run(async () => ({ ok: false as const, error: "Pilih customer dulu." }));
    if (!item) return run(async () => ({ ok: false as const, error: "Pilih atau ketik barang dulu." }));
    if (item.variants.length && !otherVariant && !variant)
      return run(async () => ({ ok: false as const, error: "Pilih variannya dulu." }));
    const p = Number(price.replace(/\D/g, "")) || suggested || 0;
    run(
      () =>
        addPoOrder({
          eventId: data.eventId!,
          buyerId: buyer.id,
          productId: item.productId,
          name: item.name,
          variant,
          qty,
          price: p,
        }),
      {
        success: `Tersimpan: ${buyer.name} · ${item.name}${variant ? ` (${tidy(variant)})` : ""} x${qty}`,
        onOk: () => {
          pickItem(null);
          setPickerKey((k) => k + 1);
          setQty(1);
          setTimeout(() => itemRef.current?.focus());
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
              if (b && !item) setTimeout(() => itemRef.current?.focus());
            }}
          />
        </div>

        <div className="space-y-1.5">
          <span className="text-sm font-semibold">Barang</span>
          <ItemPicker
            key={pickerKey}
            catalog={data.catalog}
            items={data.items}
            value={item}
            onChange={pickItem}
            inputRef={itemRef}
          />
        </div>

        {item && (
          <div className="space-y-1.5">
            <span className="text-sm font-semibold">
              Varian{item.variants.length ? "" : " (opsional)"}
            </span>
            {item.variants.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.variants.map((v) => (
                  <button
                    key={v.name}
                    type="button"
                    className="pill"
                    data-active={!otherVariant && variant === v.name}
                    onClick={() => {
                      setOtherVariant(false);
                      setVariant(v.name);
                    }}
                  >
                    {v.name}
                  </button>
                ))}
                <button
                  type="button"
                  className="pill"
                  data-active={otherVariant}
                  onClick={() => {
                    setOtherVariant(true);
                    setVariant("");
                  }}
                >
                  Lainnya…
                </button>
              </div>
            )}
            {(item.variants.length === 0 || otherVariant) && (
              <Input
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                placeholder="Size / shade / warna"
                aria-label="Varian"
              />
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <span className="text-sm font-semibold">Jumlah</span>
          <Stepper value={qty} label="jumlah" onChange={(d) => setQty((q) => Math.max(1, q + d))} />
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
                  <Thumb src={it?.image} name={it?.name ?? "?"} />
                  <div className="min-w-0 flex-1 basis-40">
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
