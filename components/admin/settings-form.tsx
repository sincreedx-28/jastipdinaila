"use client";

import { useActionState } from "react";
import { updateSettings } from "@/lib/actions/settings";
import type { SettingsMap } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SettingsForm({ defaultValues }: { defaultValues: SettingsMap }) {
  const [state, formAction, pending] = useActionState(updateSettings, undefined);

  return (
    <form action={formAction} className="space-y-6">
      <section className="space-y-4">
        <h2 className="text-sm font-medium">Info Rekening Transfer</h2>
        <div className="space-y-2">
          <Label htmlFor="bank_name">Nama Bank</Label>
          <Input
            id="bank_name"
            name="bank_name"
            defaultValue={defaultValues.bank_name}
            placeholder="BCA"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bank_account_number">Nomor Rekening</Label>
          <Input
            id="bank_account_number"
            name="bank_account_number"
            defaultValue={defaultValues.bank_account_number}
            placeholder="1234567890"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bank_account_holder">Atas Nama</Label>
          <Input
            id="bank_account_holder"
            name="bank_account_holder"
            defaultValue={defaultValues.bank_account_holder}
            placeholder="Nama Pemilik Rekening"
          />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Kontak WhatsApp</h2>
        <div className="space-y-2">
          <Label htmlFor="whatsapp_number">Nomor WhatsApp Admin</Label>
          <Input
            id="whatsapp_number"
            name="whatsapp_number"
            defaultValue={defaultValues.whatsapp_number}
            placeholder="081234567890"
          />
          <p className="text-xs text-muted-foreground">
            Dipakai buat tombol hubungi admin (misal kalau ongkir otomatis lagi bermasalah).
          </p>
        </div>
      </section>

      {state?.success && <p className="text-sm text-green-600">Tersimpan.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan..." : "Simpan Pengaturan"}
      </Button>
    </form>
  );
}
