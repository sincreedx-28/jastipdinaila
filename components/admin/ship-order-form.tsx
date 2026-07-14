"use client";

import { useActionState } from "react";
import { shipOrder } from "@/lib/actions/order-management";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ShipOrderForm({ orderId }: { orderId: string }) {
  const action = shipOrder.bind(null, orderId);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-2">
      <Label htmlFor="resiNumber">Nomor Resi</Label>
      <div className="flex gap-2">
        <Input id="resiNumber" name="resiNumber" required placeholder="Nomor resi kurir" />
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : "Tandai Dikirim"}
        </Button>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
