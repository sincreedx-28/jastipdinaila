import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { PromoBanner } from "@/components/storefront/promo-banner";
import { SiteHeader } from "@/components/storefront/site-header";
import { ProductCard } from "@/components/storefront/product-card";
import { Button } from "@/components/ui/button";
import { PRODUCT_CATEGORIES } from "@/lib/product-taxonomy";

async function getHomeProducts() {
  const [ready, po] = await Promise.all([
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
  ]);
  return { ready, po };
}

export default async function Home() {
  const { ready, po } = await getHomeProducts();
  const customer = await getCurrentCustomer();

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--brand-cream)" }}>
      <PromoBanner />
      <SiteHeader customer={customer} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-4 py-8">
        <section
          className="rounded-2xl p-8 text-center sm:text-left"
          style={{ background: "var(--brand-pink)" }}
        >
          <h1 className="text-2xl font-bold sm:text-3xl" style={{ color: "var(--brand-ink)" }}>
            Rawat kulitmu (dan gayamu), titip ke jastipdinaila
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--brand-ink)" }}>
            Skincare, fashion, dan hijab pilihan — original, aman, harga bersahabat.
          </p>
        </section>

        <section className="flex flex-wrap justify-center gap-3 sm:justify-start">
          {PRODUCT_CATEGORIES.map((c) => (
            <Link
              key={c.value}
              href={`/produk?category=${c.value}`}
              className="rounded-full border px-4 py-2 text-sm font-bold"
              style={{
                background: "var(--brand-chip-bg)",
                borderColor: "var(--brand-chip-border)",
                color: "var(--brand-ink)",
              }}
            >
              {c.label}
            </Link>
          ))}
        </section>

        {ready.length === 0 && po.length === 0 ? (
          <p className="py-16 text-center text-[var(--brand-muted)]">
            Belum ada produk tersedia saat ini.
          </p>
        ) : (
          <>
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
          </>
        )}
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
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--brand-ink)" }}>
            {title}
          </h2>
          <p className="text-sm text-[var(--brand-muted)]">{subtitle}</p>
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
            }}
          />
        ))}
      </div>
    </section>
  );
}
