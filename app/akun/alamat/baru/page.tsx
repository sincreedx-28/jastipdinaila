import { AddressForm } from "@/components/storefront/address-form";
import { createAddress } from "@/lib/actions/customer-address";

export default function NewAddressPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Tambah Alamat</h1>
      <AddressForm action={createAddress} submitLabel="Simpan Alamat" />
    </div>
  );
}
