import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { ProductCard } from "@/components/storefront/product-card";
import { RecommendationCarousel } from "@/components/storefront/recommendation-carousel";

async function getHomeProducts() {
  const [featured, groupSource] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: { group: true },
    }),
  ]);
  return { featured, groupSource };
}

export default async function Home() {
  const { featured, groupSource } = await getHomeProducts();
  const customer = await getCurrentCustomer();
  const groups = [
    ...new Set(groupSource.map((p) => p.group).filter((g): g is string => Boolean(g))),
  ];

  return (
    <div className="theme-shop flex min-h-screen flex-col">
      <div className="overflow-hidden whitespace-nowrap bg-foreground py-2.5 text-white">
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
        <section className="mx-auto w-full max-w-5xl px-4 pb-2 pt-10 sm:pt-14">
          <h1 className="mb-4.5 font-heading text-4xl font-bold text-white sm:text-5xl">
            Your Personal Shopper
          </h1>
          {featured.length > 0 && (
            <RecommendationCarousel
              items={featured.map((p) => ({
                slug: p.slug,
                name: p.name,
                category: p.category,
                imageUrl: p.images[0]?.url ?? null,
              }))}
            />
          )}
        </section>

        {groups.length > 0 && (
          <section className="mx-auto w-full max-w-5xl px-4 py-8">
            <div className="flex flex-wrap justify-center gap-3">
              {groups.map((g) => (
                <Link
                  key={g}
                  href={`/produk?group=${encodeURIComponent(g)}`}
                  className="rounded-full border border-border bg-card px-4.5 py-2.5 text-sm font-bold text-foreground"
                >
                  {g}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto w-full max-w-5xl px-4 pb-10">
          <h2 className="mb-6 font-heading text-2xl font-bold">Featured Products</h2>
          {featured.length > 0 ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
              {featured.map((p) => (
                <ProductCard
                  key={p.slug}
                  product={{
                    slug: p.slug,
                    name: p.name,
                    type: p.type,
                    price: p.price,
                    stockQty: p.stockQty,
                    imageUrl: p.images[0]?.url ?? null,
                    category: p.category,
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-white">No products available right now.</p>
          )}
        </section>

        <section className="mt-2 bg-background px-4 py-12">
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
