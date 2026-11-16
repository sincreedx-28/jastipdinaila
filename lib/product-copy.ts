import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncProductTotals } from "@/lib/product-stock";

const BUCKET = "product-images";

const slugify = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") +
  "-" +
  Math.random().toString(36).slice(2, 7);

/**
 * Copies a product — details, variants with prices (no stock), and photos as
 * separate files, so deleting a photo from one never affects the other.
 * Callers must have checked admin rights.
 */
export async function copyProduct(
  sourceId: string,
  overrides: { name?: string; isActive?: boolean; poEventId?: string | null } = {}
) {
  const source = await prisma.product.findUnique({
    where: { id: sourceId },
    include: {
      variants: { orderBy: { sortOrder: "asc" } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!source) return null;

  const name = overrides.name ?? source.name;
  const copy = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        slug: slugify(name),
        name,
        description: source.description,
        type: source.type,
        price: source.price,
        weightGrams: source.weightGrams,
        lengthCm: source.lengthCm,
        widthCm: source.widthCm,
        heightCm: source.heightCm,
        group: source.group,
        category: source.category,
        poEventId: overrides.poEventId !== undefined ? overrides.poEventId : source.poEventId,
        legacyVariants: source.legacyVariants,
        isActive: overrides.isActive ?? source.isActive,
        variants: {
          create: source.variants.map((v) => ({
            name: v.name,
            sortOrder: v.sortOrder,
            price: v.price,
            stockQty: source.type === "READY" ? 0 : null,
          })),
        },
      },
    });
    await syncProductTotals(tx, created.id);
    return created;
  });

  if (source.images.length > 0) {
    const supabase = await createClient();
    const images: { productId: string; url: string; sortOrder: number }[] = [];
    for (const [i, img] of source.images.entries()) {
      const from = img.url.split(`${BUCKET}/`)[1];
      if (!from) continue;
      const to = `${copy.id}/${Date.now()}-${i}.${from.split(".").pop() || "jpg"}`;
      const { error } = await supabase.storage.from(BUCKET).copy(from, to);
      if (error) continue;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(to);
      images.push({ productId: copy.id, url: data.publicUrl, sortOrder: i });
    }
    if (images.length > 0) await prisma.productImage.createMany({ data: images });
  }
  return copy;
}
