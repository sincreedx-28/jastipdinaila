"use client";

import { useState, useTransition } from "react";
import { deleteProduct } from "@/lib/actions/products";
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

export function DeleteProductButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
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
          <DialogTitle>Hapus produk ini?</DialogTitle>
          <DialogDescription>
            &quot;{productName}&quot; dan semua fotonya akan dihapus permanen. Pesanan
            yang sudah pernah masuk untuk produk ini tidak akan terpengaruh. Kalau cuma
            mau sembunyikan sementara (misal stok habis tapi mau di-restock lagi),
            pakai tombol &quot;Aktif/Nonaktif&quot; saja, bukan ini.
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
                await deleteProduct(productId);
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
