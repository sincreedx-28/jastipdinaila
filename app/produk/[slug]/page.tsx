import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
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
    <div className="theme-shop flex min-h-screen flex-col">
      <SiteHeader customer={customer} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Link href="/produk" className="mb-5 inline-block text-sm font-bold text-foreground">
          ← Kembali ke Katalog
        </Link>
        <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
            {mainImage ? (
              <Image src={mainImage} alt={product.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Tidak ada foto
              </div>
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
              Rp{product.price.toLocaleString("id-ID")}
            </p>
          </div>

          {product.type === "PO" && (
            <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              Produk ini dibuat/disiapkan setelah pesanan masuk. Butuh waktu proses
              sebelum dikirim.
            </p>
          )}

          {product.description && (
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {product.description}
            </p>
          )}

          <AddToCartButton
            soldOut={soldOut}
            variants={product.variants}
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
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
