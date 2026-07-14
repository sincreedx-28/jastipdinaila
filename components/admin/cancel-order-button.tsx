"use client";

import { useState, useTransition } from "react";
import { cancelOrder } from "@/lib/actions/order-management";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="text-destructive">
            Batalkan Pesanan
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Batalkan pesanan ini?</DialogTitle>
          <DialogDescription>
            Stok barang Ready yang sudah dikurangi akan dikembalikan otomatis.
            Tindakan ini tidak bisa dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Batal
          </Button>
          <Button
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await cancelOrder(orderId);
                setOpen(false);
              });
            }}
          >
            {pending ? "Memproses..." : "Ya, Batalkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
