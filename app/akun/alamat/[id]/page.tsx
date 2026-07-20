import { notFound } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { AddressForm } from "@/components/storefront/address-form";
import { updateAddress } from "@/lib/actions/customer-address";

export default async function EditAddressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = (await getCurrentCustomer())!;

  // Scoped to customerId too, so a customer can't view/edit another
  // customer's address just by guessing its id.
  const address = await prisma.customerAddress.findFirst({
    where: { id, customerId: customer.id },
  });

  if (!address) notFound();

  const updateAddressWithId = updateAddress.bind(null, address.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Edit Alamat</h1>
      <AddressForm
        action={updateAddressWithId}
        submitLabel="Simpan Perubahan"
        defaultValues={{
          label: address.label,
          recipientName: address.recipientName,
          recipientPhone: address.recipientPhone,
          address: address.address,
          district: address.district,
          city: address.city,
          province: address.province,
          postalCode: address.postalCode,
          rajaongkirDestinationId: address.rajaongkirDestinationId,
        }}
      />
    </div>
  );
}
