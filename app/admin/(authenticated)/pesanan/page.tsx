import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Menunggu Bayar",
  PAID: "Sudah Dibayar",
  PROCESSING: "Diproses",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING_PAYMENT: "outline",
  PAID: "secondary",
  PROCESSING: "secondary",
  SHIPPED: "default",
  COMPLETED: "default",
  CANCELLED: "destructive",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const orders = await prisma.order.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const filters = [
    { label: "Semua", value: undefined },
    { label: "Menunggu Bayar", value: "PENDING_PAYMENT" },
    { label: "Sudah Dibayar", value: "PAID" },
    { label: "Diproses", value: "PROCESSING" },
    { label: "Dikirim", value: "SHIPPED" },
    { label: "Selesai", value: "COMPLETED" },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pesanan</h1>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f.label}
            href={f.value ? `/admin/pesanan?status=${f.value}` : "/admin/pesanan"}
            className={`rounded-full border px-3 py-1 text-xs ${
              status === f.value || (!status && !f.value)
                ? "bg-foreground text-background"
                : "text-muted-foreground"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No. Pesanan</TableHead>
            <TableHead>Pelanggan</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tanggal</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-medium">{o.orderNumber}</TableCell>
              <TableCell>
                <div>{o.customerName}</div>
                <div className="text-xs text-muted-foreground">{o.customerPhone}</div>
              </TableCell>
              <TableCell>Rp{o.totalAmount.toLocaleString("id-ID")}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[o.status]}>
                  {STATUS_LABELS[o.status] ?? o.status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {o.createdAt.toLocaleString("id-ID")}
              </TableCell>
              <TableCell>
                <Link
                  href={`/admin/pesanan/${o.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  Detail
                </Link>
              </TableCell>
            </TableRow>
          ))}
          {orders.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Belum ada pesanan.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
