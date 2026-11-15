import { prisma } from "@/lib/prisma";
import { getBanners } from "@/lib/banners";
import { BannerManager } from "@/components/admin/banner-manager";

export default async function AdminBannerPage() {
  const [banners, products] = await Promise.all([
    getBanners(),
    prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const linkOptions = [
    { value: "/produk?type=READY", label: "Buka katalog Ready Stock" },
    { value: "/produk?type=PO", label: "Buka katalog Pre-Order" },
    { value: "/produk", label: "Buka semua produk" },
    ...products.map((p) => ({ value: `/produk/${p.slug}`, label: `Produk: ${p.name}` })),
  ];

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h2 className="text-2xl">Banner beranda</h2>
        <p className="text-sm text-muted-foreground">
          Tampil paling atas di beranda dan bergeser otomatis. Ukuran gambar ideal 1200 × 500 px,
          atau cukup isi judul dan pilih warna tanpa gambar.
        </p>
      </div>
      <BannerManager initial={banners} linkOptions={linkOptions} />
    </div>
  );
}
