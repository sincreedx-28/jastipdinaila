import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/storefront/site-header";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

async function getAllProducts() {
  return prisma.product.findMany({
    where: { isActive: true },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
}

export default async function ProductsPage() {
  const products = await getAllProducts();
  const ready = products.filter((p) => p.type === "READY");
  const po = products.filter((p) => p.type === "PO");

  const toCard = (p: (typeof products)[number]) => ({
    slug: p.slug,
    name: p.name,
    type: p.type,
    price: p.price,
    stockQty: p.stockQty,
    imageUrl: p.images[0]?.url ?? null,
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="mb-4 text-xl font-semibold">Semua Produk</h1>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger value="ready">Ready Stock</TabsTrigger>
            <TabsTrigger value="po">Pre-Order</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <ProductGrid products={products.map(toCard)} />
          </TabsContent>
          <TabsContent value="ready">
            <ProductGrid products={ready.map(toCard)} />
          </TabsContent>
          <TabsContent value="po">
            <ProductGrid products={po.map(toCard)} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function ProductGrid({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        Belum ada produk di kategori ini.
      </p>
    );
  }
  return (
    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.slug} product={p} />
      ))}
    </div>
  );
}
