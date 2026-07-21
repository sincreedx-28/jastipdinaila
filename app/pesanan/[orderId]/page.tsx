import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings, whatsappLink } from "@/lib/settings";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { ClearCartOnMount } from "@/components/storefront/clear-cart-on-mount";
import { PaymentProofForm } from "@/components/storefront/payment-proof-form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Menunggu Pembayaran",
  PAID: "Sudah Dibayar",
  PROCESSING: "Sedang Diproses",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) notFound();

  const customer = await getCurrentCustomer();
  const settings = await getSettings();
  const hasBankInfo = settings.bank_name && settings.bank_account_number;
  const waLink = whatsappLink(
    settings.whatsapp_number,
    `Halo, saya mau konfirmasi pembayaran untuk pesanan ${order.orderNumber}`
  );

  return (
    <div className="theme-shop flex min-h-screen flex-col">
      <SiteHeader customer={customer} />
      <ClearCartOnMount />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8">
        <div>
          <p className="text-sm text-muted-foreground">Nomor Pesanan</p>
          <h1 className="text-xl font-semibold">{order.orderNumber}</h1>
          <Badge className="mt-2">{STATUS_LABELS[order.status] ?? order.status}</Badge>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="mb-2 text-sm font-medium">Rincian Pesanan</h2>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
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

        {order.status === "PENDING_PAYMENT" && (
          <div className="space-y-3 rounded-lg border p-4">
            <h2 className="text-sm font-medium">Instruksi Pembayaran</h2>
            <p className="text-sm text-muted-foreground">
              Silakan transfer sejumlah{" "}
              <span className="font-semibold text-foreground">
                Rp{order.totalAmount.toLocaleString("id-ID")}
              </span>{" "}
              {hasBankInfo ? (
                <>
                  ke <span className="font-semibold text-foreground">{settings.bank_name}</span>{" "}
                  <span className="font-semibold text-foreground">
                    {settings.bank_account_number}
                  </span>{" "}
                  a.n. {settings.bank_account_holder}
                </>
              ) : (
                "ke rekening yang diinformasikan admin"
              )}
              , lalu upload bukti transfer di bawah ini (opsional, mempercepat verifikasi).
            </p>
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary underline"
              >
                Konfirmasi via WhatsApp
              </a>
            )}
            {order.paymentProofUrl ? (
              <p className="text-sm text-green-600">
                Bukti transfer sudah diupload, menunggu verifikasi admin.
              </p>
            ) : (
              <PaymentProofForm orderId={order.id} />
            )}
          </div>
        )}

        {order.resiNumber && (
          <div className="rounded-lg border p-4">
            <h2 className="text-sm font-medium">Nomor Resi</h2>
            <p className="text-sm">{order.resiNumber}</p>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p>Dikirim ke: {order.customerName}</p>
          <p>{order.shippingAddress}</p>
          <p>
            {order.shippingDistrict}, {order.shippingCity}, {order.shippingProvince}{" "}
            {order.shippingPostalCode}
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
