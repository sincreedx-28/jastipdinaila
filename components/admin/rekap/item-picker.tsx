"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductPlaceholder } from "@/components/storefront/product-placeholder";
import { rp, tidy, type RekapItem } from "@/lib/rekap";
import type { CatalogEntry } from "./rekap-app";

/** What was picked: a catalog product, or a name typed by hand. */
export type PickedItem = {
  name: string;
  productId: string | null;
  image: string | null;
  variants: { name: string; price: number }[];
  price: number;
};

export function Thumb({ src, name, size = 40 }: { src?: string | null; name: string; size?: number }) {
  return (
    <span
      className="relative block shrink-0 overflow-hidden rounded-lg"
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <ProductPlaceholder name={name} size="sm" />
      )}
    </span>
  );
}

type Option = PickedItem & { key: string; group: "batch" | "dicatat" | "lain"; sub: string };

const GROUP_LABEL = {
  batch: "PO di batch ini",
  dicatat: "Sudah dicatat di batch ini",
  lain: "Produk lain di toko",
};

/**
 * "Barang" field: type 2 letters to see this batch's products (with photo)
 * and items already recorded in it; or add a new name by hand. Picking an
 * existing option keeps every buyer's order of it on one SKU.
 */
export function ItemPicker({
  catalog,
  items,
  value,
  onChange,
  inputRef,
}: {
  catalog: CatalogEntry[];
  items: RekapItem[];
  value: PickedItem | null;
  onChange: (v: PickedItem | null) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ownRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? ownRef;

  const options = useMemo(() => {
    const query = tidy(q).toLowerCase();
    const has = (s: string) => s.toLowerCase().includes(query);
    const out: Option[] = [];
    const seen = new Set<string>();

    const fromProduct = (p: CatalogEntry, group: Option["group"]): Option => ({
      key: `p:${p.id}`,
      group,
      name: p.name,
      productId: p.id,
      image: p.image,
      variants: p.variants,
      price: p.price,
      sub: `${p.type === "READY" ? "Ready · " : ""}${p.price ? rp(p.price) : "harga belum ada"}${
        p.variants.length ? ` · ${p.variants.length} varian` : ""
      }`,
    });

    // 1. This batch's products — shown even before typing.
    for (const p of catalog.filter((c) => c.inEvent && (!query || has(c.name)))) {
      out.push(fromProduct(p, "batch"));
      seen.add(`p:${p.id}`);
    }
    if (query.length < 2) return out.slice(0, 12);

    // 2. Hand-typed items already in this batch (one option per name).
    const typed = new Map<string, RekapItem[]>();
    for (const it of items) {
      if (it.productId || !has(it.name)) continue;
      const k = it.name.toLowerCase();
      typed.set(k, [...(typed.get(k) ?? []), it]);
    }
    for (const list of typed.values()) {
      const first = list[0];
      out.push({
        key: `n:${first.name.toLowerCase()}`,
        group: "dicatat",
        name: first.name,
        productId: null,
        image: list.find((i) => i.image)?.image ?? null,
        variants: list.filter((i) => i.variant).map((i) => ({ name: i.variant, price: i.price })),
        price: first.price,
        sub: `dicatat manual${first.price ? ` · ${rp(first.price)}` : ""}`,
      });
    }

    // 3. Anything else in the catalog (bought outside the plan).
    for (const p of catalog.filter((c) => !seen.has(`p:${c.id}`) && has(c.name)).slice(0, 6)) {
      out.push(fromProduct(p, "lain"));
    }
    return out;
  }, [catalog, items, q]);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-primary bg-secondary/50 p-2 pr-3">
        <Thumb src={value.image} name={value.name} size={48} />
        <div className="min-w-0 flex-1">
          <b className="block truncate">{value.name}</b>
          <span className="text-sm text-muted-foreground">
            {value.productId ? "dari katalog" : "barang manual"}
            {value.price ? ` · ${rp(value.price)}` : ""}
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            onChange(null);
            setQ("");
            setOpen(true);
            setTimeout(() => ref.current?.focus());
          }}
        >
          Ganti
        </Button>
      </div>
    );
  }

  const exact = options.some((o) => o.name.toLowerCase() === tidy(q).toLowerCase());
  const pickManual = () =>
    onChange({ name: tidy(q), productId: null, image: null, variants: [], price: 0 });

  return (
    <div className="space-y-1.5">
      <Input
        ref={ref}
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          if (options[0] && tidy(q).length >= 2) onChange(options[0]);
          else if (tidy(q)) pickManual();
        }}
        placeholder="Ketik 2 huruf nama barang"
        autoComplete="off"
        aria-label="Cari barang"
      />
      {open && (options.length > 0 || tidy(q).length >= 2) && (
        <div className="max-h-96 overflow-auto rounded-xl border">
          {(["batch", "dicatat", "lain"] as const).map((g) => {
            const list = options.filter((o) => o.group === g);
            if (!list.length) return null;
            return (
              <div key={g}>
                <p className="bg-secondary/60 px-3 py-1 text-xs font-bold text-secondary-foreground">
                  {GROUP_LABEL[g]}
                </p>
                {list.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => onChange(o)}
                    className="flex w-full items-center gap-3 border-b px-3 py-2 text-left last:border-b-0 hover:bg-secondary"
                  >
                    <Thumb src={o.image} name={o.name} />
                    <span className="min-w-0">
                      <b className="block truncate">{o.name}</b>
                      <span className="text-sm text-muted-foreground">{o.sub}</span>
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
          {tidy(q).length >= 2 && !exact && (
            <button
              type="button"
              onClick={pickManual}
              className="w-full px-3 py-2.5 text-left font-bold text-primary hover:bg-secondary"
            >
              + Tambah manual “{tidy(q)}”
            </button>
          )}
        </div>
      )}
      {!open && (
        <p className="px-1 text-sm text-muted-foreground">
          Produk PO batch ini muncul di sini. Barang lain bisa ditambah manual.
        </p>
      )}
    </div>
  );
}
