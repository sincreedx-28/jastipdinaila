"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProductFormState } from "@/lib/actions/products";
import { deleteProductImage } from "@/lib/actions/products";
import { CurrencyInput } from "@/components/admin/currency-input";

type ExistingImage = { id: string; url: string };

type ProductFormValues = {
  name: string;
  description: string;
  type: "READY" | "PO";
  price: number;
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  stockQty: number | null;
  group?: string | null;
  category?: string | null;
  variants?: string[];
};

export function ProductForm({
  action,
  defaultValues,
  existingImages,
  submitLabel,
}: {
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  defaultValues?: ProductFormValues;
  existingImages?: ExistingImage[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [type, setType] = useState<"READY" | "PO">(defaultValues?.type ?? "READY");
  const [images, setImages] = useState(existingImages ?? []);

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nama Produk</Label>
        <Input id="name" name="name" defaultValue={defaultValues?.name} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={defaultValues?.description}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="group">Grup</Label>
          <Input
            id="group"
            name="group"
            placeholder="Skincare, Fashion, dll"
            defaultValue={defaultValues?.group ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Kategori</Label>
          <Input
            id="category"
            name="category"
            placeholder="Toner, Top, dll"
            defaultValue={defaultValues?.category ?? ""}
          />
        </div>
      </div>
      <p className="-mt-4 text-xs text-muted-foreground">
        Grup = pengelompokan besar di menu (mis. Skincare), Kategori = filter yang lebih
        spesifik di dalamnya (mis. Toner). Kosongkan kalau belum mau dikategorikan.
      </p>

      <div className="space-y-2">
        <Label htmlFor="variants">Varian</Label>
        <Input
          id="variants"
          name="variants"
          placeholder="S, M, L (pisahkan dengan koma)"
          defaultValue={defaultValues?.variants?.join(", ") ?? ""}
        />
        <p className="text-xs text-muted-foreground">
          Cuma label pilihan (ukuran/warna/dll), harga dan stok tetap sama untuk semua
          varian. Kosongkan kalau produk ini tidak punya varian.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Tipe Produk</Label>
        <Select name="type" value={type} onValueChange={(v) => setType(v as "READY" | "PO")}>
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="READY">Ready Stock</SelectItem>
            <SelectItem value="PO">Pre Order</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">Harga Jual</Label>
        <CurrencyInput id="price" name="price" defaultValue={defaultValues?.price} required />
        <p className="text-xs text-muted-foreground">
          Ini harga final yang dilihat pelanggan — fee jastip sudah termasuk di sini.
        </p>
      </div>

      {type === "READY" && (
        <div className="space-y-2">
          <Label htmlFor="stockQty">Stok Tersedia</Label>
          <Input
            id="stockQty"
            name="stockQty"
            type="number"
            min={0}
            defaultValue={defaultValues?.stockQty ?? undefined}
            required
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Berat &amp; Dimensi (untuk hitung ongkir)</Label>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <Label htmlFor="weightGrams" className="text-xs text-muted-foreground">
              Berat (gram)
            </Label>
            <Input
              id="weightGrams"
              name="weightGrams"
              type="number"
              min={1}
              defaultValue={defaultValues?.weightGrams}
              required
            />
          </div>
          <div>
            <Label htmlFor="lengthCm" className="text-xs text-muted-foreground">
              Panjang (cm)
            </Label>
            <Input
              id="lengthCm"
              name="lengthCm"
              type="number"
              min={1}
              defaultValue={defaultValues?.lengthCm}
              required
            />
          </div>
          <div>
            <Label htmlFor="widthCm" className="text-xs text-muted-foreground">
              Lebar (cm)
            </Label>
            <Input
              id="widthCm"
              name="widthCm"
              type="number"
              min={1}
              defaultValue={defaultValues?.widthCm}
              required
            />
          </div>
          <div>
            <Label htmlFor="heightCm" className="text-xs text-muted-foreground">
              Tinggi (cm)
            </Label>
            <Input
              id="heightCm"
              name="heightCm"
              type="number"
              min={1}
              defaultValue={defaultValues?.heightCm}
              required
            />
          </div>
        </div>
      </div>

      {images.length > 0 && (
        <div className="space-y-2">
          <Label>Foto Saat Ini</Label>
          <div className="flex flex-wrap gap-3">
            {images.map((img) => (
              <div key={img.id} className="relative">
                <Image
                  src={img.url}
                  alt=""
                  width={80}
                  height={80}
                  className="rounded object-cover"
                />
                <button
                  type="button"
                  onClick={async () => {
                    await deleteProductImage(img.id);
                    setImages((prev) => prev.filter((i) => i.id !== img.id));
                  }}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="images">
          {images.length > 0 ? "Tambah Foto" : "Foto Produk"}
        </Label>
        <Input id="images" name="images" type="file" accept="image/*" multiple />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan..." : submitLabel}
      </Button>
    </form>
  );
}
