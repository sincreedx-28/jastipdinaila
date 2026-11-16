import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProductPlaceholder } from "@/components/storefront/product-placeholder";

export type ProductCardData = {
  slug: string;
  name: string;
  type: "READY" | "PO";
  /** For Pre-Order: state of its batch; closed / not-yet-open can't be ordered. */
  poState?: "open" | "soon" | "closed" | "archived" | null;
  price: number;
  /** Highest variant price, when variants are priced differently. */
  priceMax?: number | null;
  imageUrl: string | null;
  stockQty: number | null;
  category?: string | null;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const soldOut = product.type === "READY" && (product.stockQty ?? 0) <= 0;
  const poBlocked =
    product.poState === "closed" || product.poState === "archived"
      ? "Pre-order closed"
      : product.poState === "soon"
        ? "Opening soon"
        : null;

  return (
    <Link href={`/produk/${product.slug}`}>
      <Card className="h-full overflow-hidden py-0 ring-1 ring-border transition-shadow hover:shadow-md">
        <div className="relative aspect-square bg-muted">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(min-width: 768px) 25vw, 50vw"
            />
          ) : (
            <ProductPlaceholder name={product.name} />
          )}
          {product.type === "READY" ? (
            <Badge className="absolute left-2 top-2">Ready</Badge>
          ) : (
            <span className="absolute left-2 top-2 rounded-md bg-card px-2 py-0.5 text-xs font-extrabold text-primary ring-1 ring-primary">
              Pre-Order
            </span>
          )}
          {(soldOut || poBlocked) && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <span className="rounded-full bg-card px-3 py-1 text-xs font-extrabold text-foreground">
                {soldOut ? "Out of Stock" : poBlocked}
              </span>
            </div>
          )}
        </div>
        <CardContent className="space-y-1 pb-4">
          {product.category && (
            <p className="text-xs font-semibold tracking-wide text-primary/80">
              {product.category}
            </p>
          )}
          <p className="line-clamp-2 text-sm font-medium">{product.name}</p>
          <p className="text-base font-extrabold text-primary">
            {product.priceMax && product.priceMax > product.price && (
              <span className="mr-1 text-xs font-semibold text-muted-foreground">From</span>
            )}
            Rp{product.price.toLocaleString("id-ID")}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
