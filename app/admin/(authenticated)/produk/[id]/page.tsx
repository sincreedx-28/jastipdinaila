import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { ProductForm } from "@/components/admin/product-form";
import { StockPanel } from "@/components/admin/stock-panel";
import { updateProduct } from "@/lib/actions/products";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ baru?: string }>;
}) {
  const [{ id }, { baru }, admin] = await Promise.all([params, searchParams, getCurrentAdmin()]);
  const isOwner = Boolean(admin?.isSuperAdmin);

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product) notFound();

  const movements =
    product.type === "READY"
      ? await prisma.stockMovement.findMany({
          where: { variant: { productId: product.id } },
          include: { variant: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 30,
        })
      : [];

  const updateProductWithId = updateProduct.bind(null, product.id);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Edit Produk</h1>
      {baru === "salinan" && (
        <p className="max-w-2xl rounded-md bg-muted p-3 text-sm">
          Ini salinan produk dan masih <b>nonaktif</b> (belum tampil di toko). Ganti nama,
          harga, atau foto yang perlu, simpan, lalu aktifkan dari daftar produk.
        </p>
      )}
      <ProductForm
        action={updateProductWithId}
        submitLabel="Simpan Perubahan"
        existingImages={product.images}
        isOwner={isOwner}
        defaultValues={{
          name: product.name,
          description: product.description,
          type: product.type,
          weightGrams: product.weightGrams,
          lengthCm: product.lengthCm,
          widthCm: product.widthCm,
          heightCm: product.heightCm,
          group: product.group,
          category: product.category,
          variants: product.variants.map((v) => ({
            id: v.id,
            name: v.name,
            price: v.price,
            stockQty: v.stockQty,
          })),
        }}
      />

      {product.type === "READY" && (
        <StockPanel
          isOwner={isOwner}
          variants={product.variants.map((v) => ({
            id: v.id,
            name: v.name,
            stockQty: v.stockQty ?? 0,
            price: v.price,
            // Purchase cost never leaves the server for non-owner admins.
            avgCost: isOwner ? v.avgCost : null,
          }))}
          movements={movements.map((m) => ({
            id: m.id,
            variantName: m.variant.name,
            type: m.type,
            qty: m.qty,
            unitCost: isOwner ? m.unitCost : null,
            stockAfter: m.stockAfter,
            note: m.note,
            adminName: m.adminName,
            createdAt: m.createdAt.toISOString(),
          }))}
        />
      )}
    </div>
  );
}
