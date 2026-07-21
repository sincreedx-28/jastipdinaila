"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-auth";

export type AddressFormState = { error?: string } | undefined;

function parseAddressFields(formData: FormData) {
  const label = String(formData.get("label") ?? "").trim();
  const recipientName = String(formData.get("recipientName") ?? "").trim();
  const recipientPhone = String(formData.get("recipientPhone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const province = String(formData.get("province") ?? "").trim();
  const postalCode = String(formData.get("postalCode") ?? "").trim();
  const rajaongkirDestinationId = String(formData.get("rajaongkirDestinationId") ?? "").trim();

  if (!label || !recipientName || !recipientPhone || !address) {
    throw new Error("All fields are required.");
  }
  if (!district || !city || !province || !postalCode || !rajaongkirDestinationId) {
    throw new Error("Choose a shipping destination from the list that appears.");
  }

  return {
    label,
    recipientName,
    recipientPhone,
    address,
    district,
    city,
    province,
    postalCode,
    rajaongkirDestinationId,
  };
}

export async function createAddress(
  _prevState: AddressFormState,
  formData: FormData
): Promise<AddressFormState> {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/");

  try {
    const fields = parseAddressFields(formData);
    const isFirst =
      (await prisma.customerAddress.count({ where: { customerId: customer.id } })) === 0;
    await prisma.customerAddress.create({
      data: { ...fields, customerId: customer.id, isDefault: isFirst },
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save address." };
  }

  revalidatePath("/akun");
  redirect("/akun");
}

export async function updateAddress(
  addressId: string,
  _prevState: AddressFormState,
  formData: FormData
): Promise<AddressFormState> {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/");

  try {
    const fields = parseAddressFields(formData);
    // Scoping the update to customerId too — not just id — so a customer can
    // never edit another customer's address by guessing/tampering an id.
    const result = await prisma.customerAddress.updateMany({
      where: { id: addressId, customerId: customer.id },
      data: fields,
    });
    if (result.count === 0) {
      return { error: "Address not found." };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save address." };
  }

  revalidatePath("/akun");
  redirect("/akun");
}

export async function deleteAddress(addressId: string) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/");

  await prisma.customerAddress.deleteMany({
    where: { id: addressId, customerId: customer.id },
  });

  revalidatePath("/akun");
}

export async function setDefaultAddress(addressId: string) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/");

  await prisma.$transaction([
    prisma.customerAddress.updateMany({
      where: { customerId: customer.id },
      data: { isDefault: false },
    }),
    prisma.customerAddress.updateMany({
      where: { id: addressId, customerId: customer.id },
      data: { isDefault: true },
    }),
  ]);

  revalidatePath("/akun");
}
