import { ProductForm } from "@/components/admin/product-form";
import { createProduct } from "@/lib/actions/products";

export default function NewProductPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Tambah Produk</h1>
      <ProductForm action={createProduct} submitLabel="Simpan Produk" />
    </div>
  );
}
