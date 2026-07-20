import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { SiteHeader } from "@/components/storefront/site-header";
import { ProductCard } from "@/components/storefront/product-card";
import { RecommendationCarousel } from "@/components/storefront/recommendation-carousel";
import { Button } from "@/components/ui/button";

async function getHomeProducts() {
  const [ready, po, all] = await Promise.all([
    prisma.product.findMany({
      where: { type: "READY", isActive: true },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.product.findMany({
      where: { type: "PO", isActive: true },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.product.findMany({
      where: { isActive: true },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);
  return { ready, po, all };
}

export default async function Home() {
  const { ready, po, all } = await getHomeProducts();
  const customer = await getCurrentCustomer();
  const groups = [...new Set(all.map((p) => p.group).filter((g): g is string => Boolean(g)))];

  return (
    <div className="theme-shop flex min-h-screen flex-col">
      <div className="overflow-hidden whitespace-nowrap bg-foreground py-2.5 text-white">
        <div className="marquee-track inline-block pl-full text-[13px] font-bold tracking-wide">
          Selamat datang di Jastipdinaila — titip beli tepercaya, kualitas terjaga &nbsp;•&nbsp;
          Cek produk Ready Stock &amp; Pre-Order kami &nbsp;•&nbsp;
        </div>
      </div>

      <SiteHeader customer={customer} />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-14">
          <h1 className="font-heading text-4xl font-bold text-white sm:text-5xl">
            Your Personal Shopper
          </h1>
        </section>

        {groups.length > 0 && (
          <section className="mx-auto w-full max-w-5xl px-4 pb-2">
            <div className="flex flex-wrap justify-center gap-3">
              {groups.map((g) => (
                <Link
                  key={g}
                  href={`/produk?group=${encodeURIComponent(g)}`}
                  className="rounded-full border bg-card px-4.5 py-2.5 text-sm font-bold text-foreground"
                >
                  {g}
                </Link>
              ))}
            </div>
          </section>
        )}

        {all.length > 0 && (
          <section className="mx-auto w-full max-w-5xl px-4 pb-2 pt-8">
            <RecommendationCarousel
              items={all.map((p) => ({ slug: p.slug, name: p.name, category: p.category }))}
            />
          </section>
        )}

        {(ready.length > 0 || po.length > 0) && (
          <section className="mx-auto w-full max-w-5xl space-y-10 px-4 py-10">
            {ready.length > 0 && (
              <ProductSection
                title="Ready Stock"
                subtitle="Barang sudah tersedia, langsung dikirim"
                products={ready}
              />
            )}
            {po.length > 0 && (
              <ProductSection
                title="Pre-Order"
                subtitle="Dipesan dulu, diproses sebelum dikirim"
                products={po}
              />
            )}
          </section>
        )}

        {ready.length === 0 && po.length === 0 && (
          <p className="mx-auto w-full max-w-5xl px-4 py-16 text-center text-white">
            Belum ada produk tersedia saat ini.
          </p>
        )}

        <section className="mt-2 bg-background px-4 py-12">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-10">
            <div className="stripes aspect-[4/3] min-w-[220px] flex-1 basis-[260px] rounded-2xl">
              foto pemilik usaha
            </div>
            <div className="min-w-[280px] flex-[2] basis-[400px]">
              <h2 className="mb-3 font-heading text-2xl font-bold sm:text-3xl">
                From heart, For Every Women, For Every Part of You!
              </h2>
              <p className="mb-5 max-w-xl text-base leading-relaxed text-muted-foreground">
                Kami percaya tiap perempuan berhak dapat yang terbaik, dari ujung kepala
                sampai ujung kaki. Kami hadirkan produk yang kamu butuhkan, dengan harga
                yang bersahabat, dan keaslian yang terjamin.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <span className="rounded-full bg-card px-3.5 py-2 text-[13px] font-bold text-foreground">
                  ✓ 100% Original
                </span>
                <span className="rounded-full bg-card px-3.5 py-2 text-[13px] font-bold text-foreground">
                  ✓ Affordable
                </span>
                <span className="rounded-full bg-card px-3.5 py-2 text-[13px] font-bold text-foreground">
                  ✓ Kemasan Aman
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function ProductSection({
  title,
  subtitle,
  products,
}: {
  title: string;
  subtitle: string;
  products: Awaited<ReturnType<typeof getHomeProducts>>["ready"];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-heading text-lg font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button variant="outline" size="sm" render={<Link href="/produk">Lihat Semua</Link>} />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {products.map((p) => (
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
    </div>
  );
}
