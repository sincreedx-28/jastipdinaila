import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/product-form";
import { updateProduct } from "@/lib/actions/products";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });

  if (!product) notFound();

  const updateProductWithId = updateProduct.bind(null, product.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Edit Produk</h1>
      <ProductForm
        action={updateProductWithId}
        submitLabel="Simpan Perubahan"
        existingImages={product.images}
        defaultValues={{
          name: product.name,
          description: product.description,
          type: product.type,
          price: product.price,
          weightGrams: product.weightGrams,
          lengthCm: product.lengthCm,
          widthCm: product.widthCm,
          heightCm: product.heightCm,
          stockQty: product.stockQty,
        }}
      />
    </div>
  );
}
