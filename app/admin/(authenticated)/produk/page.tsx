import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toggleProductActive } from "@/lib/actions/products";
import { DeleteProductButton } from "@/components/admin/delete-product-button";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Produk</h1>
        <Button render={<Link href="/admin/produk/baru">+ Tambah Produk</Link>} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>Nama</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Tipe</TableHead>
            <TableHead>Harga</TableHead>
            <TableHead>Stok</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                {p.images[0] ? (
                  <Image
                    src={p.images[0].url}
                    alt={p.name}
                    width={40}
                    height={40}
                    className="rounded object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-muted" />
                )}
              </TableCell>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {p.group || p.category ? (
                  <>
                    {p.group}
                    {p.group && p.category ? " · " : ""}
                    {p.category}
                  </>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                <Badge variant={p.type === "READY" ? "default" : "secondary"}>
                  {p.type === "READY" ? "Ready" : "PO"}
                </Badge>
              </TableCell>
              <TableCell>Rp{p.price.toLocaleString("id-ID")}</TableCell>
              <TableCell>{p.type === "READY" ? p.stockQty : "-"}</TableCell>
              <TableCell>
                <form
                  action={async () => {
                    "use server";
                    await toggleProductActive(p.id, !p.isActive);
                  }}
                >
                  <Button type="submit" variant="ghost" size="sm">
                    <Badge variant={p.isActive ? "default" : "outline"}>
                      {p.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </Button>
                </form>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/admin/produk/${p.id}`}>Edit</Link>}
                  />
                  <DeleteProductButton productId={p.id} productName={p.name} />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {products.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                Belum ada produk.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
