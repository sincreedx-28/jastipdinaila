import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS_LABELS, orderStatusClass } from "@/lib/order-status";

export default async function AdminDashboardPage() {
  const [productCount, paidOrders, unpaidOrders, lowStock, recentOrders] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.count({ where: { status: "PENDING_PAYMENT" } }),
    prisma.product.count({ where: { isActive: true, type: "READY", stockQty: { lte: 0 } } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const stats = [
    { label: "Perlu diproses (sudah bayar)", value: paidOrders, href: "/admin/pesanan?status=PAID", strong: true },
    { label: "Menunggu pembayaran", value: unpaidOrders, href: "/admin/pesanan?status=PENDING_PAYMENT" },
    { label: "Produk tampil di toko", value: productCount, href: "/admin/produk" },
    { label: "Produk Ready yang habis", value: lowStock, href: "/admin/produk?tipe=READY&stok=menipis" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`rounded-2xl border p-4 transition-colors ${
              stat.strong
                ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-background hover:bg-secondary"
            }`}
          >
            <p className={`text-sm ${stat.strong ? "opacity-90" : "text-muted-foreground"}`}>
              {stat.label}
            </p>
            <p className={`font-heading text-3xl font-bold ${stat.strong ? "" : "text-primary"}`}>
              {stat.value}
            </p>
          </Link>
        ))}
      </div>

      <section className="box">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-lg">Pesanan terbaru</h2>
          <Link href="/admin/pesanan" className="text-sm font-bold text-primary hover:underline">
            Semua pesanan →
          </Link>
        </div>
        <ul className="divide-y border-t">
          {recentOrders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/pesanan/${o.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/60"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold">{o.customerName}</p>
                  <p className="text-sm text-muted-foreground">{o.orderNumber}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={orderStatusClass(o.status)}>
                    {ORDER_STATUS_LABELS[o.status] ?? o.status}
                  </span>
                  <p className="mt-1 text-sm font-semibold">
                    Rp{o.totalAmount.toLocaleString("id-ID")}
                  </p>
                </div>
              </Link>
            </li>
          ))}
          {recentOrders.length === 0 && (
            <li className="px-4 py-8 text-center text-muted-foreground">Belum ada pesanan.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
