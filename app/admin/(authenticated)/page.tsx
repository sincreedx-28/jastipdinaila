import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Menunggu Bayar",
  PAID: "Sudah Dibayar",
  PROCESSING: "Diproses",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export default async function AdminDashboardPage() {
  const [productCount, pendingOrders, unpaidOrders, recentOrders] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.count({ where: { status: "PENDING_PAYMENT" } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const stats = [
    { label: "Produk aktif", value: productCount, href: "/admin/produk" },
    {
      label: "Pesanan menunggu pembayaran",
      value: unpaidOrders,
      href: "/admin/pesanan?status=PENDING_PAYMENT",
    },
    {
      label: "Pesanan sudah dibayar (perlu diproses)",
      value: pendingOrders,
      href: "/admin/pesanan?status=PAID",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium">Pesanan Terbaru</h2>
        <div className="divide-y rounded-lg border">
          {recentOrders.map((o) => (
            <Link
              key={o.id}
              href={`/admin/pesanan/${o.id}`}
              className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/50"
            >
              <div>
                <p className="font-medium">{o.orderNumber}</p>
                <p className="text-muted-foreground">{o.customerName}</p>
              </div>
              <div className="text-right">
                <Badge variant="outline">{STATUS_LABELS[o.status] ?? o.status}</Badge>
                <p className="mt-1 text-muted-foreground">
                  Rp{o.totalAmount.toLocaleString("id-ID")}
                </p>
              </div>
            </Link>
          ))}
          {recentOrders.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Belum ada pesanan.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
