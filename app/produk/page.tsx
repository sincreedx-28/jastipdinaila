import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { SiteHeader } from "@/components/storefront/site-header";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

async function getAllProducts() {
  return prisma.product.findMany({
    where: { isActive: true },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
}

function chipHref(group: string | null, category: string | null) {
  const params = new URLSearchParams();
  if (group) params.set("group", group);
  if (category) params.set("category", category);
  const qs = params.toString();
  return qs ? `/produk?${qs}` : "/produk";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; category?: string }>;
}) {
  const { group: activeGroup, category: activeCategory } = await searchParams;
  const products = await getAllProducts();
  const customer = await getCurrentCustomer();

  const groups = [...new Set(products.map((p) => p.group).filter((g): g is string => Boolean(g)))];
  const categoriesInActiveGroup = activeGroup
    ? [
        ...new Set(
          products
            .filter((p) => p.group === activeGroup)
            .map((p) => p.category)
            .filter((c): c is string => Boolean(c))
        ),
      ]
    : [];

  let filtered = products;
  if (activeCategory) filtered = filtered.filter((p) => p.category === activeCategory);
  else if (activeGroup) filtered = filtered.filter((p) => p.group === activeGroup);

  const ready = filtered.filter((p) => p.type === "READY");
  const po = filtered.filter((p) => p.type === "PO");

  const toCard = (p: (typeof products)[number]) => ({
    slug: p.slug,
    name: p.name,
    type: p.type,
    price: p.price,
    stockQty: p.stockQty,
    imageUrl: p.images[0]?.url ?? null,
    category: p.category,
  });

  return (
    <div className="theme-shop flex min-h-screen flex-col">
      <SiteHeader customer={customer} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="mb-5 font-heading text-2xl font-bold">Semua Produk</h1>

        {groups.length > 0 && (
          <div className="mb-6 flex flex-col gap-3.5">
            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/produk"
                className={`rounded-full border px-4 py-2 text-sm font-bold ${
                  !activeGroup
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground"
                }`}
              >
                Semua
              </Link>
              {groups.map((g) => (
                <Link
                  key={g}
                  href={chipHref(g, null)}
                  className={`rounded-full border px-4 py-2 text-sm font-bold ${
                    activeGroup === g && !activeCategory
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  {g}
                </Link>
              ))}
            </div>
            {categoriesInActiveGroup.length > 0 && (
              <div className="flex flex-wrap gap-2 pl-1">
                {categoriesInActiveGroup.map((c) => (
                  <Link
                    key={c}
                    href={chipHref(activeGroup ?? null, c)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                      activeCategory === c
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground"
                    }`}
                  >
                    {c}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger value="ready">Ready Stock</TabsTrigger>
            <TabsTrigger value="po">Pre-Order</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <ProductGrid products={filtered.map(toCard)} />
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
      <p className="py-12 text-center text-muted-foreground">
        Belum ada produk di kategori ini.
      </p>
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
