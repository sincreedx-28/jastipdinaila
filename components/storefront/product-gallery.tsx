"use client";

import { useState } from "react";
import Image from "next/image";
import { ProductPlaceholder } from "@/components/storefront/product-placeholder";
import { useVariantSelection } from "@/components/storefront/variant-selection";

type GalleryVariant = { id: string; name: string; imageUrl: string | null; available: boolean };

/**
 * Product photos plus the variants' own photos. Choosing a variant (here or
 * in the buy box) switches the big photo to that variant's photo.
 */
export function ProductGallery({
  name,
  images,
  variants,
}: {
  name: string;
  images: string[];
  variants: GalleryVariant[];
}) {
  const selection = useVariantSelection();
  const selected = variants.find((v) => v.id === selection?.selectedId);
  // A thumbnail tapped by hand wins until another variant is chosen.
  const [picked, setPicked] = useState<{ url: string; forVariant: string | null } | null>(null);
  const pickedNow = picked && picked.forVariant === (selection?.selectedId ?? null) ? picked.url : null;

  const variantPhotos = variants.filter((v) => v.imageUrl && !images.includes(v.imageUrl));
  const thumbs = [
    ...images.map((url) => ({ url, variant: null as GalleryVariant | null })),
    ...variantPhotos.map((v) => ({ url: v.imageUrl!, variant: v })),
  ];
  const main = pickedNow ?? selected?.imageUrl ?? thumbs[0]?.url ?? null;

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        {main ? (
          <Image
            src={main}
            alt={selected?.name ? `${name} - ${selected.name}` : name}
            fill
            sizes="(min-width: 768px) 480px, 100vw"
            className="object-cover"
            priority
          />
        ) : (
          <ProductPlaceholder name={name} size="lg" />
        )}
      </div>
      {thumbs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {thumbs.map((t) => (
            <button
              key={t.url}
              type="button"
              title={t.variant?.name}
              aria-label={t.variant ? `Photo ${t.variant.name}` : "Photo"}
              onClick={() => {
                if (t.variant?.available && selection) {
                  selection.select(t.variant.id);
                  setPicked(null);
                } else {
                  setPicked({ url: t.url, forVariant: selection?.selectedId ?? null });
                }
              }}
              className={`relative h-16 w-16 flex-none overflow-hidden rounded border-2 bg-muted ${
                t.url === main ? "border-primary" : "border-transparent"
              }`}
            >
              <Image src={t.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
