import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { whatsappLink } from "@/lib/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  markOrderPaid,
  markOrderProcessing,
  markOrderCompleted,
} from "@/lib/actions/order-management";
import { ShipOrderForm } from "@/components/admin/ship-order-form";
import { CancelOrderButton } from "@/components/admin/cancel-order-button";

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Menunggu Pembayaran",
  PAID: "Sudah Dibayar",
  PROCESSING: "Sedang Diproses",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) notFound();

  const canCancel = order.status === "PENDING_PAYMENT" || order.status === "PAID";
  const customerWaLink = whatsappLink(
    order.customerPhone,
    `Halo ${order.customerName}, mengenai pesanan ${order.orderNumber}`
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Pesanan</p>
        <h1 className="text-xl font-semibold">{order.orderNumber}</h1>
        <Badge className="mt-1">{STATUS_LABELS[order.status] ?? order.status}</Badge>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="mb-2 text-sm font-medium">Data Pelanggan</h2>
        <p className="text-sm">{order.customerName}</p>
        <p className="text-sm text-muted-foreground">
          {order.customerPhone}
          {customerWaLink && (
            <a
              href={customerWaLink}
              target="_blank"
              rel="noreferrer"
              className="ml-2 text-primary underline"
            >
              Chat WhatsApp
            </a>
          )}
        </p>
        <Separator className="my-3" />
        <h2 className="mb-1 text-sm font-medium">Alamat Pengiriman</h2>
        <p className="text-sm">{order.shippingAddress}</p>
        <p className="text-sm text-muted-foreground">
          {order.shippingDistrict}, {order.shippingCity}, {order.shippingProvince}{" "}
          {order.shippingPostalCode}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Kurir: {order.courierService} ({order.courier === "LION_PARCEL" ? "Lion Parcel" : "Wahana"})
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="mb-2 text-sm font-medium">Rincian Pesanan</h2>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                <Badge variant="outline" className="mr-2">
                  {item.productTypeSnapshot === "READY" ? "Ready" : "PO"}
                </Badge>
                {item.productNameSnapshot}
                {item.variantSnapshot ? ` (${item.variantSnapshot})` : ""} x{item.qty}
              </span>
              <span>Rp{item.lineTotal.toLocaleString("id-ID")}</span>
            </div>
          ))}
        </div>
        <Separator className="my-3" />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>Rp{order.itemsSubtotal.toLocaleString("id-ID")}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Ongkos Kirim</span>
          <span>Rp{order.shippingCost.toLocaleString("id-ID")}</span>
        </div>
        <div className="mt-1 flex justify-between font-semibold">
          <span>Total</span>
          <span>Rp{order.totalAmount.toLocaleString("id-ID")}</span>
        </div>
      </div>

      {order.paymentProofUrl && (
        <div className="rounded-lg border p-4">
          <h2 className="mb-2 text-sm font-medium">Bukti Transfer</h2>
          <a href={order.paymentProofUrl} target="_blank" rel="noreferrer">
            <Image
              src={order.paymentProofUrl}
              alt="Bukti transfer"
              width={200}
              height={200}
              className="rounded border object-cover"
            />
          </a>
        </div>
      )}

      {order.resiNumber && (
        <div className="rounded-lg border p-4">
          <h2 className="mb-1 text-sm font-medium">Nomor Resi</h2>
          <p className="text-sm">{order.resiNumber}</p>
        </div>
      )}

      <div className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Aksi</h2>

        {order.status === "PENDING_PAYMENT" && (
          <form
            action={async () => {
              "use server";
              await markOrderPaid(order.id);
            }}
          >
            <Button type="submit" className="w-full">
              Tandai Sudah Dibayar
            </Button>
          </form>
        )}

        {order.status === "PAID" && (
          <>
            <form
              action={async () => {
                "use server";
                await markOrderProcessing(order.id);
              }}
            >
              <Button type="submit" variant="outline" className="w-full">
                Tandai Sedang Diproses
              </Button>
            </form>
            <ShipOrderForm orderId={order.id} />
          </>
        )}

        {order.status === "PROCESSING" && <ShipOrderForm orderId={order.id} />}

        {order.status === "SHIPPED" && (
          <form
            action={async () => {
              "use server";
              await markOrderCompleted(order.id);
            }}
          >
            <Button type="submit" className="w-full">
              Tandai Selesai
            </Button>
          </form>
        )}

        {canCancel && <CancelOrderButton orderId={order.id} />}

        {(order.status === "COMPLETED" || order.status === "CANCELLED") && (
          <p className="text-sm text-muted-foreground">
            Pesanan ini sudah {order.status === "COMPLETED" ? "selesai" : "dibatalkan"}, tidak
            ada aksi lagi.
          </p>
        )}
      </div>
    </div>
  );
}
