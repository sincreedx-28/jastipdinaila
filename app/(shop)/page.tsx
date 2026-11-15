import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { ProductCard } from "@/components/storefront/product-card";
import { HeroBanners } from "@/components/storefront/hero-banners";
import { TypeTabs } from "@/components/storefront/type-tabs";
import { autoBanners, getBanners } from "@/lib/banners";

async function getHomeProducts() {
  const [featured, groupSource, readyCount, poCount, banners] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      variants: { select: { price: true } },
    },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: { group: true },
    }),
    prisma.product.count({ where: { isActive: true, type: "READY" } }),
    prisma.product.count({ where: { isActive: true, type: "PO" } }),
    getBanners(),
  ]);
  return { featured, groupSource, readyCount, poCount, banners };
}

export default async function Home() {
  const [{ featured, groupSource, readyCount, poCount, banners }, customer] = await Promise.all([
    getHomeProducts(),
    getCurrentCustomer(),
  ]);
  const counts = { ready: readyCount, po: poCount };
  const activeBanners = banners.filter((b) => b.active);
  const shownBanners = activeBanners.length > 0 ? activeBanners : autoBanners(counts);
  const groups = [
    ...new Set(groupSource.map((p) => p.group).filter((g): g is string => Boolean(g))),
  ];

  return (
    <div className="theme-shop flex min-h-screen flex-col">
      <div className="overflow-hidden whitespace-nowrap bg-primary py-2 text-primary-foreground">
        <div className="marquee-track inline-block pl-[100%] text-[13px] font-bold tracking-wide">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i}>
              Welcome to Jastipdinaila — trusted shopping, guaranteed quality
              &nbsp;•&nbsp; Check out our Ready Stock &amp; Pre-Order products &nbsp;•&nbsp;{" "}
            </span>
          ))}
        </div>
      </div>

      <SiteHeader customer={customer} />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-4 pt-4 sm:pt-6">
          <h1 className="sr-only">Jastipdinaila — Your Personal Shopper</h1>
          <HeroBanners banners={shownBanners} />
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 pt-5">
          <TypeTabs
            active={null}
            counts={counts}
            hrefFor={(type) => (type ? `/produk?type=${type}` : "/produk")}
          />
        </section>

        {groups.length > 0 && (
          <section className="mx-auto w-full max-w-5xl px-4 py-5">
            <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              {groups.map((g) => (
                <Link
                  key={g}
                  href={`/produk?group=${encodeURIComponent(g)}`}
                  className="flex-none whitespace-nowrap rounded-full border border-border bg-card px-4.5 py-2.5 text-sm font-bold text-foreground"
                >
                  {g}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto w-full max-w-5xl px-4 pb-10">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="font-heading text-2xl font-bold">New Arrivals</h2>
            <Link href="/produk" className="text-sm font-bold text-primary">
              See all →
            </Link>
          </div>
          {featured.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 md:grid-cols-4">
              {featured.map((p) => (
                <ProductCard
                  key={p.slug}
                  product={{
                    slug: p.slug,
                    name: p.name,
                    type: p.type,
                    price: p.price,
                    priceMax: Math.max(p.price, ...p.variants.map((v) => v.price)),
                    stockQty: p.stockQty,
                    imageUrl: p.images[0]?.url ?? null,
                    category: p.category,
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No products available right now.</p>
          )}
        </section>

        <section className="mt-2 bg-secondary px-4 py-12">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-10">
            <div className="stripes aspect-[4/3] min-w-[220px] flex-1 basis-[260px] rounded-2xl">
              owner photo
            </div>
            <div className="min-w-[280px] flex-[2] basis-[400px]">
              <h2 className="mb-3 font-heading text-2xl font-bold sm:text-3xl">
                From heart, For Every Women, For Every Part of You!
              </h2>
              <p className="mb-5 max-w-xl text-base leading-relaxed text-muted-foreground">
                We believe every woman deserves the best, from head to toe. We bring you
                the products you need, at prices you&apos;ll love, with guaranteed
                authenticity.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <span className="rounded-full bg-card px-3.5 py-2 text-[13px] font-bold text-foreground">
                  ✓ 100% Original
                </span>
                <span className="rounded-full bg-card px-3.5 py-2 text-[13px] font-bold text-foreground">
                  ✓ Affordable
                </span>
                <span className="rounded-full bg-card px-3.5 py-2 text-[13px] font-bold text-foreground">
                  ✓ Secure Packaging
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
