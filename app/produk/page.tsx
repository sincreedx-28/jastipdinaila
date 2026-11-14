import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { TypeTabs, type ProductTypeFilter } from "@/components/storefront/type-tabs";

async function getAllProducts() {
  return prisma.product.findMany({
    where: { isActive: true },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
}

function parseType(raw: string | undefined): ProductTypeFilter {
  return raw === "READY" || raw === "PO" ? raw : null;
}

function chipHref(type: ProductTypeFilter, group: string | null, category: string | null) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (group) params.set("group", group);
  if (category) params.set("category", category);
  const qs = params.toString();
  return qs ? `/produk?${qs}` : "/produk";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; group?: string; category?: string }>;
}) {
  const { type: rawType, group: activeGroup, category: activeCategory } = await searchParams;
  const activeType = parseType(rawType);
  const allProducts = await getAllProducts();
  const customer = await getCurrentCustomer();

  const counts = {
    ready: allProducts.filter((p) => p.type === "READY").length,
    po: allProducts.filter((p) => p.type === "PO").length,
  };
  // Group/category chips only list what exists on the current shelf, so a
  // shopper on Pre-Order never taps into an empty category.
  const products = activeType ? allProducts.filter((p) => p.type === activeType) : allProducts;

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
  // Sold-out Ready items sink to the bottom instead of cluttering the top.
  filtered = [...filtered].sort(
    (a, b) =>
      Number(a.type === "READY" && (a.stockQty ?? 0) <= 0) -
      Number(b.type === "READY" && (b.stockQty ?? 0) <= 0)
  );
  if (activeCategory) filtered = filtered.filter((p) => p.category === activeCategory);
  else if (activeGroup) filtered = filtered.filter((p) => p.group === activeGroup);

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
        <h1 className="mb-4 font-heading text-2xl font-bold">
          {activeType === "READY" ? "Ready Stock" : activeType === "PO" ? "Pre-Order" : "All Products"}
        </h1>

        <div className="mb-4">
          <TypeTabs
            active={activeType}
            counts={counts}
            showAll
            hrefFor={(type) => chipHref(type, null, null)}
          />
        </div>
        {activeType === "PO" && (
          <p className="mb-4 max-w-2xl rounded-xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
            <b>Pre-Order:</b> order now, we buy it for you and ship once it arrives.
          </p>
        )}

        {groups.length > 0 && (
          <div className="mb-6 flex flex-col gap-3.5">
            <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              <Link
                href={chipHref(activeType, null, null)}
                className={`flex-none whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold ${
                  !activeGroup
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground"
                }`}
              >
                All
              </Link>
              {groups.map((g) => (
                <Link
                  key={g}
                  href={chipHref(activeType, g, null)}
                  className={`flex-none whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold ${
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
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0 sm:pl-1">
                {categoriesInActiveGroup.map((c) => (
                  <Link
                    key={c}
                    href={chipHref(activeType, activeGroup ?? null, c)}
                    className={`flex-none whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
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

        <ProductGrid products={filtered.map(toCard)} />
      </main>
      <SiteFooter />
    </div>
  );
}

function ProductGrid({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        No products in this category yet.
      </p>
    );
  }
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.slug} product={p} />
      ))}
    </div>
  );
}
