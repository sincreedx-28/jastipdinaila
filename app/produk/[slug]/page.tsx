import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { PromoBanner } from "@/components/storefront/promo-banner";
import { SiteHeader } from "@/components/storefront/site-header";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { Badge } from "@/components/ui/badge";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug, isActive: true },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });

  if (!product) notFound();

  const customer = await getCurrentCustomer();
  const soldOut = product.type === "READY" && (product.stockQty ?? 0) <= 0;
  const mainImage = product.images[0]?.url ?? null;

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--brand-cream)" }}>
      <PromoBanner />
      <SiteHeader customer={customer} />
      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-8 px-4 py-8 md:grid-cols-2">
        <div className="space-y-3">
          <div
            className="relative aspect-square overflow-hidden rounded-2xl"
            style={{ background: "var(--brand-chip-bg)" }}
          >
            {mainImage ? (
              <Image src={mainImage} alt={product.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-[var(--brand-muted)]">
                Tidak ada foto
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.slice(1).map((img) => (
                <div
                  key={img.id}
                  className="relative h-16 w-16 overflow-hidden rounded-lg"
                  style={{ background: "var(--brand-chip-bg)" }}
                >
                  <Image src={img.url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <Badge
              className="border-none text-white"
              style={{ background: product.type === "READY" ? "var(--brand-accent)" : "var(--brand-ink)" }}
            >
              {product.type === "READY" ? "Ready Stock" : "Pre-Order"}
            </Badge>
            <h1 className="mt-2 text-2xl font-bold" style={{ color: "var(--brand-ink)" }}>
              {product.name}
            </h1>
            <p className="mt-1 text-xl font-extrabold" style={{ color: "var(--brand-accent)" }}>
              Rp{product.price.toLocaleString("id-ID")}
            </p>
          </div>

          {product.type === "PO" && (
            <p
              className="rounded-lg p-3 text-sm"
              style={{ background: "var(--brand-chip-bg)", color: "var(--brand-muted)" }}
            >
              Produk ini dibuat/disiapkan setelah pesanan masuk. Butuh waktu proses
              sebelum dikirim.
            </p>
          )}

          {product.description && (
            <p className="whitespace-pre-line text-sm" style={{ color: "var(--brand-muted)" }}>
              {product.description}
            </p>
          )}

          <AddToCartButton
            soldOut={soldOut}
            product={{
              productId: product.id,
              slug: product.slug,
              name: product.name,
              type: product.type,
              price: product.price,
              weightGrams: product.weightGrams,
              lengthCm: product.lengthCm,
              widthCm: product.widthCm,
              heightCm: product.heightCm,
              imageUrl: mainImage,
            }}
          />
        </div>
      </main>
    </div>
  );
}
