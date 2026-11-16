"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addPoOrder,
  changePoOrderQty,
  deletePoOrder,
  publishItemToCatalog,
  uploadItemPhoto,
} from "@/lib/actions/rekap";
import { compressImage } from "@/lib/compress-image";
import { itemKey, productItemKey, rp, tidy, type ItemRow } from "@/lib/rekap";
import { ItemPicker, Thumb, type PickedItem } from "./item-picker";
import { PasteOrder } from "./paste-order";
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
  // For hand-typed items: a photo to attach and whether to publish it.
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [publish, setPublish] = useState(false);
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

  const setPhotoFile = (f: File | null) => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhoto(f);
    setPhotoUrl(f ? URL.createObjectURL(f) : null);
  };

  const pickItem = (v: PickedItem | null) => {
    setItem(v);
    setVariant("");
    setOtherVariant(false);
    setPrice("");
    setPhotoFile(null);
    setPublish(false);
  };

  const save = () => {
    if (!buyer) return run(async () => ({ ok: false as const, error: "Pilih customer dulu." }));
    if (!item) return run(async () => ({ ok: false as const, error: "Pilih atau ketik barang dulu." }));
    if (item.variants.length && !otherVariant && !variant)
      return run(async () => ({ ok: false as const, error: "Pilih variannya dulu." }));
    const p = Number(price.replace(/\D/g, "")) || suggested || 0;
    if (publish && !p) {
      return run(async () => ({
        ok: false as const,
        error: "Isi harga satuan dulu supaya bisa tampil di katalog PO.",
      }));
    }
    const label = `${buyer.name} · ${item.name}${variant ? ` (${tidy(variant)})` : ""} x${qty}`;
    run(
      async () => {
        const r = await addPoOrder({
          eventId: data.eventId!,
          buyerId: buyer.id,
          productId: item.productId,
          name: item.name,
          variant,
          qty,
          price: p,
        });
        if (!r.ok || item.productId) return r;
        if (photo) {
          const fd = new FormData();
          fd.set("image", photo);
          const u = await uploadItemPhoto(r.itemId, fd);
          if (!u.ok) return { ok: false as const, error: `Order tersimpan, tapi foto gagal: ${u.error}` };
        }
        if (publish) {
          const pub = await publishItemToCatalog(r.itemId);
          if (!pub.ok)
            return { ok: false as const, error: `Order tersimpan, tapi belum tampil di katalog: ${pub.error}` };
        }
        return r;
      },
      {
        success: `Tersimpan: ${label}${publish ? " · tampil di katalog PO" : ""}`,
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

        {item && !item.productId && (
          <div className="space-y-3 rounded-xl bg-secondary/60 p-3">
            <div className="flex items-center gap-3">
              <Thumb src={photoUrl ?? item.image} name={item.name} size={56} />
              <label className="cursor-pointer">
                <span className="inline-flex min-h-10 items-center rounded-xl border bg-background px-3 text-sm font-bold text-secondary-foreground">
                  {photoUrl || item.image ? "Ganti foto" : "+ Tambah foto"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-label="Foto barang"
                  onChange={async (e) => {
                    const f = e.currentTarget.files?.[0];
                    e.currentTarget.value = "";
                    if (f) setPhotoFile(await compressImage(f));
                  }}
                />
              </label>
              {photoUrl && (
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline"
                  onClick={() => setPhotoFile(null)}
                >
                  hapus
                </button>
              )}
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 shrink-0"
                checked={publish}
                onChange={(e) => setPublish(e.target.checked)}
              />
              <span>
                <b>Tampilkan di katalog PO</b> (toko)
                <span className="block text-muted-foreground">
                  Barang ini jadi produk Pre-Order batch ini (pakai foto ini dan harga satuan),
                  supaya pembeli lain bisa ikut order dari web.
                </span>
              </span>
            </label>
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

      <PasteOrder
        eventId={data.eventId!}
        eventName={data.events.find((e) => e.id === data.eventId)?.name ?? ""}
        buyers={data.buyers}
        catalog={data.catalog}
      />

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
