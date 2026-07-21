import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { PromoBanner } from "@/components/storefront/promo-banner";
import { SiteHeader } from "@/components/storefront/site-header";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PRODUCT_CATEGORIES, categoryLabel, subcategoriesFor } from "@/lib/product-taxonomy";
import type { ProductCategory } from "@/lib/generated/prisma/enums";

async function getProducts(category?: string) {
  return prisma.product.findMany({
    where: {
      isActive: true,
      ...(category ? { category: category as ProductCategory } : {}),
    },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sub?: string }>;
}) {
  const { category, sub } = await searchParams;
  const rawProducts = await getProducts(category);
  const products = sub ? rawProducts.filter((p) => p.subcategory === sub) : rawProducts;
  const customer = await getCurrentCustomer();
  const ready = products.filter((p) => p.type === "READY");
  const po = products.filter((p) => p.type === "PO");

  const toCard = (p: (typeof products)[number]): ProductCardData => ({
    slug: p.slug,
    name: p.name,
    type: p.type,
    price: p.price,
    stockQty: p.stockQty,
    imageUrl: p.images[0]?.url ?? null,
    category: p.category,
  });

  const subcats = category ? subcategoriesFor(category) : [];

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--brand-cream)" }}>
      <PromoBanner />
      <SiteHeader customer={customer} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="mb-4 text-xl font-bold" style={{ color: "var(--brand-ink)" }}>
          {category ? categoryLabel(category) : "Semua Produk"}
        </h1>

        <div className="mb-4 flex flex-wrap gap-2">
          <Link
            href="/produk"
            className="rounded-full border px-4 py-2 text-sm font-bold"
            style={{
              background: !category ? "var(--brand-accent)" : "var(--brand-chip-bg)",
              color: !category ? "white" : "var(--brand-ink)",
              borderColor: "var(--brand-chip-border)",
            }}
          >
            Semua
          </Link>
          {PRODUCT_CATEGORIES.map((c) => (
            <Link
              key={c.value}
              href={`/produk?category=${c.value}`}
              className="rounded-full border px-4 py-2 text-sm font-bold"
              style={{
                background: category === c.value ? "var(--brand-accent)" : "var(--brand-chip-bg)",
                color: category === c.value ? "white" : "var(--brand-ink)",
                borderColor: "var(--brand-chip-border)",
              }}
            >
              {c.label}
            </Link>
          ))}
        </div>

        {subcats.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2 pl-1">
            {subcats.map((s) => (
              <Link
                key={s}
                href={`/produk?category=${category}&sub=${encodeURIComponent(s)}`}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: sub === s ? "var(--brand-accent)" : "white",
                  color: sub === s ? "white" : "var(--brand-ink)",
                  borderColor: "var(--brand-chip-border)",
                }}
              >
                {s}
              </Link>
            ))}
          </div>
        )}

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger value="ready">Ready Stock</TabsTrigger>
            <TabsTrigger value="po">Pre-Order</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <ProductGrid products={products.map(toCard)} />
          </TabsContent>
          <TabsContent value="ready">
            <ProductGrid products={ready.map(toCard)} />
          </TabsContent>
          <TabsContent value="po">
            <ProductGrid products={po.map(toCard)} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function ProductGrid({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) {
    return (
      <p className="py-12 text-center text-[var(--brand-muted)]">Belum ada produk di kategori ini.</p>
    );
  }
  return (
    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.slug} product={p} />
      ))}
    </div>
  );
}
