import { ProductForm } from "@/components/admin/product-form";
import { createProduct } from "@/lib/actions/products";
import { getCurrentAdmin } from "@/lib/admin-auth";

export default async function NewProductPage() {
  const admin = await getCurrentAdmin();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Tambah Produk</h1>
      <ProductForm
        action={createProduct}
        submitLabel="Simpan Produk"
        isOwner={Boolean(admin?.isSuperAdmin)}
      />
    </div>
  );
}
