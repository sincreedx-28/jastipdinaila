import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { duplicateProduct, mergeCategorySpellings } from "@/lib/actions/products";
import { getCategoryOptions } from "@/lib/category-options";
import { catKey } from "@/lib/category";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { VisibilityToggle } from "@/components/admin/visibility-toggle";
import { CategorySelect } from "@/components/admin/category-select";
import { ProductPlaceholder } from "@/components/storefront/product-placeholder";
import { expMonth, fmtExp, formatPriceRange, monthsLeft } from "@/lib/variant-types";
import { cleanBarcode, isBarcode, looksScanned } from "@/lib/barcode";
import { UnknownBarcode } from "@/components/admin/unknown-barcode";
import { SearchBox } from "@/components/admin/search-box";
import { poEventSelect } from "@/lib/shop-visibility";
import { toEventInfo } from "@/lib/po-event-info";
import { eventState } from "@/lib/po-event-state";

type Search = {
  q?: string;
  tipe?: string;
  status?: string;
  stok?: string;
  grup?: string;
  /** PO Event id, or "none" for PO without a batch. */
  batch?: string;
  /** "batch" groups the list per PO Event instead of per category. */
  kelompok?: string;
};

const NO_GROUP = "Belum dikategorikan";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";

  const where: Prisma.ProductWhereInput = {};
  const scanned = q ? cleanBarcode(q) : "";
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { group: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
      // A scanner types the barcode into this same search box.
      ...(isBarcode(scanned) ? [{ variants: { some: { barcode: scanned } } }] : []),
    ];
  }
  if (sp.grup) where.group = sp.grup === NO_GROUP ? null : sp.grup;
  if (sp.batch) {
    where.type = "PO";
    where.poEventId = sp.batch === "none" ? null : sp.batch;
  }
  if (sp.tipe === "READY" || sp.tipe === "PO") where.type = sp.tipe;
  if (sp.status === "sembunyi") where.isActive = false;
  if (sp.stok === "menipis") {
    where.type = "READY";
    where.variants = { some: { stockQty: { lte: 3 } } };
  }

  const [products, totalCount, allGroups, events, catOptions] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        poEvent: { select: { name: true } },
        variants: {
          select: { name: true, price: true, stockQty: true, barcode: true, imageUrl: true, expDate: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ group: "asc" }, { category: "asc" }, { name: "asc" }],
    }),
    prisma.product.count(),
    prisma.product.findMany({ select: { group: true }, distinct: ["group"] }),
    prisma.poEvent.findMany({ select: poEventSelect, orderBy: { createdAt: "desc" } }),
    getCategoryOptions(),
  ]);
  const eventInfos = events.map(toEventInfo);
  const byBatch = sp.kelompok === "batch" || (sp.kelompok !== "kategori" && (sp.tipe === "PO" || Boolean(sp.batch)));

  type Section = { key: string; title: string; sub?: string; addHref?: string; items: typeof products };
  const sections: Section[] = [];
  const byName = (a: string, b: string) =>
    a === NO_GROUP ? 1 : b === NO_GROUP ? -1 : a.localeCompare(b, "id");
  if (byBatch) {
    // Per PO Event: open/soon/closed first, archived last, then PO without a
    // batch, then Ready Stock.
    const rank = { open: 0, soon: 1, closed: 2, archived: 3 } as const;
    const evs = [...eventInfos].sort((a, b) => rank[eventState(a)] - rank[eventState(b)]);
    for (const e of evs) {
      const items = products.filter((p) => p.type === "PO" && p.poEventId === e.id);
      if (!items.length && (sp.batch !== e.id)) continue;
      const st = eventState(e);
      sections.push({
        key: e.id,
        title: e.name,
        sub: { open: "order dibuka", soon: "belum dibuka", closed: "order ditutup", archived: "diarsipkan" }[st],
        addHref: `/admin/produk/baru?batch=${e.id}`,
        items,
      });
    }
    const loose = products.filter((p) => p.type === "PO" && !p.poEventId);
    if (loose.length) sections.push({ key: "po-none", title: "PO tanpa batch", items: loose });
    const ready = products.filter((p) => p.type === "READY");
    if (ready.length) sections.push({ key: "ready", title: "Ready Stock", items: ready });
  } else {
    const groups = new Map<string, typeof products>();
    for (const p of products) {
      const g = p.group?.trim() || NO_GROUP;
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(p);
    }
    for (const g of [...groups.keys()].sort(byName)) {
      sections.push({
        key: g,
        title: g,
        addHref: g !== NO_GROUP ? `/admin/produk/baru?grup=${encodeURIComponent(g)}` : undefined,
        items: groups.get(g)!,
      });
    }
  }
  const groupNames = sections.map((x) => x.key);
  const groupOptions = [...new Set(allGroups.map((g) => g.group?.trim() || NO_GROUP))].sort(
    byName
  );

  const filtered = Boolean(q || sp.tipe || sp.status || sp.stok || sp.grup || sp.batch);
  const hrefWith = (patch: Partial<Search>) => {
    const next = { ...sp, ...patch };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
    const s = params.toString();
    return `/admin/produk${s ? `?${s}` : ""}`;
  };
  const groupHrefs = Object.fromEntries(
    ["", ...groupOptions].map((g) => [g, hrefWith({ grup: g || undefined })])
  );

  const chip = (label: string, active: boolean, href: string) => (
    <Link key={label} href={href} className="pill" data-active={active}>
      {label}
    </Link>
  );
  const allShelves = !sp.tipe && !sp.status && !sp.stok;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <form className="flex min-w-60 flex-1" action="/admin/produk">
          {Object.entries(sp)
            .filter(([k, v]) => k !== "q" && v)
            .map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
          <SearchBox defaultValue={q} />
        </form>
        <Button render={<Link href="/admin/produk/baru">+ Produk baru</Link>} />
      </div>

      {(() => {
        const twins = [
          ...catOptions.groups.filter((o) => o.others.length).map((o) => ({ field: "group" as const, o })),
          ...catOptions.categories.filter((o) => o.others.length).map((o) => ({ field: "category" as const, o })),
        ];
        if (!twins.length) return null;
        return (
          <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-bold">Ada kategori yang tertulis dobel</p>
            <ul className="mt-1.5 space-y-1.5">
              {twins.map(({ field, o }) => (
                <li key={field + o.value} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>
                    {field === "group" ? "Kategori" : "Sub-kategori"} “{o.others.join("”, “")}” → “
                    <b>{o.value}</b>”
                  </span>
                  <form action={mergeCategorySpellings.bind(null, field, catKey(o.value))}>
                    <Button type="submit" size="sm" variant="outline">
                      Gabungkan
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      <div className="flex flex-wrap items-center gap-2">
        <CategorySelect options={groupOptions} value={sp.grup ?? ""} hrefFor={groupHrefs} />
        {eventInfos.length > 0 && (
          <CategorySelect
            label="Batch PO"
            allLabel="Semua batch PO"
            options={[...eventInfos.map((e) => e.id), "none"]}
            optionLabels={Object.fromEntries([
              ...eventInfos.map((e) => [e.id, e.archived ? `${e.name} (arsip)` : e.name]),
              ["none", "PO tanpa batch"],
            ])}
            value={sp.batch ?? ""}
            hrefFor={Object.fromEntries(
              ["", ...eventInfos.map((e) => e.id), "none"].map((b) => [b, hrefWith({ batch: b || undefined })])
            )}
          />
        )}
        {chip(
          "Semua",
          allShelves,
          hrefWith({ tipe: undefined, status: undefined, stok: undefined })
        )}
        {chip("Ready", sp.tipe === "READY", hrefWith({ tipe: sp.tipe === "READY" ? undefined : "READY" }))}
        {chip("PO", sp.tipe === "PO", hrefWith({ tipe: sp.tipe === "PO" ? undefined : "PO" }))}
        {chip(
          "Disembunyikan",
          sp.status === "sembunyi",
          hrefWith({ status: sp.status === "sembunyi" ? undefined : "sembunyi" })
        )}
        {chip(
          "Stok menipis",
          sp.stok === "menipis",
          hrefWith({ stok: sp.stok === "menipis" ? undefined : "menipis" })
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Kelompokkan:</span>
        <Link
          href={hrefWith({ kelompok: "kategori" })}
          className="pill min-h-8! px-3! text-xs!"
          data-active={!byBatch}
        >
          Per kategori
        </Link>
        <Link
          href={hrefWith({ kelompok: "batch" })}
          className="pill min-h-8! px-3! text-xs!"
          data-active={byBatch}
        >
          Per batch PO
        </Link>
      </div>

      <p className="text-sm text-muted-foreground">
        {products.length} dari {totalCount} produk · {groupNames.length}{" "}
        {byBatch ? "kelompok" : "kategori"}
        {filtered && (
          <>
            {" · "}
            <Link href="/admin/produk" className="font-semibold text-primary hover:underline">
              hapus filter
            </Link>
          </>
        )}
      </p>

      {(() => {
        const hit = isBarcode(scanned)
          ? products.flatMap((p) => p.variants.filter((v) => v.barcode === scanned).map((v) => ({ p, v })))[0]
          : undefined;
        return hit ? (
          <p className="soft-note">
            Barcode <b>{scanned}</b> = <b>{hit.p.name}</b>
            {hit.v.name ? ` (${hit.v.name})` : ""}
            {hit.p.type === "READY" && ` · stok ${hit.v.stockQty ?? 0}`} ·{" "}
            <Link href={`/admin/produk/${hit.p.id}`} className="font-bold underline">
              Buka produk
            </Link>
          </p>
        ) : null;
      })()}
      {products.length === 0 && looksScanned(q) ? (
        <UnknownBarcode
          code={scanned}
          products={await prisma.product.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          })}
        />
      ) : (
        products.length === 0 && (
          <p className="box p-8 text-center text-muted-foreground">
            {filtered ? "Tidak ada produk yang cocok." : "Belum ada produk."}
          </p>
        )
      )}

      {sections.map((sec) => {
        const list = sec.items;
        const poCount = list.filter((p) => p.type === "PO").length;
        return (
          // Archived batches start folded so the active ones stay in view.
          <details key={sec.key} open={sec.sub !== "diarsipkan"} className="box group/box px-4">
            <summary className="flex cursor-pointer list-none items-center gap-3 py-4 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0">
                <span className="font-heading text-lg">{sec.title}</span>
                {sec.sub && <span className="block text-xs text-muted-foreground">{sec.sub}</span>}
              </span>
              <span className="ml-auto shrink-0 text-sm text-muted-foreground">
                {list.length} produk{!byBatch && poCount > 0 && ` · ${poCount} PO`}
              </span>
              <svg
                aria-hidden
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="shrink-0 transition-transform group-open/box:rotate-180"
              >
                <path d="M6 15l6-6 6 6" />
              </svg>
            </summary>
            <ul className="divide-y border-t">
              {list.map((p) => {
                const prices = p.variants.map((v) => v.price);
                const min = prices.length ? Math.min(...prices) : p.price;
                const max = prices.length ? Math.max(...prices) : p.price;
                const named = p.variants.filter((v) => v.name);
                const stock = p.stockQty ?? 0;
                const outVariants = named.filter((v) => (v.stockQty ?? 0) <= 0).length;
                return (
                  <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                    <div className="relative h-13 w-13 shrink-0 overflow-hidden rounded-xl">
                      {(p.images[0]?.url ?? p.variants.find((v) => v.imageUrl)?.imageUrl) ? (
                        <Image
                          src={(p.images[0]?.url ?? p.variants.find((v) => v.imageUrl)?.imageUrl)!}
                          alt={p.name}
                          fill
                          sizes="52px"
                          className="object-cover"
                        />
                      ) : (
                        <ProductPlaceholder name={p.name} size="sm" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 basis-40">
                      <Link
                        href={`/admin/produk/${p.id}`}
                        className="line-clamp-2 font-bold hover:underline"
                      >
                        {p.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {p.type === "READY" ? "Ready" : "PO"}
                        {p.poEvent && !byBatch && ` · ${p.poEvent.name}`}
                        {p.category && ` · ${p.category}`}
                        {p.type === "READY" && (
                          <span
                            className={
                              stock <= 0
                                ? "font-bold text-destructive"
                                : stock <= 3
                                  ? "font-bold text-amber-700"
                                  : ""
                            }
                          >
                            {" · "}stok {stock}
                          </span>
                        )}
                        {" · "}
                        {formatPriceRange(min, max)}
                        {named.length > 0 && ` · ${named.length} varian`}
                        {p.type === "READY" && stock > 0 && outVariants > 0 && (
                          <span className="text-amber-700"> ({outVariants} habis)</span>
                        )}
                        {(() => {
                          // Earliest expiry among variants still on the shelf.
                          const exps = p.variants
                            .filter((v) => p.type !== "READY" || (v.stockQty ?? 0) > 0)
                            .map((v) => expMonth(v.expDate))
                            .filter((x): x is string => Boolean(x))
                            .sort();
                          if (!exps.length) return null;
                          const left = monthsLeft(exps[0]);
                          return (
                            <span
                              className={
                                left < 0 ? "font-bold text-destructive" : left <= 3 ? "font-bold text-amber-700" : ""
                              }
                            >
                              {" · "}ED {fmtExp(exps[0])}
                              {left < 0 ? " (lewat)" : left <= 3 ? " (segera)" : ""}
                            </span>
                          );
                        })()}
                      </p>
                    </div>
                    {/* Own row on phones so the name keeps its width. */}
                    <div className="flex basis-full flex-wrap items-center gap-1.5 sm:basis-auto">
                      <VisibilityToggle productId={p.id} isActive={p.isActive} />
                      <Button
                        variant="outline"
                        size="sm"
                        render={<Link href={`/admin/produk/${p.id}`}>Edit</Link>}
                      />
                      <form action={duplicateProduct.bind(null, p.id)}>
                        <Button type="submit" variant="outline" size="sm">
                          Duplikat
                        </Button>
                      </form>
                      <DeleteProductButton productId={p.id} productName={p.name} />
                    </div>
                  </li>
                );
              })}
            </ul>
            {sec.addHref && (
              <Link
                href={sec.addHref}
                className="block border-t py-3 text-sm font-bold text-primary hover:underline"
              >
                + Tambah produk di {sec.title}
              </Link>
            )}
          </details>
        );
      })}
    </div>
  );
}
