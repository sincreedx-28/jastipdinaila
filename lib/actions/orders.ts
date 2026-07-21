"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { CartItem } from "@/lib/store/cart";
import { chargeableWeightGrams, getShippingRates } from "@/lib/rajaongkir";
import { getCurrentCustomer } from "@/lib/customer-auth";

export type CheckoutState = { error?: string } | undefined;

function courierCodeToEnum(code: string): "LION_PARCEL" | "WAHANA" | null {
  if (code === "lion") return "LION_PARCEL";
  if (code === "wahana") return "WAHANA";
  return null;
}

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
  const rajaongkirDestinationId = String(formData.get("rajaongkirDestinationId") ?? "").trim();
  const courierCode = String(formData.get("courierCode") ?? "").trim();
  const courierService = String(formData.get("courierService") ?? "").trim();
  const cartJson = String(formData.get("cart") ?? "[]");
  const saveAddress = formData.get("saveAddress") === "on";
  const saveAddressLabel = String(formData.get("saveAddressLabel") ?? "").trim() || "Alamat Baru";

  if (!customerName || !customerPhone) {
    return { error: "Nama dan nomor HP wajib diisi." };
  }
  if (!shippingAddress || !shippingCity || !shippingProvince || !shippingPostalCode) {
    return { error: "Alamat pengiriman wajib diisi lengkap." };
  }
  if (!rajaongkirDestinationId || !courierCode || !courierService) {
    return { error: "Pilih tujuan pengiriman dan kurir terlebih dahulu." };
  }

  const courierEnum = courierCodeToEnum(courierCode);
  if (!courierEnum) {
    return { error: "Kurir tidak dikenali." };
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
    variantSnapshot: string | null;
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

    const unitChargeable = chargeableWeightGrams(
      product.weightGrams,
      product.lengthCm,
      product.widthCm,
      product.heightCm
    );

    const lineTotal = product.price * cartItem.qty;
    itemsSubtotal += lineTotal;
    totalWeightGrams += unitChargeable * cartItem.qty;

    orderItemsData.push({
      productId: product.id,
      productNameSnapshot: product.name,
      productPriceSnapshot: product.price,
      productTypeSnapshot: product.type,
      weightGramsSnapshot: product.weightGrams,
      variantSnapshot: cartItem.variant ?? null,
      qty: cartItem.qty,
      lineTotal,
    });
  }

  // Never trust the client-supplied shipping cost either — re-derive the
  // authoritative rate from the same cache/API path the checkout UI used.
  const chargeableGrams = Math.ceil(totalWeightGrams);
  const rateResult = await getShippingRates(rajaongkirDestinationId, chargeableGrams);
  if (!rateResult.ok) {
    return {
      error:
        rateResult.reason === "quota_exceeded"
          ? "Ongkos kirim otomatis sedang tidak tersedia. Silakan hubungi admin via WhatsApp untuk konfirmasi ongkir."
          : "Gagal memverifikasi ongkos kirim, coba lagi.",
    };
  }
  const matchedRate = rateResult.rates.find(
    (r) => r.courierCode === courierCode && r.service === courierService
  );
  if (!matchedRate) {
    return { error: "Ongkos kirim sudah berubah, silakan pilih ulang kurir." };
  }
  const shippingCost = matchedRate.cost;

  const orderNumber = await generateOrderNumber();
  const customer = await getCurrentCustomer();

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        customerId: customer?.id,
        customerName,
        customerPhone,
        shippingAddress,
        shippingDistrict,
        shippingCity,
        shippingProvince,
        shippingPostalCode,
        rajaongkirDestinationId,
        courier: courierEnum,
        courierService: matchedRate.service,
        chargeableWeightGrams: chargeableGrams,
        shippingCost,
        shippingQuoteRaw: matchedRate,
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

  if (customer && saveAddress) {
    const isFirst =
      (await prisma.customerAddress.count({ where: { customerId: customer.id } })) === 0;
    await prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        label: saveAddressLabel,
        recipientName: customerName,
        recipientPhone: customerPhone,
        address: shippingAddress,
        district: shippingDistrict,
        city: shippingCity,
        province: shippingProvince,
        postalCode: shippingPostalCode,
        rajaongkirDestinationId,
        isDefault: isFirst,
      },
    });
  }

  redirect(`/pesanan/${order.id}`);
}
