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
        Payment proof uploaded successfully. Admin will verify it shortly.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <Input name="proof" type="file" accept="image/*" required />
      <p className="text-xs text-muted-foreground">Image format, max 5MB.</p>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Uploading..." : "Upload Payment Proof"}
      </Button>
    </form>
  );
}
