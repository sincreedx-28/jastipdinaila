import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { Badge } from "@/components/ui/badge";
import { expMonth } from "@/lib/variant-types";
import { poEventSelect, shopVisible } from "@/lib/shop-visibility";
import { toEventInfo } from "@/lib/po-event-info";
import { eventState, fmtDay } from "@/lib/po-event-state";
import { PoEventHeader } from "@/components/storefront/po-event-header";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { VariantSelectionProvider } from "@/components/storefront/variant-selection";
import { PriceTag } from "@/components/storefront/price-tag";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, customer] = await Promise.all([
    prisma.product.findFirst({
      where: { slug, ...shopVisible },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: { sortOrder: "asc" } },
        poEvent: { select: poEventSelect },
      },
    }),
    getCurrentCustomer(),
  ]);

  if (!product) notFound();
  const soldOut = product.type === "READY" && (product.stockQty ?? 0) <= 0;
  const event = product.type === "PO" && product.poEvent ? toEventInfo(product.poEvent) : null;
  const evState = event ? eventState(event) : "open";
  const blockedLabel =
    evState === "soon" ? `Opens ${fmtDay(event!.openDate!)}` : evState !== "open" ? "Pre-order closed" : null;
  const mainImage = product.images[0]?.url ?? product.variants.find((v) => v.imageUrl)?.imageUrl ?? null;
  const inStock = (v: (typeof product.variants)[number]) =>
    product.type !== "READY" || (v.stockQty ?? 0) > 0;
  const firstId = (product.variants.find(inStock) ?? product.variants[0])?.id ?? null;

  return (
    // max-sm padding = height of the buy bar pinned to the bottom on phones
    // (see AddToCartButton), so it never covers the footer.
    <div className="theme-shop flex min-h-screen flex-col max-sm:pb-[84px]">
      <SiteHeader customer={customer} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-8 sm:py-8">
        <Link href="/produk" className="mb-5 inline-block text-sm font-bold text-foreground">
          ← Back to Catalog
        </Link>
        <VariantSelectionProvider initialId={firstId}>
        <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery
          name={product.name}
          images={product.images.map((i) => i.url)}
          variants={product.variants
            .filter((v) => v.name)
            .map((v) => ({ id: v.id, name: v.name, imageUrl: v.imageUrl, available: inStock(v) }))}
        />

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
            <PriceTag
              variants={product.variants.map((v) => ({
                id: v.id,
                price: v.price,
                compareAtPrice: v.compareAtPrice,
              }))}
            />
          </div>

          {product.type === "PO" &&
            (event ? (
              <PoEventHeader event={event} compact />
            ) : (
              <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                Pre-Order: we buy it for you after you order, and ship once it arrives.
              </p>
            ))}

          {product.description && (
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {product.description}
            </p>
          )}

          <AddToCartButton
            soldOut={soldOut || Boolean(blockedLabel)}
            unavailableLabel={blockedLabel ?? undefined}
            variants={product.variants.map((v) => ({
              id: v.id,
              name: v.name,
              price: v.price,
              stockQty: product.type === "READY" ? v.stockQty ?? 0 : null,
              imageUrl: v.imageUrl,
              expDate: expMonth(v.expDate),
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
        </VariantSelectionProvider>
      </main>
      <SiteFooter />
    </div>
  );
}
