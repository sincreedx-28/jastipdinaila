import Link from "next/link";
import { ProductForm } from "@/components/admin/product-form";
import { createProduct } from "@/lib/actions/products";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { listPoEventOptions } from "@/lib/po-events";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ grup?: string; batch?: string }>;
}) {
  const [{ grup, batch }, admin, poEvents] = await Promise.all([
    searchParams,
    getCurrentAdmin(),
    listPoEventOptions(),
  ]);
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
        defaultBatch={poEvents.some((e) => e.id === batch) ? batch : undefined}
        isOwner={Boolean(admin?.isSuperAdmin)}
        poEvents={poEvents}
      />
    </div>
  );
}
