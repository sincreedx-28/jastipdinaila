import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { listPoEventOptions } from "@/lib/po-events";
import { getCategoryOptions } from "@/lib/category-options";
import { cleanBarcode } from "@/lib/barcode";
import { expMonth } from "@/lib/variant-types";
import { ProductForm } from "@/components/admin/product-form";
import { StockPanel } from "@/components/admin/stock-panel";
import { updateProduct } from "@/lib/actions/products";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ baru?: string; barcode?: string }>;
}) {
  const [{ id }, { baru, barcode }, admin, poEvents, categoryOptions] = await Promise.all([
    params,
    searchParams,
    getCurrentAdmin(),
    listPoEventOptions(),
    getCategoryOptions(),
  ]);
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <Link href="/admin/produk" className="text-sm font-bold text-primary hover:underline">
          ← Daftar produk
        </Link>
        <h2 className="text-2xl">Edit produk</h2>
      </div>
      {baru === "salinan" && (
        <p className="soft-note max-w-2xl">
          Ini salinan produk dan masih <b>nonaktif</b> (belum tampil di toko). Ganti nama,
          harga, atau foto yang perlu, simpan, lalu centang “Tampil” di daftar produk.
        </p>
      )}
      <ProductForm
        action={updateProductWithId}
        submitLabel="Simpan perubahan"
        existingImages={product.images}
        isOwner={isOwner}
        poEvents={poEvents}
        categoryOptions={categoryOptions}
        productId={product.id}
        presetBarcode={barcode ? cleanBarcode(barcode) : undefined}
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
          poEventId: product.poEventId,
          variants: product.variants.map((v) => ({
            id: v.id,
            name: v.name,
            price: v.price,
            stockQty: v.stockQty,
            barcode: v.barcode,
            imageUrl: v.imageUrl,
            compareAtPrice: v.compareAtPrice,
            expDate: expMonth(v.expDate),
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
