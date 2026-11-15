"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { syncProductTotals } from "@/lib/product-stock";
import { requireAdminAction } from "@/lib/admin-auth";

export async function markOrderPaid(orderId: string) {
  await requireAdminAction();
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "PAID", paidAt: new Date() },
  });
  revalidatePath("/admin/pesanan");
  revalidatePath(`/admin/pesanan/${orderId}`);
  revalidatePath(`/pesanan/${orderId}`);
}

export async function markOrderProcessing(orderId: string) {
  await requireAdminAction();
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
  await requireAdminAction();
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
  await requireAdminAction();
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  revalidatePath("/admin/pesanan");
  revalidatePath(`/admin/pesanan/${orderId}`);
  revalidatePath(`/pesanan/${orderId}`);
}

export async function cancelOrder(orderId: string) {
  await requireAdminAction();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return;
  if (order.status !== "PENDING_PAYMENT" && order.status !== "PAID") return;

  await prisma.$transaction(async (tx) => {
    // Conditional, so a double-click or two admins cancelling at once can't
    // put the stock back twice.
    const { count: cancelled } = await tx.order.updateMany({
      where: { id: orderId, status: { in: ["PENDING_PAYMENT", "PAID"] } },
      data: { status: "CANCELLED" },
    });
    if (cancelled === 0) return;

    // Restore Ready-stock taken at order creation, back to the same variant.
    // A variant deleted since then has nowhere to go back to, so it's skipped.
    const touched = new Set<string>();
    for (const item of order.items) {
      if (item.productTypeSnapshot === "READY" && item.variantId) {
        const { count } = await tx.productVariant.updateMany({
          where: { id: item.variantId, stockQty: { not: null } },
          data: { stockQty: { increment: item.qty } },
        });
        if (count > 0 && item.productId) touched.add(item.productId);
      }
    }
    for (const productId of touched) await syncProductTotals(tx, productId);
  });

  revalidatePath("/admin/pesanan");
  revalidatePath(`/admin/pesanan/${orderId}`);
  revalidatePath(`/pesanan/${orderId}`);
  revalidatePath("/produk");
}

export async function updateOrderNotes(orderId: string, notes: string) {
  await requireAdminAction();
  await prisma.order.update({ where: { id: orderId }, data: { notes } });
  revalidatePath(`/admin/pesanan/${orderId}`);
}
