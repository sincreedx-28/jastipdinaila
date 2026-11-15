import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { duplicateProduct } from "@/lib/actions/products";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { VisibilityToggle } from "@/components/admin/visibility-toggle";
import { CategorySelect } from "@/components/admin/category-select";
import { ProductPlaceholder } from "@/components/storefront/product-placeholder";
import { formatPriceRange } from "@/lib/variant-types";

type Search = { q?: string; tipe?: string; status?: string; stok?: string; grup?: string };

const NO_GROUP = "Belum dikategorikan";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";

  const where: Prisma.ProductWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { group: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
    ];
  }
  if (sp.grup) where.group = sp.grup === NO_GROUP ? null : sp.grup;
  if (sp.tipe === "READY" || sp.tipe === "PO") where.type = sp.tipe;
  if (sp.status === "sembunyi") where.isActive = false;
  if (sp.stok === "menipis") {
    where.type = "READY";
    where.variants = { some: { stockQty: { lte: 3 } } };
  }

  const [products, totalCount, allGroups] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        variants: {
          select: { name: true, price: true, stockQty: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ group: "asc" }, { category: "asc" }, { name: "asc" }],
    }),
    prisma.product.count(),
    prisma.product.findMany({ select: { group: true }, distinct: ["group"] }),
  ]);

  const groups = new Map<string, typeof products>();
  for (const p of products) {
    const g = p.group?.trim() || NO_GROUP;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(p);
  }
  const byName = (a: string, b: string) =>
    a === NO_GROUP ? 1 : b === NO_GROUP ? -1 : a.localeCompare(b, "id");
  const groupNames = [...groups.keys()].sort(byName);
  const groupOptions = [...new Set(allGroups.map((g) => g.group?.trim() || NO_GROUP))].sort(
    byName
  );

  const filtered = Boolean(q || sp.tipe || sp.status || sp.stok || sp.grup);
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
          <Input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Cari produk di semua kategori"
            className="rounded-full!"
          />
        </form>
        <Button render={<Link href="/admin/produk/baru">+ Produk baru</Link>} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <CategorySelect options={groupOptions} value={sp.grup ?? ""} hrefFor={groupHrefs} />
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

      <p className="text-sm text-muted-foreground">
        {products.length} dari {totalCount} produk · {groupNames.length} kategori
        {filtered && (
          <>
            {" · "}
            <Link href="/admin/produk" className="font-semibold text-primary hover:underline">
              hapus filter
            </Link>
          </>
        )}
      </p>

      {products.length === 0 && (
        <p className="box p-8 text-center text-muted-foreground">
          {filtered ? "Tidak ada produk yang cocok." : "Belum ada produk."}
        </p>
      )}

      {groupNames.map((g) => {
        const list = groups.get(g)!;
        const poCount = list.filter((p) => p.type === "PO").length;
        return (
          <details key={g} open className="box group/box px-4">
            <summary className="flex cursor-pointer list-none items-center gap-3 py-4 [&::-webkit-details-marker]:hidden">
              <span className="font-heading text-lg">{g}</span>
              <span className="ml-auto text-sm text-muted-foreground">
                {list.length} produk{poCount > 0 && ` · ${poCount} PO`}
              </span>
              <svg
                aria-hidden
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="transition-transform group-open/box:rotate-180"
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
                      {p.images[0] ? (
                        <Image
                          src={p.images[0].url}
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
            {g !== NO_GROUP && (
              <Link
                href={`/admin/produk/baru?grup=${encodeURIComponent(g)}`}
                className="block border-t py-3 text-sm font-bold text-primary hover:underline"
              >
                + Tambah produk di {g}
              </Link>
            )}
          </details>
        );
      })}
    </div>
  );
}
