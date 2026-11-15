import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS_LABELS, orderStatusClass } from "@/lib/order-status";

const FILTERS = [
  { label: "Semua", value: undefined },
  { label: "Menunggu bayar", value: "PENDING_PAYMENT" },
  { label: "Sudah dibayar", value: "PAID" },
  { label: "Diproses", value: "PROCESSING" },
  { label: "Dikirim", value: "SHIPPED" },
  { label: "Selesai", value: "COMPLETED" },
  { label: "Dibatalkan", value: "CANCELLED" },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const status = FILTERS.some((f) => f.value === rawStatus) ? rawStatus : undefined;

  const orders = await prisma.order.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTERS.map((f) => (
          <Link
            key={f.label}
            href={f.value ? `/admin/pesanan?status=${f.value}` : "/admin/pesanan"}
            className="pill"
            data-active={status === f.value}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        {orders.length} pesanan{orders.length === 100 && " terbaru"}
      </p>

      <ul className="box divide-y">
        {orders.map((o) => (
          <li key={o.id}>
            <Link
              href={`/admin/pesanan/${o.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{o.customerName}</p>
                <p className="text-sm text-muted-foreground">
                  {o.orderNumber} · {o.customerPhone}
                </p>
                <p className="text-xs text-muted-foreground">
                  {o.createdAt.toLocaleString("id-ID", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Jakarta",
                  })}
                  {" · "}
                  {o._count.items} barang
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className={orderStatusClass(o.status)}>
                  {ORDER_STATUS_LABELS[o.status] ?? o.status}
                </span>
                <p className="mt-1 font-bold">Rp{o.totalAmount.toLocaleString("id-ID")}</p>
              </div>
            </Link>
          </li>
        ))}
        {orders.length === 0 && (
          <li className="px-4 py-10 text-center text-muted-foreground">Belum ada pesanan.</li>
        )}
      </ul>
    </div>
  );
}
