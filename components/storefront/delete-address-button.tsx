"use client";

import { useState, useTransition } from "react";
import { deleteAddress } from "@/lib/actions/customer-address";
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

export function DeleteAddressButton({
  addressId,
  addressLabel,
}: {
  addressId: string;
  addressLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="text-destructive">
            Hapus
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus alamat &quot;{addressLabel}&quot;?</DialogTitle>
          <DialogDescription>
            Alamat ini akan dihapus permanen dari daftar tersimpan kamu. Pesanan yang
            sudah pernah pakai alamat ini tidak akan terpengaruh.
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
                await deleteAddress(addressId);
                setOpen(false);
              });
            }}
          >
            {pending ? "Menghapus..." : "Ya, Hapus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
