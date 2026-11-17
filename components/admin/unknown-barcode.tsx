"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Shown when a scanned barcode isn't in the shop yet: make a new product
 * with it, or add it to an existing product as a new variant (e.g. another
 * shade of the same lip tint), so one product stays one listing.
 */
export function UnknownBarcode({
  code,
  products,
}: {
  code: string;
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [target, setTarget] = useState("");
  return (
    <div className="box space-y-3 p-4">
      <p>
        Barcode <b>{code}</b> belum terdaftar. Barang ini…
      </p>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold">① Barang baru, belum ada di toko sama sekali</p>
        <Button render={<Link href={`/admin/produk/baru?barcode=${encodeURIComponent(code)}`}>+ Buat produk baru</Link>} />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold">
          ② Shade / ukuran / warna lain dari produk yang sudah ada
        </p>
        <p className="text-xs text-muted-foreground">
          Mis. Lip Tint Glow 01 sudah diposting, sekarang scan yang 02 → pilih Lip Tint Glow.
        </p>
        <div className="flex flex-wrap gap-2">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            aria-label="Pilih produk"
            className="h-11 min-w-0 flex-1 rounded-xl border bg-background px-3 text-base"
          >
            <option value="">Pilih produk…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            disabled={!target}
            onClick={() => router.push(`/admin/produk/${target}?barcode=${encodeURIComponent(code)}`)}
          >
            Lanjut
          </Button>
        </div>
      </div>
    </div>
  );
}
