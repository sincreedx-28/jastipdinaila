import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { Badge } from "@/components/ui/badge";
import { ProductPlaceholder } from "@/components/storefront/product-placeholder";
import { formatPriceRange } from "@/lib/variant-types";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, customer] = await Promise.all([
    prisma.product.findUnique({
      where: { slug, isActive: true },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: { sortOrder: "asc" } },
      },
    }),
    getCurrentCustomer(),
  ]);

  if (!product) notFound();
  const soldOut = product.type === "READY" && (product.stockQty ?? 0) <= 0;
  const prices = product.variants.map((v) => v.price);
  const minPrice = prices.length ? Math.min(...prices) : product.price;
  const maxPrice = prices.length ? Math.max(...prices) : product.price;
  const mainImage = product.images[0]?.url ?? null;

  return (
    // max-sm padding = height of the buy bar pinned to the bottom on phones
    // (see AddToCartButton), so it never covers the footer.
    <div className="theme-shop flex min-h-screen flex-col max-sm:pb-[84px]">
      <SiteHeader customer={customer} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-8 sm:py-8">
        <Link href="/produk" className="mb-5 inline-block text-sm font-bold text-foreground">
          ← Back to Catalog
        </Link>
        <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
            {mainImage ? (
              <Image src={mainImage} alt={product.name} fill className="object-cover" />
            ) : (
              <ProductPlaceholder name={product.name} size="lg" />
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.slice(1).map((img) => (
                <div
                  key={img.id}
                  className="relative h-16 w-16 overflow-hidden rounded bg-muted"
                >
                  <Image src={img.url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            {product.category && (
              <p className="mb-1 text-sm font-bold tracking-wide text-primary/80">
                {product.category}
              </p>
            )}
            <Badge variant={product.type === "READY" ? "default" : "secondary"}>
              {product.type === "READY" ? "Ready Stock" : "Pre-Order"}
            </Badge>
            <h1 className="mt-2 font-heading text-2xl font-bold">{product.name}</h1>
            <p className="mt-1 text-xl font-extrabold text-primary">
              {formatPriceRange(minPrice, maxPrice)}
            </p>
          </div>

          {product.type === "PO" && (
            <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              This product is made/prepared after the order is placed. It needs
              processing time before shipping.
            </p>
          )}

          {product.description && (
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {product.description}
            </p>
          )}

          <AddToCartButton
            soldOut={soldOut}
            variants={product.variants.map((v) => ({
              id: v.id,
              name: v.name,
              price: v.price,
              stockQty: product.type === "READY" ? v.stockQty ?? 0 : null,
            }))}
            product={{
              productId: product.id,
              slug: product.slug,
              name: product.name,
              type: product.type,
              weightGrams: product.weightGrams,
              lengthCm: product.lengthCm,
              widthCm: product.widthCm,
              heightCm: product.heightCm,
              imageUrl: mainImage,
            }}
          />
        </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
