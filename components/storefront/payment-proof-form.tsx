"use client";

import { useActionState } from "react";
import { uploadPaymentProof } from "@/lib/actions/payment-proof";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PaymentProofForm({ orderId }: { orderId: string }) {
  const action = uploadPaymentProof.bind(null, orderId);
  const [state, formAction, pending] = useActionState(action, undefined);

  if (state?.success) {
    return (
      <p className="text-sm text-green-600">
        Bukti transfer berhasil diupload. Admin akan segera memverifikasi.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <Input name="proof" type="file" accept="image/*" required />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Mengupload..." : "Upload Bukti Transfer"}
      </Button>
    </form>
  );
}
