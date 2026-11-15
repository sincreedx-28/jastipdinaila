// Indonesian labels and badge colours for order statuses, shared by the
// admin dashboard, order list and order detail pages.

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Menunggu bayar",
  PAID: "Sudah dibayar",
  PROCESSING: "Diproses",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const STATUS_CLASSES: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-800",
  PAID: "bg-primary text-primary-foreground",
  PROCESSING: "bg-secondary text-secondary-foreground",
  SHIPPED: "bg-sky-100 text-sky-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-destructive/10 text-destructive",
};

export function orderStatusClass(status: string) {
  return `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${
    STATUS_CLASSES[status] ?? "bg-secondary text-secondary-foreground"
  }`;
}
