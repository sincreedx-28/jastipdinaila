import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { TypeTabs, type ProductTypeFilter } from "@/components/storefront/type-tabs";
import { PoEventHeader } from "@/components/storefront/po-event-header";
import { poEventSelect, shopVisible } from "@/lib/shop-visibility";
import { toEventInfo } from "@/lib/po-event-info";
import { eventState, type PoEventInfo } from "@/lib/po-event-state";

async function getAllProducts() {
  return prisma.product.findMany({
    where: shopVisible,
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      variants: { select: { price: true } },
      poEvent: { select: poEventSelect },
    },
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
  const [allProducts, customer] = await Promise.all([getAllProducts(), getCurrentCustomer()]);

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

  // Sold-out Ready items and closed / not-yet-open Pre-Orders.
  const unavailable = (p: (typeof products)[number]) =>
    p.type === "READY"
      ? (p.stockQty ?? 0) <= 0
      : Boolean(p.poEvent) && eventState(toEventInfo(p.poEvent!)) !== "open";
  let filtered = products;
  // Sold-out Ready items sink to the bottom instead of cluttering the top.
  filtered = [...filtered].sort(
    (a, b) =>
      Number(unavailable(a)) - Number(unavailable(b))
  );
  if (activeCategory) filtered = filtered.filter((p) => p.category === activeCategory);
  else if (activeGroup) filtered = filtered.filter((p) => p.group === activeGroup);

  const toCard = (p: (typeof products)[number]): ProductCardData => ({
    slug: p.slug,
    name: p.name,
    type: p.type,
    poState: p.type === "PO" && p.poEvent ? eventState(toEventInfo(p.poEvent)) : null,
    price: p.price,
    priceMax: Math.max(p.price, ...p.variants.map((v) => v.price)),
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

        {activeType === "PO" ? (
          <PoShelf products={filtered} toCard={toCard} />
        ) : (
          <ProductGrid products={filtered.map(toCard)} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

const STATE_RANK = { open: 0, soon: 1, closed: 2, archived: 3 } as const;

/** Pre-Order shelf: one section per PO Event (batch), open ones first. */
function PoShelf<P extends { poEvent: Parameters<typeof toEventInfo>[0] | null }>({
  products,
  toCard,
}: {
  products: P[];
  toCard: (p: P) => ProductCardData;
}) {
  if (products.length === 0) return <ProductGrid products={[]} />;
  const groups = new Map<string, { event: PoEventInfo | null; items: P[] }>();
  for (const p of products) {
    const ev = p.poEvent ? toEventInfo(p.poEvent) : null;
    const key = ev?.id ?? "_";
    if (!groups.has(key)) groups.set(key, { event: ev, items: [] });
    groups.get(key)!.items.push(p);
  }
  const list = [...groups.values()].sort((a, b) => {
    if (!a.event) return 1;
    if (!b.event) return -1;
    return (
      STATE_RANK[eventState(a.event)] - STATE_RANK[eventState(b.event)] ||
      (a.event.closeDate ?? "9999").localeCompare(b.event.closeDate ?? "9999")
    );
  });
  return (
    <div className="space-y-8">
      {list.length > 1 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {list.map((g) => (
            <a
              key={g.event?.id ?? "_"}
              href={`#batch-${g.event?.id ?? "lain"}`}
              className="flex-none whitespace-nowrap rounded-full border bg-card px-4 py-2 text-sm font-bold"
            >
              {g.event?.name ?? "Other Pre-Orders"}
            </a>
          ))}
        </div>
      )}
      {list.map((g) => (
        <section key={g.event?.id ?? "_"} id={`batch-${g.event?.id ?? "lain"}`} className="scroll-mt-24 space-y-1">
          {g.event ? (
            <PoEventHeader event={g.event} />
          ) : (
            <div className="rounded-2xl border bg-secondary px-4 py-3.5">
              <h2 className="font-heading text-lg font-bold">Other Pre-Orders</h2>
              <p className="text-sm text-muted-foreground">Ask the admin for the closing date.</p>
            </div>
          )}
          <ProductGrid products={g.items.map(toCard)} />
        </section>
      ))}
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
