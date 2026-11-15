import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { duplicateProduct, toggleProductActive } from "@/lib/actions/products";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { formatPriceRange } from "@/lib/variant-types";

type Search = { q?: string; tipe?: string; status?: string; stok?: string };

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
  if (sp.tipe === "READY" || sp.tipe === "PO") where.type = sp.tipe;
  if (sp.status === "aktif") where.isActive = true;
  if (sp.status === "nonaktif") where.isActive = false;
  if (sp.stok === "habis") {
    where.type = "READY";
    where.stockQty = { lte: 0 };
  }
  if (sp.stok === "menipis") {
    where.type = "READY";
    where.variants = { some: { stockQty: { lte: 3 } } };
  }

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        variants: { select: { name: true, price: true, stockQty: true }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: [{ group: "asc" }, { category: "asc" }, { name: "asc" }],
    }),
    prisma.product.count(),
  ]);

  // Group → category → products, groups in alphabetical order with the
  // uncategorized bucket last.
  const groups = new Map<string, Map<string, typeof products>>();
  for (const p of products) {
    const g = p.group?.trim() || NO_GROUP;
    const c = p.category?.trim() || "";
    if (!groups.has(g)) groups.set(g, new Map());
    const cats = groups.get(g)!;
    if (!cats.has(c)) cats.set(c, []);
    cats.get(c)!.push(p);
  }
  const groupNames = [...groups.keys()].sort((a, b) =>
    a === NO_GROUP ? 1 : b === NO_GROUP ? -1 : a.localeCompare(b, "id")
  );

  const filtered = Boolean(q || sp.tipe || sp.status || sp.stok);
  const hrefWith = (patch: Partial<Search>) => {
    const next = { ...sp, ...patch };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
    const s = params.toString();
    return `/admin/produk${s ? `?${s}` : ""}`;
  };

  const chip = (label: string, active: boolean, href: string) => (
    <Link
      key={label}
      href={href}
      className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${
        active ? "border-primary bg-primary text-primary-foreground" : "bg-background"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Produk</h1>
        <Button render={<Link href="/admin/produk/baru">+ Tambah Produk</Link>} />
      </div>

      <form className="flex gap-2" action="/admin/produk">
        {sp.tipe && <input type="hidden" name="tipe" value={sp.tipe} />}
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        {sp.stok && <input type="hidden" name="stok" value={sp.stok} />}
        <Input name="q" defaultValue={q} placeholder="Cari nama / grup / kategori" />
        <Button type="submit" variant="outline">
          Cari
        </Button>
      </form>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {chip("Semua tipe", !sp.tipe, hrefWith({ tipe: undefined }))}
        {chip("Ready", sp.tipe === "READY", hrefWith({ tipe: "READY" }))}
        {chip("PO", sp.tipe === "PO", hrefWith({ tipe: "PO" }))}
        <span className="mx-1 border-l" />
        {chip("Aktif", sp.status === "aktif", hrefWith({ status: sp.status === "aktif" ? undefined : "aktif" }))}
        {chip("Nonaktif", sp.status === "nonaktif", hrefWith({ status: sp.status === "nonaktif" ? undefined : "nonaktif" }))}
        <span className="mx-1 border-l" />
        {chip("Stok habis", sp.stok === "habis", hrefWith({ stok: sp.stok === "habis" ? undefined : "habis" }))}
        {chip("Stok menipis", sp.stok === "menipis", hrefWith({ stok: sp.stok === "menipis" ? undefined : "menipis" }))}
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered ? `${products.length} dari ${totalCount} produk` : `${totalCount} produk`}
        {filtered && (
          <>
            {" · "}
            <Link href="/admin/produk" className="underline">
              hapus filter
            </Link>
          </>
        )}
      </p>

      {groupNames.length > 1 && (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {groupNames.map((g) => {
            const count = [...groups.get(g)!.values()].reduce((s, l) => s + l.length, 0);
            return (
              <a
                key={g}
                href={`#grup-${encodeURIComponent(g)}`}
                className="whitespace-nowrap rounded-md bg-muted px-2.5 py-1 text-xs"
              >
                {g} <span className="text-muted-foreground">({count})</span>
              </a>
            );
          })}
        </div>
      )}

      {products.length === 0 && (
        <p className="rounded-lg border p-6 text-center text-muted-foreground">
          {filtered ? "Tidak ada produk yang cocok." : "Belum ada produk."}
        </p>
      )}

      {groupNames.map((g) => {
        const cats = groups.get(g)!;
        const count = [...cats.values()].reduce((s, l) => s + l.length, 0);
        return (
          <details
            key={g}
            id={`grup-${encodeURIComponent(g)}`}
            open
            className="scroll-mt-4 rounded-lg border"
          >
            <summary className="cursor-pointer select-none bg-muted/50 px-4 py-2.5 font-semibold">
              {g} <span className="font-normal text-muted-foreground">· {count} produk</span>
            </summary>
            {[...cats.keys()].sort((a, b) => a.localeCompare(b, "id")).map((c) => (
              <div key={c || "_"}>
                {c && (
                  <div className="border-t px-4 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {c}
                  </div>
                )}
                <ul className="divide-y">
                  {cats.get(c)!.map((p) => {
                    const prices = p.variants.map((v) => v.price);
                    const min = prices.length ? Math.min(...prices) : p.price;
                    const max = prices.length ? Math.max(...prices) : p.price;
                    const named = p.variants.filter((v) => v.name);
                    const stock = p.stockQty ?? 0;
                    const lowVariants = named.filter((v) => (v.stockQty ?? 0) <= 0);
                    return (
                      <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        {p.images[0] ? (
                          <Image
                            src={p.images[0].url}
                            alt={p.name}
                            width={44}
                            height={44}
                            className="h-11 w-11 rounded object-cover"
                          />
                        ) : (
                          <div className="h-11 w-11 rounded bg-muted" />
                        )}
                        <div className="min-w-0 flex-1 basis-40">
                          <Link
                            href={`/admin/produk/${p.id}`}
                            className="line-clamp-2 font-medium hover:underline"
                          >
                            {p.name}
                          </Link>
                          <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                            <Badge variant={p.type === "READY" ? "default" : "secondary"}>
                              {p.type === "READY" ? "Ready" : "PO"}
                            </Badge>
                            <span>{formatPriceRange(min, max)}</span>
                            {named.length > 0 && <span>· {named.length} varian</span>}
                            {p.type === "READY" && (
                              <span
                                className={
                                  stock <= 0
                                    ? "font-semibold text-destructive"
                                    : stock <= 3
                                      ? "font-semibold text-amber-600"
                                      : ""
                                }
                              >
                                · stok {stock}
                                {named.length > 0 && lowVariants.length > 0 && stock > 0 &&
                                  ` (${lowVariants.length} varian habis)`}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Own row on phones so the name keeps its width. */}
                        <div className="flex basis-full flex-wrap items-center gap-1.5 pl-14 sm:basis-auto sm:pl-0">
                          <form
                            action={async () => {
                              "use server";
                              await toggleProductActive(p.id, !p.isActive);
                            }}
                          >
                            <Button type="submit" variant="ghost" size="sm">
                              <Badge variant={p.isActive ? "default" : "outline"}>
                                {p.isActive ? "Aktif" : "Nonaktif"}
                              </Badge>
                            </Button>
                          </form>
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
              </div>
            ))}
          </details>
        );
      })}
    </div>
  );
}
