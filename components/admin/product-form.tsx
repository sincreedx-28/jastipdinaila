"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProductFormState } from "@/lib/actions/products";
import { deleteProductImage } from "@/lib/actions/products";
import { VariantEditor } from "@/components/admin/variant-editor";
import type { VariantRowValue } from "@/lib/variant-types";
import { compressFileInput } from "@/lib/compress-image";

type ExistingImage = { id: string; url: string };

type ProductFormValues = {
  name: string;
  description: string;
  type: "READY" | "PO";
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  group?: string | null;
  category?: string | null;
  poEventId?: string | null;
  variants?: VariantRowValue[];
};

export type PoEventOption = { id: string; name: string; archived: boolean };

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {hint && <span className="font-normal text-muted-foreground">{hint}</span>}
      </Label>
      {children}
    </div>
  );
}

export function ProductForm({
  action,
  defaultValues,
  defaultGroup,
  defaultBatch,
  productId,
  presetBarcode,
  existingImages,
  submitLabel,
  isOwner,
  poEvents,
}: {
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  defaultValues?: ProductFormValues;
  /** Pre-filled category when adding from a category box in the list. */
  defaultGroup?: string;
  /** Adding from a PO batch box: starts as Pre-Order in that batch. */
  defaultBatch?: string;
  /** Product being edited (for the barcode check). */
  productId?: string;
  /** Scanned barcode to fill in. */
  presetBarcode?: string;
  existingImages?: ExistingImage[];
  submitLabel: string;
  /** Owner (super admin) also sees and enters purchase prices. */
  isOwner: boolean;
  /** PO Events (batches) a Pre-Order product can belong to. */
  poEvents: PoEventOption[];
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [type, setType] = useState<"READY" | "PO">(
    defaultValues?.type ?? (defaultBatch ? "PO" : "READY")
  );
  const [images, setImages] = useState(existingImages ?? []);
  const [shrinking, setShrinking] = useState(false);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      <Field label="Nama produk" htmlFor="name">
        <Input
          id="name"
          name="name"
          defaultValue={defaultValues?.name}
          placeholder="mis. Lip Tint Glow (tanpa nama shade/ukuran)"
          required
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Kategori" htmlFor="group">
          <Input
            id="group"
            name="group"
            placeholder="mis. Skincare, Fashion"
            defaultValue={defaultValues?.group ?? defaultGroup ?? ""}
          />
        </Field>
        <Field label="Sub-kategori" htmlFor="category" hint="(opsional)">
          <Input
            id="category"
            name="category"
            placeholder="mis. Toner, Atasan"
            defaultValue={defaultValues?.category ?? ""}
          />
        </Field>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold">Jenis barang</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["READY", "Ready stock"],
              ["PO", "Pre-order"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="pill cursor-pointer gap-2.5"
              data-active={false}
              style={type === value ? { borderColor: "var(--primary)" } : undefined}
            >
              <input
                type="radio"
                name="type"
                value={value}
                checked={type === value}
                onChange={() => setType(value)}
                className="h-4.5 w-4.5"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {type === "PO" && (
        <Field label="Batch PO" htmlFor="poEventId">
          <select
            id="poEventId"
            name="poEventId"
            defaultValue={
              defaultValues?.poEventId ?? defaultBatch ?? poEvents.find((e) => !e.archived)?.id ?? ""
            }
            className="h-11 w-full rounded-xl border bg-background px-3 text-base"
          >
            <option value="">Belum masuk batch mana pun</option>
            {poEvents.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
                {e.archived ? " (arsip)" : ""}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            {poEvents.length
              ? "Produk ini akan muncul sebagai pilihan saat mencatat order batch tersebut di Rekap Order."
              : "Belum ada batch. Buat dulu di menu Rekap Order → + PO Event baru."}
          </p>
        </Field>
      )}

      <VariantEditor
        type={type}
        isOwner={isOwner}
        initial={defaultValues?.variants}
        productId={productId}
        presetBarcode={presetBarcode}
      />

      <Field label="Foto produk">
        <div className="flex flex-wrap items-center gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative">
              <Image
                src={img.url}
                alt=""
                width={88}
                height={88}
                className="h-22 w-22 rounded-2xl object-cover"
              />
              <button
                type="button"
                aria-label="Hapus foto"
                onClick={async () => {
                  await deleteProductImage(img.id);
                  setImages((prev) => prev.filter((i) => i.id !== img.id));
                }}
                className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow"
              >
                ×
              </button>
            </div>
          ))}
          <Input
            id="images"
            name="images"
            type="file"
            accept="image/*"
            multiple
            aria-label={images.length > 0 ? "Tambah foto" : "Upload foto"}
            className="w-auto max-w-full"
            onChange={async (e) => {
              const input = e.currentTarget;
              setShrinking(true);
              await compressFileInput(input);
              setShrinking(false);
            }}
          />
          {shrinking && <span className="text-sm text-muted-foreground">Mengecilkan foto…</span>}
        </div>
      </Field>

      <Field label="Deskripsi" htmlFor="description">
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={defaultValues?.description}
        />
      </Field>

      <Field
        label="Berat & ukuran paket"
        hint={type === "READY" ? " · wajib, untuk hitung ongkir" : " · opsional untuk Pre-Order"}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["weightGrams", "Berat (gram)", defaultValues?.weightGrams],
              ["lengthCm", "Panjang (cm)", defaultValues?.lengthCm],
              ["widthCm", "Lebar (cm)", defaultValues?.widthCm],
              ["heightCm", "Tinggi (cm)", defaultValues?.heightCm],
            ] as const
          ).map(([name, label, value]) => (
            <div key={name} className="space-y-1">
              <span className="text-xs text-muted-foreground">{label}</span>
              <Input
                id={name}
                name={name}
                type="number"
                inputMode="numeric"
                min={type === "READY" ? 1 : 0}
                aria-label={label}
                defaultValue={value || undefined}
                required={type === "READY"}
              />
            </div>
          ))}
        </div>
      </Field>

      {state?.error && <p className="soft-note text-destructive!">{state.error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || shrinking}>
          {pending ? "Menyimpan..." : submitLabel}
        </Button>
        <Button variant="outline" render={<Link href="/admin/produk">Batal</Link>} />
      </div>
    </form>
  );
}
