import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export type ProductCardData = {
  slug: string;
  name: string;
  type: "READY" | "PO";
  price: number;
  imageUrl: string | null;
  stockQty: number | null;
  category?: string | null;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const soldOut = product.type === "READY" && (product.stockQty ?? 0) <= 0;

  return (
    <Link href={`/produk/${product.slug}`}>
      <Card className="overflow-hidden py-0 transition-shadow hover:shadow-md">
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
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No photo
            </div>
          )}
          <Badge
            className="absolute left-2 top-2"
            variant={product.type === "READY" ? "default" : "secondary"}
          >
            {product.type === "READY" ? "Ready" : "PO"}
          </Badge>
          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Badge variant="outline">Out of Stock</Badge>
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
          <p className="text-sm font-semibold text-primary">
            Rp{product.price.toLocaleString("id-ID")}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
