import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { SiteHeader } from "@/components/storefront/site-header";
import { ProductCard } from "@/components/storefront/product-card";
import { Button } from "@/components/ui/button";

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
    <div className="flex min-h-screen flex-col">
      <SiteHeader customer={customer} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-4 py-8">
        {ready.length === 0 && po.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
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
          <h2 className="text-lg font-semibold">{title}</h2>
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
            }}
          />
        ))}
      </div>
    </section>
  );
}
