"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function markOrderPaid(orderId: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "PAID", paidAt: new Date() },
  });
  revalidatePath("/admin/pesanan");
  revalidatePath(`/admin/pesanan/${orderId}`);
  revalidatePath(`/pesanan/${orderId}`);
}

export async function markOrderProcessing(orderId: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "PROCESSING" },
  });
  revalidatePath("/admin/pesanan");
  revalidatePath(`/admin/pesanan/${orderId}`);
  revalidatePath(`/pesanan/${orderId}`);
}

export type ShipOrderState = { error?: string } | undefined;

export async function shipOrder(
  orderId: string,
  _prevState: ShipOrderState,
  formData: FormData
): Promise<ShipOrderState> {
  const resiNumber = String(formData.get("resiNumber") ?? "").trim();
  if (!resiNumber) {
    return { error: "Nomor resi wajib diisi." };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "SHIPPED", resiNumber, shippedAt: new Date() },
  });
  revalidatePath("/admin/pesanan");
  revalidatePath(`/admin/pesanan/${orderId}`);
  revalidatePath(`/pesanan/${orderId}`);
}

export async function markOrderCompleted(orderId: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  revalidatePath("/admin/pesanan");
  revalidatePath(`/admin/pesanan/${orderId}`);
  revalidatePath(`/pesanan/${orderId}`);
}

export async function cancelOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return;
  if (order.status !== "PENDING_PAYMENT" && order.status !== "PAID") return;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });

    // Restore Ready-stock decremented at order creation.
    for (const item of order.items) {
      if (item.productTypeSnapshot === "READY" && item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { increment: item.qty } },
        });
      }
    }
  });

  revalidatePath("/admin/pesanan");
  revalidatePath(`/admin/pesanan/${orderId}`);
  revalidatePath(`/pesanan/${orderId}`);
  revalidatePath("/produk");
}

export async function updateOrderNotes(orderId: string, notes: string) {
  await prisma.order.update({ where: { id: orderId }, data: { notes } });
  revalidatePath(`/admin/pesanan/${orderId}`);
}
