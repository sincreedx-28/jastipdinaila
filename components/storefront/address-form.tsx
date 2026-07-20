"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DestinationPicker } from "@/components/storefront/destination-picker";
import type { DestinationOption } from "@/lib/rajaongkir";
import type { AddressFormState } from "@/lib/actions/customer-address";

type AddressFormValues = {
  label: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
  rajaongkirDestinationId: string;
};

export function AddressForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (state: AddressFormState, formData: FormData) => Promise<AddressFormState>;
  defaultValues?: AddressFormValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [destination, setDestination] = useState<DestinationOption | null>(
    defaultValues
      ? {
          id: defaultValues.rajaongkirDestinationId,
          label: `${defaultValues.district}, ${defaultValues.city}, ${defaultValues.province} ${defaultValues.postalCode}`,
          subdistrict: "",
          district: defaultValues.district,
          city: defaultValues.city,
          province: defaultValues.province,
          postalCode: defaultValues.postalCode,
        }
      : null
  );

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <input type="hidden" name="district" value={destination?.district ?? ""} />
      <input type="hidden" name="city" value={destination?.city ?? ""} />
      <input type="hidden" name="province" value={destination?.province ?? ""} />
      <input type="hidden" name="postalCode" value={destination?.postalCode ?? ""} />
      <input
        type="hidden"
        name="rajaongkirDestinationId"
        value={destination?.id ?? ""}
      />

      <div className="space-y-2">
        <Label htmlFor="label">Label Alamat</Label>
        <Input
          id="label"
          name="label"
          placeholder="Rumah, Kantor, dll"
          defaultValue={defaultValues?.label}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="recipientName">Nama Penerima</Label>
        <Input
          id="recipientName"
          name="recipientName"
          defaultValue={defaultValues?.recipientName}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="recipientPhone">Nomor HP / WhatsApp</Label>
        <Input
          id="recipientPhone"
          name="recipientPhone"
          defaultValue={defaultValues?.recipientPhone}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Alamat Lengkap (jalan, no rumah, RT/RW)</Label>
        <Textarea id="address" name="address" defaultValue={defaultValues?.address} required />
      </div>
      <div className="space-y-2">
        <Label>Kecamatan / Kota Tujuan</Label>
        <DestinationPicker defaultValue={destination ?? undefined} onSelect={setDestination} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan..." : submitLabel}
      </Button>
    </form>
  );
}
