"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { CartItem } from "@/lib/store/cart";

export type CheckoutState = { error?: string } | undefined;

// Flat placeholder until the RajaOngkir integration (next milestone) replaces
// this with a real weight+volume based quote. Every field the real flow will
// eventually populate already exists so the order schema doesn't change later.
const PLACEHOLDER_SHIPPING_COST = 20000;

async function generateOrderNumber() {
  const today = new Date();
  const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(
    today.getDate()
  ).padStart(2, "0")}`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const countToday = await prisma.order.count({
      where: { orderNumber: { startsWith: `JT-${datePart}-` } },
    });
    const candidate = `JT-${datePart}-${String(countToday + 1 + attempt).padStart(4, "0")}`;
    const exists = await prisma.order.findUnique({ where: { orderNumber: candidate } });
    if (!exists) return candidate;
  }
  throw new Error("Gagal membuat nomor pesanan, coba lagi.");
}

export async function createOrder(
  _prevState: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const shippingAddress = String(formData.get("shippingAddress") ?? "").trim();
  const shippingDistrict = String(formData.get("shippingDistrict") ?? "").trim();
  const shippingCity = String(formData.get("shippingCity") ?? "").trim();
  const shippingProvince = String(formData.get("shippingProvince") ?? "").trim();
  const shippingPostalCode = String(formData.get("shippingPostalCode") ?? "").trim();
  const cartJson = String(formData.get("cart") ?? "[]");

  if (!customerName || !customerPhone) {
    return { error: "Nama dan nomor HP wajib diisi." };
  }
  if (!shippingAddress || !shippingCity || !shippingProvince || !shippingPostalCode) {
    return { error: "Alamat pengiriman wajib diisi lengkap." };
  }

  let cart: CartItem[];
  try {
    cart = JSON.parse(cartJson);
  } catch {
    return { error: "Keranjang tidak valid." };
  }
  if (!Array.isArray(cart) || cart.length === 0) {
    return { error: "Keranjang kosong." };
  }

  // Never trust client-supplied prices/stock — re-fetch from DB and recompute.
  const productIds = cart.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  let itemsSubtotal = 0;
  let totalWeightGrams = 0;
  const orderItemsData: {
    productId: string;
    productNameSnapshot: string;
    productPriceSnapshot: number;
    productTypeSnapshot: "READY" | "PO";
    weightGramsSnapshot: number;
    qty: number;
    lineTotal: number;
  }[] = [];

  for (const cartItem of cart) {
    const product = productMap.get(cartItem.productId);
    if (!product) {
      return { error: `Produk "${cartItem.name}" sudah tidak tersedia.` };
    }
    if (product.type === "READY" && (product.stockQty ?? 0) < cartItem.qty) {
      return { error: `Stok "${product.name}" tidak cukup (sisa ${product.stockQty}).` };
    }

    const volumetricWeight =
      (product.lengthCm * product.widthCm * product.heightCm) / 6000 * 1000;
    const chargeableUnitWeight = Math.max(product.weightGrams, volumetricWeight);

    const lineTotal = product.price * cartItem.qty;
    itemsSubtotal += lineTotal;
    totalWeightGrams += chargeableUnitWeight * cartItem.qty;

    orderItemsData.push({
      productId: product.id,
      productNameSnapshot: product.name,
      productPriceSnapshot: product.price,
      productTypeSnapshot: product.type,
      weightGramsSnapshot: product.weightGrams,
      qty: cartItem.qty,
      lineTotal,
    });
  }

  const orderNumber = await generateOrderNumber();
  const shippingCost = PLACEHOLDER_SHIPPING_COST;

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        customerName,
        customerPhone,
        shippingAddress,
        shippingDistrict,
        shippingCity,
        shippingProvince,
        shippingPostalCode,
        rajaongkirDestinationId: "",
        courier: "LION_PARCEL",
        courierService: "Estimasi sementara — belum final",
        chargeableWeightGrams: Math.ceil(totalWeightGrams),
        shippingCost,
        shippingQuoteRaw: {},
        itemsSubtotal,
        totalAmount: itemsSubtotal + shippingCost,
        status: "PENDING_PAYMENT",
        items: { create: orderItemsData },
      },
    });

    for (const item of orderItemsData) {
      const product = productMap.get(item.productId)!;
      if (product.type === "READY") {
        await tx.product.update({
          where: { id: product.id },
          data: { stockQty: { decrement: item.qty } },
        });
      }
    }

    return created;
  });

  redirect(`/pesanan/${order.id}`);
}
