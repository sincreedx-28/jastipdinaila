import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboardPage() {
  const [productCount, pendingOrders, unpaidOrders] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.count({ where: { status: "PENDING_PAYMENT" } }),
  ]);

  const stats = [
    { label: "Produk aktif", value: productCount },
    { label: "Pesanan menunggu pembayaran", value: unpaidOrders },
    { label: "Pesanan sudah dibayar (perlu diproses)", value: pendingOrders },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
