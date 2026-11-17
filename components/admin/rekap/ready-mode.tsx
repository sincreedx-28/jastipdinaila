"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addReadySale, deleteReadySale } from "@/lib/actions/rekap";
import { rp } from "@/lib/rekap";
import { cleanBarcode } from "@/lib/barcode";
import { toast } from "sonner";
import { BuyerPicker } from "./buyer-picker";
import { Empty, Stepper, useRekapAction, useStoredChoice, type Buyer } from "./shared";

const READY_TABS = ["catat", "riwayat"] as const;
import type { RekapData, SaleRow } from "./rekap-app";

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Jakarta",
  });
const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const monthLabel = (ym: string) =>
  new Date(`${ym}-01T12:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

function SaleItem({ s, buyer }: { s: SaleRow; buyer?: Buyer }) {
  const [confirm, setConfirm] = useState(false);
  const { pending, run } = useRekapAction();
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
      <div className="min-w-0 flex-1 basis-48">
        <b>{buyer?.name ?? "?"}</b> · {s.productName}
        {s.variantName ? ` (${s.variantName})` : ""} <span className="text-muted-foreground">x{s.qty}</span>
        <div className="text-xs text-muted-foreground">
          {timeLabel(s.createdAt)} · {rp(s.price)}/pcs
        </div>
      </div>
      <b>{rp(s.price * s.qty)}</b>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        className={confirm ? "text-destructive!" : ""}
        onBlur={() => setConfirm(false)}
        onClick={() => {
          if (!confirm) return setConfirm(true);
          run(() => deleteReadySale(s.id), { success: "Penjualan dihapus, stok dikembalikan" });
        }}
      >
        {confirm ? "Yakin hapus?" : "Hapus"}
      </Button>
    </li>
  );
}

/**
 * Ready Stock during live: pick the buyer, the item and quantity; the stock
 * goes down immediately so the web shop never oversells it.
 */
export function ReadyMode({ data, buyersById }: { data: RekapData; buyersById: Map<string, Buyer> }) {
  const router = useRouter();
  const [tab, switchTab] = useStoredChoice("rekap-ready-tab", "catat", READY_TABS);
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState("");
  const [q, setQ] = useState("");
  const [scan, setScan] = useState("");
  const { pending, run } = useRekapAction();


  const products = useMemo(
    () =>
      [...data.readyProducts].sort(
        (a, b) =>
          Number(b.variants.some((v) => v.stockQty > 0)) - Number(a.variants.some((v) => v.stockQty > 0)) ||
          (a.group ?? "").localeCompare(b.group ?? "") ||
          a.name.localeCompare(b.name, "id", { numeric: true })
      ),
    [data.readyProducts]
  );
  const product = products.find((p) => p.id === productId);
  const named = product?.variants.filter((v) => v.name) ?? [];
  const variant = product?.variants.find((v) => v.id === variantId) ?? (named.length ? undefined : product?.variants[0]);
  const stock = variant?.stockQty ?? 0;

  const pickProduct = (id: string) => {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    const first = p?.variants.find((v) => v.stockQty > 0) ?? p?.variants[0];
    setVariantId(p && p.variants.filter((v) => v.name).length ? (first?.id ?? "") : (p?.variants[0]?.id ?? ""));
    setQty(1);
    setPrice("");
  };

  // Scanner types the barcode + Enter: select that product and variant.
  const onScan = (raw: string) => {
    const code = cleanBarcode(raw);
    setScan("");
    if (!code) return;
    for (const p of products) {
      const v = p.variants.find((x) => x.barcode === code);
      if (!v) continue;
      setProductId(p.id);
      setVariantId(v.id);
      setQty(1);
      setPrice("");
      if (v.stockQty <= 0) toast.error(`${p.name}${v.name ? ` (${v.name})` : ""} stoknya habis.`);
      return;
    }
    toast.error(`Barcode ${code} belum terdaftar di barang Ready Stock.`);
  };

  const save = () => {
    if (!buyer) return run(async () => ({ ok: false as const, error: "Pilih customer dulu." }));
    if (!variant) return run(async () => ({ ok: false as const, error: "Pilih barang dan variannya." }));
    const p = price === "" ? variant.price : Number(price);
    run(() => addReadySale({ buyerId: buyer.id, variantId: variant.id, qty, price: p }), {
      success: `Tersimpan: ${buyer.name} · ${product?.name}${variant.name ? ` (${variant.name})` : ""} x${qty}`,
      onOk: () => {
        setQty(1);
        setPrice("");
      },
    });
  };

  const tabs = (
    <div className="flex gap-2">
      {(
        [
          ["catat", "Catat penjualan"],
          ["riwayat", "Riwayat"],
        ] as const
      ).map(([k, l]) => (
        <button key={k} type="button" className="pill" data-active={tab === k} onClick={() => switchTab(k)}>
          {l}
        </button>
      ))}
    </div>
  );

  if (tab === "riwayat") {
    const query = q.trim().toLowerCase();
    const list = data.sales.filter(
      (s) =>
        !query ||
        [buyersById.get(s.buyerId)?.name, buyersById.get(s.buyerId)?.phone, s.productName, s.variantName]
          .join(" ")
          .toLowerCase()
          .includes(query)
    );
    const days = new Map<string, SaleRow[]>();
    for (const s of list) {
      const k = dayLabel(s.createdAt);
      days.set(k, [...(days.get(k) ?? []), s]);
    }
    const total = list.reduce((a, s) => a + s.price * s.qty, 0);
    return (
      <div className="space-y-3">
        {tabs}
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Bulan"
            value={data.month}
            onChange={(e) => router.push(`/admin/rekap?mode=ready&bulan=${e.target.value}`)}
            className="h-11 rounded-xl border bg-background px-3 text-base font-semibold"
          >
            {data.months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari pembeli / barang"
            className="min-w-48 flex-1"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {list.length} penjualan · total <b className="text-foreground">{rp(total)}</b>
        </p>
        {days.size === 0 ? (
          <Empty>Belum ada penjualan di bulan ini.</Empty>
        ) : (
          [...days.entries()].map(([day, sales]) => (
            <section key={day} className="space-y-1.5">
              <div className="flex justify-between px-1 text-sm font-semibold">
                <span>{day}</span>
                <span className="text-muted-foreground">
                  {sales.length} penjualan · {rp(sales.reduce((a, s) => a + s.price * s.qty, 0))}
                </span>
              </div>
              <ul className="box divide-y">
                {sales.map((s) => (
                  <SaleItem key={s.id} s={s} buyer={buyersById.get(s.buyerId)} />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    );
  }

  const recent = data.sales.slice(0, 15);

  return (
    <div className="space-y-4">
      {tabs}
      <form
        className="box space-y-4 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="space-y-1.5">
          <span className="text-sm font-semibold">Customer</span>
          <BuyerPicker buyers={data.buyers} value={buyer} onChange={setBuyer} />
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">Scan barcode</span>
          <Input
            value={scan}
            inputMode="numeric"
            placeholder="arahkan scanner ke sini"
            aria-label="Scan barcode"
            onChange={(e) => setScan(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onScan(e.currentTarget.value);
              }
            }}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">Barang</span>
          <select
            value={productId}
            onChange={(e) => pickProduct(e.target.value)}
            className="h-11 w-full rounded-xl border bg-background px-3 text-base"
            aria-label="Barang ready stock"
          >
            <option value="">Pilih barang ready stock…</option>
            {products.map((p) => {
              const total = p.variants.reduce((a, v) => a + v.stockQty, 0);
              return (
                <option key={p.id} value={p.id} disabled={total <= 0}>
                  {p.name} {total > 0 ? `(stok ${total})` : "(habis)"}
                  {!p.isActive ? " · disembunyikan" : ""}
                </option>
              );
            })}
          </select>
        </label>

        {named.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-sm font-semibold">Varian</span>
            <div className="flex flex-wrap gap-2">
              {named.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  disabled={v.stockQty <= 0}
                  onClick={() => {
                    setVariantId(v.id);
                    setQty((n) => Math.min(n, Math.max(1, v.stockQty)));
                    setPrice("");
                  }}
                  className="pill disabled:opacity-40"
                  data-active={variantId === v.id}
                >
                  {v.name}
                  <span className="text-xs opacity-80">({v.stockQty})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {variant && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <span className="text-sm font-semibold">Jumlah</span>
              <Stepper
                value={qty}
                label="jumlah"
                sub={`sisa ${stock}`}
                onChange={(d) => setQty((n) => Math.min(Math.max(1, stock), Math.max(1, n + d)))}
              />
            </div>
            <label className="block flex-1 space-y-1.5">
              <span className="text-sm font-semibold">Harga satuan</span>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  Rp
                </span>
                <Input
                  inputMode="numeric"
                  className="pl-9"
                  value={price === "" ? "" : Number(price).toLocaleString("id-ID")}
                  onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
                  placeholder={variant.price.toLocaleString("id-ID")}
                  aria-label="Harga satuan"
                />
              </div>
            </label>
          </div>
        )}
        {variant && (
          <p className="text-sm text-muted-foreground">
            Total {rp((price === "" ? variant.price : Number(price)) * qty)} · stok langsung berkurang
            dan ikut berkurang di web.
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending || !variant || stock <= 0}>
          {pending ? "Menyimpan..." : "Simpan penjualan"}
        </Button>
      </form>

      <section className="space-y-2">
        <h3 className="text-lg">Penjualan terakhir</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada penjualan ready stock yang dicatat bulan ini.</p>
        ) : (
          <ul className="box divide-y">
            {recent.map((s) => (
              <SaleItem key={s.id} s={s} buyer={buyersById.get(s.buyerId)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
