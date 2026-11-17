"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import type { ProductType } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";
import { syncProductTotals } from "@/lib/product-stock";
import { copyProduct } from "@/lib/product-copy";
import type { VariantInput } from "@/lib/variant-types";
import { cleanBarcode, isBarcode } from "@/lib/barcode";
import { sniffImageType } from "@/lib/image-sniff";

const PRODUCT_IMAGE_BUCKET = "product-images";

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 7)
  );
}

export type ProductFormState = { error?: string } | undefined;

async function uploadProductImages(productId: string, files: File[]) {
  const supabase = await createClient();
  const uploaded: { url: string; sortOrder: number }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file || file.size === 0) continue;

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${productId}/${Date.now()}-${i}.${ext}`;

    const { error } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(path, file, { upsert: true });

    if (error) {
      throw new Error(`Gagal upload foto: ${error.message}`);
    }

    const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
    uploaded.push({ url: data.publicUrl, sortOrder: i });
  }

  return uploaded;
}

/** Only photos in our own Storage bucket may be linked to a variant. */
function cleanVariantImage(v: unknown): string | null {
  const url = typeof v === "string" ? v.trim() : "";
  if (!url) return null;
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;
  return url.startsWith(prefix) && url.length < 500 ? url : null;
}

/**
 * Uploads one variant photo right when it's picked (so a product with many
 * shades never sends all photos in one big request) and returns its URL.
 * The URL is saved with the variant when the product form is saved.
 */
export async function uploadVariantPhoto(
  formData: FormData
): Promise<{ url: string } | { error: string }> {
  await requireAdminAction();
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih foto dulu." };
  if (file.size > 3 * 1024 * 1024) return { error: "Foto terlalu besar (maks 3MB)." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) return { error: "File harus foto (JPEG, PNG, WebP, atau GIF)." };

  const supabase = await createClient();
  const path = `variants/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${type.ext}`;
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, bytes, { upsert: false, contentType: type.mime });
  if (error) return { error: `Gagal upload foto: ${error.message}` };
  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}

function parseVariants(formData: FormData, type: ProductType): VariantInput[] {
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("variantsJson") ?? "[]"));
  } catch {
    throw new Error("Data varian tidak valid.");
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("Isi minimal satu harga jual.");
  }

  const toInt = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : NaN;
  };

  const rows: VariantInput[] = raw.map((r: Record<string, unknown>) => ({
    id: typeof r.id === "string" && r.id ? r.id : undefined,
    name: String(r.name ?? "").trim().slice(0, 60),
    price: toInt(r.price),
    initialStock:
      type === "READY" && r.initialStock !== null && r.initialStock !== "" && r.initialStock !== undefined
        ? toInt(r.initialStock)
        : null,
    initialCost:
      r.initialCost !== null && r.initialCost !== "" && r.initialCost !== undefined
        ? toInt(r.initialCost)
        : null,
    barcode: cleanBarcode(String(r.barcode ?? "")) || null,
    imageUrl: cleanVariantImage(r.imageUrl),
  }));

  if (rows.length > 50) throw new Error("Maksimal 50 varian per produk.");
  if (rows.length > 1 && rows.some((r) => !r.name)) {
    throw new Error("Setiap varian wajib diberi nama (mis. ukuran atau warna).");
  }
  const seen = new Set<string>();
  const codes = new Set<string>();
  for (const r of rows) {
    if (r.barcode) {
      if (!isBarcode(r.barcode)) throw new Error(`Barcode "${r.barcode}" tidak valid.`);
      if (codes.has(r.barcode)) throw new Error(`Barcode ${r.barcode} dipakai dua kali di produk ini.`);
      codes.add(r.barcode);
    }
    const key = r.name.toLowerCase();
    if (seen.has(key)) throw new Error(`Nama varian "${r.name}" dobel.`);
    seen.add(key);
    const label = r.name ? `varian "${r.name}"` : "produk";
    if (!Number.isFinite(r.price) || r.price <= 0) {
      throw new Error(`Harga jual ${label} belum diisi.`);
    }
    if (r.initialStock !== null && r.initialStock !== undefined) {
      if (!Number.isFinite(r.initialStock) || r.initialStock < 0) {
        throw new Error(`Stok ${label} tidak valid.`);
      }
    }
    if (r.initialCost !== null && r.initialCost !== undefined) {
      if (!Number.isFinite(r.initialCost) || r.initialCost < 0) {
        throw new Error(`Harga beli ${label} tidak valid.`);
      }
    }
  }
  return rows;
}

function parseProductFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "READY");
  const type: ProductType = typeRaw === "PO" ? "PO" : "READY";
  // Weight and parcel size drive the shipping cost of web checkout, which
  // only Ready Stock uses — required there, optional (0 = not filled) for PO.
  const num = (k: string) => {
    const raw = String(formData.get(k) ?? "").trim();
    return raw === "" ? (typeRaw === "PO" ? 0 : NaN) : Number(raw);
  };
  const weightGrams = num("weightGrams");
  const lengthCm = num("lengthCm");
  const widthCm = num("widthCm");
  const heightCm = num("heightCm");
  const group = String(formData.get("group") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;

  if (!name) throw new Error("Nama produk wajib diisi.");
  const minSize = type === "READY" ? 1 : 0;
  if (!Number.isFinite(weightGrams) || weightGrams < minSize)
    throw new Error(
      type === "READY" ? "Isi berat barang (gram), wajib untuk Ready Stock supaya ongkir tepat." : "Berat tidak valid."
    );
  if (![lengthCm, widthCm, heightCm].every((n) => Number.isFinite(n) && n >= minSize))
    throw new Error(
      type === "READY"
        ? "Isi panjang, lebar, dan tinggi paket (cm), wajib untuk Ready Stock supaya ongkir tepat."
        : "Ukuran paket tidak valid."
    );

  const variants = parseVariants(formData, type);
  const poEventId =
    type === "PO" ? String(formData.get("poEventId") ?? "").trim() || null : null;

  return {
    fields: {
      name,
      description,
      type,
      weightGrams: Math.round(weightGrams),
      lengthCm: Math.round(lengthCm),
      widthCm: Math.round(widthCm),
      heightCm: Math.round(heightCm),
      group,
      category,
      poEventId,
      // Mirrored into the legacy column so older code reading it still shows
      // the option labels.
      legacyVariants: variants.map((v) => v.name).filter(Boolean),
    },
    variants,
  };
}

/**
 * Records the first stock of a brand-new variant row. With a purchase price
 * (owner only) it is a PURCHASE that sets the average cost; otherwise a plain
 * ADJUSTMENT so the stock exists but the cost stays unknown.
 */
async function recordInitialStock(
  tx: Prisma.TransactionClient,
  variantId: string,
  row: VariantInput,
  admin: { id: string; name: string; isSuperAdmin: boolean }
) {
  const qty = row.initialStock ?? 0;
  if (qty <= 0) return;
  const cost = admin.isSuperAdmin && row.initialCost ? row.initialCost : null;
  await tx.productVariant.update({
    where: { id: variantId },
    data: { avgCost: cost },
  });
  await tx.stockMovement.create({
    data: {
      variantId,
      type: cost ? "PURCHASE" : "ADJUSTMENT",
      qty,
      unitCost: cost,
      stockAfter: qty,
      avgCostAfter: cost,
      note: "Stok awal",
      adminUserId: admin.id,
      adminName: admin.name,
    },
  });
}

/** Each barcode belongs to one variant in the whole shop. */
async function assertBarcodesFree(variants: VariantInput[], productId?: string) {
  const codes = variants.map((v) => v.barcode).filter((c): c is string => Boolean(c));
  if (!codes.length) return;
  const taken = await prisma.productVariant.findMany({
    where: { barcode: { in: codes }, ...(productId ? { productId: { not: productId } } : {}) },
    include: { product: { select: { name: true } } },
  });
  if (taken.length) {
    const t = taken[0];
    throw new Error(
      `Barcode ${t.barcode} sudah dipakai "${t.product.name}${t.name ? ` (${t.name})` : ""}". ` +
        "Kalau barangnya sama, tambahkan stok/varian di produk itu saja supaya tidak dobel."
    );
  }
}

async function assertPoEvent(id: string | null) {
  if (id && !(await prisma.poEvent.findUnique({ where: { id }, select: { id: true } }))) {
    throw new Error("Batch PO tidak ditemukan, pilih ulang.");
  }
}

function revalidateProductPages(productId?: string) {
  revalidatePath("/admin/produk");
  if (productId) revalidatePath(`/admin/produk/${productId}`);
  revalidatePath("/produk");
  revalidatePath("/");
}

export async function createProduct(
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const admin = await requireAdminAction();
  try {
    const { fields, variants } = parseProductFields(formData);
    await assertPoEvent(fields.poEventId);
    await assertBarcodesFree(variants);
    const slug = slugify(fields.name);

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: { ...fields, slug, price: variants[0].price },
      });
      for (const [i, row] of variants.entries()) {
        const v = await tx.productVariant.create({
          data: {
            productId: created.id,
            name: row.name,
            sortOrder: i,
            price: row.price,
            barcode: row.barcode,
            imageUrl: row.imageUrl ?? null,
            stockQty: fields.type === "READY" ? row.initialStock ?? 0 : null,
          },
        });
        if (fields.type === "READY") await recordInitialStock(tx, v.id, row, admin);
      }
      await syncProductTotals(tx, created.id);
      return created;
    });

    const files = formData.getAll("images").filter((f): f is File => f instanceof File);
    if (files.length > 0) {
      const uploaded = await uploadProductImages(product.id, files);
      await prisma.productImage.createMany({
        data: uploaded.map((u) => ({ productId: product.id, ...u })),
      });
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal menyimpan produk." };
  }

  revalidateProductPages();
  redirect("/admin/produk");
}

export async function updateProduct(
  productId: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const admin = await requireAdminAction();
  try {
    const { fields, variants } = parseProductFields(formData);
    await assertPoEvent(fields.poEventId);
    await assertBarcodesFree(variants, productId);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.productVariant.findMany({ where: { productId } });
      const existingIds = new Set(existing.map((v) => v.id));
      const kept = variants.filter((r) => r.id && existingIds.has(r.id));
      const keptIds = new Set(kept.map((r) => r.id));

      await tx.product.update({ where: { id: productId }, data: fields });

      // Rows removed in the form. Past orders keep their own snapshot of the
      // variant name and price, so this never changes order history.
      await tx.productVariant.deleteMany({
        where: { productId, id: { notIn: [...keptIds] as string[] } },
      });

      // Two passes so renames that swap names (e.g. S↔M) don't trip the
      // unique (productId, name) index halfway through.
      for (const row of kept) {
        await tx.productVariant.update({
          where: { id: row.id },
          data: { name: `__${row.id}`, barcode: null },
        });
      }
      for (const [i, row] of variants.entries()) {
        if (row.id && keptIds.has(row.id)) {
          const before = existing.find((v) => v.id === row.id)!;
          await tx.productVariant.update({
            where: { id: row.id },
            data: {
              name: row.name,
              sortOrder: i,
              price: row.price,
              barcode: row.barcode,
              imageUrl: row.imageUrl ?? null,
              // Switching READY ↔ PO: PO has no stock count; a product that
              // becomes READY starts from 0 until stock is added.
              stockQty: fields.type === "READY" ? before.stockQty ?? 0 : null,
            },
          });
        } else {
          const v = await tx.productVariant.create({
            data: {
              productId,
              name: row.name,
              sortOrder: i,
              price: row.price,
              barcode: row.barcode,
              imageUrl: row.imageUrl ?? null,
              stockQty: fields.type === "READY" ? row.initialStock ?? 0 : null,
            },
          });
          if (fields.type === "READY") await recordInitialStock(tx, v.id, row, admin);
        }
      }
      await syncProductTotals(tx, productId);
    });

    const files = formData.getAll("images").filter((f): f is File => f instanceof File);
    if (files.length > 0) {
      const uploaded = await uploadProductImages(productId, files);
      const existingCount = await prisma.productImage.count({ where: { productId } });
      await prisma.productImage.createMany({
        data: uploaded.map((u, i) => ({
          productId,
          url: u.url,
          sortOrder: existingCount + i,
        })),
      });
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal menyimpan produk." };
  }

  revalidateProductPages(productId);
  redirect("/admin/produk");
}

/**
 * Copies a product — details, variants, prices and photos — as a new,
 * inactive product with no stock, then opens it for editing. Handy for PO
 * items that come back every batch or near-identical items.
 */
export async function duplicateProduct(productId: string) {
  await requireAdminAction();
  const source = await prisma.product.findUnique({ where: { id: productId }, select: { name: true } });
  if (!source) return;
  const copy = await copyProduct(productId, { name: `${source.name} (Salinan)`, isActive: false });
  if (!copy) return;
  revalidateProductPages();
  redirect(`/admin/produk/${copy.id}?baru=salinan`);
}

export async function toggleProductActive(productId: string, isActive: boolean) {
  await requireAdminAction();
  await prisma.product.update({ where: { id: productId }, data: { isActive } });
  revalidatePath("/admin/produk");
  revalidatePath("/produk");
}

export async function deleteProductImage(imageId: string) {
  await requireAdminAction();
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image) return;

  const supabase = await createClient();
  const path = image.url.split(`${PRODUCT_IMAGE_BUCKET}/`)[1];
  if (path) {
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
  }
  await prisma.productImage.delete({ where: { id: imageId } });
  revalidatePath("/admin/produk");
}

export async function deleteProduct(productId: string) {
  await requireAdminAction();
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { images: true },
  });
  if (!product) return;

  if (product.images.length > 0) {
    const supabase = await createClient();
    const paths = product.images
      .map((img) => img.url.split(`${PRODUCT_IMAGE_BUCKET}/`)[1])
      .filter((p): p is string => Boolean(p));
    if (paths.length > 0) {
      await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(paths);
    }
  }

  // OrderItem.productId is onDelete: SetNull — past orders keep their
  // name/price/qty snapshot regardless, so this is safe even if the
  // product was previously ordered.
  await prisma.product.delete({ where: { id: productId } });

  revalidatePath("/admin/produk");
  revalidatePath("/produk");
}
