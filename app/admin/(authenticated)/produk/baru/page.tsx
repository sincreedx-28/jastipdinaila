import Link from "next/link";
import { ProductForm } from "@/components/admin/product-form";
import { createProduct } from "@/lib/actions/products";
import { getCurrentAdmin } from "@/lib/admin-auth";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ grup?: string }>;
}) {
  const [{ grup }, admin] = await Promise.all([searchParams, getCurrentAdmin()]);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <Link href="/admin/produk" className="text-sm font-bold text-primary hover:underline">
          ← Daftar produk
        </Link>
        <h2 className="text-2xl">Produk baru</h2>
      </div>
      <ProductForm
        action={createProduct}
        submitLabel="Simpan produk"
        defaultGroup={grup}
        isOwner={Boolean(admin?.isSuperAdmin)}
      />
    </div>
  );
}
