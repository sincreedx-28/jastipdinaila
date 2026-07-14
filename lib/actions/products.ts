"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { ProductType } from "@/lib/generated/prisma/enums";

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

function parseProductFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const type = String(formData.get("type") ?? "READY") as ProductType;
  const price = Number(formData.get("price"));
  const weightGrams = Number(formData.get("weightGrams"));
  const lengthCm = Number(formData.get("lengthCm"));
  const widthCm = Number(formData.get("widthCm"));
  const heightCm = Number(formData.get("heightCm"));
  const stockQtyRaw = formData.get("stockQty");
  const stockQty =
    type === "READY" && stockQtyRaw ? Number(stockQtyRaw) : null;

  if (!name) throw new Error("Nama produk wajib diisi.");
  if (!Number.isFinite(price) || price <= 0)
    throw new Error("Harga jual tidak valid.");
  if (!Number.isFinite(weightGrams) || weightGrams <= 0)
    throw new Error("Berat tidak valid.");
  if (![lengthCm, widthCm, heightCm].every((n) => Number.isFinite(n) && n > 0))
    throw new Error("Dimensi (panjang/lebar/tinggi) tidak valid.");
  if (type === "READY" && (stockQty === null || !Number.isFinite(stockQty) || stockQty < 0))
    throw new Error("Stok wajib diisi untuk produk Ready.");

  return {
    name,
    description,
    type,
    price: Math.round(price),
    weightGrams: Math.round(weightGrams),
    lengthCm: Math.round(lengthCm),
    widthCm: Math.round(widthCm),
    heightCm: Math.round(heightCm),
    stockQty,
  };
}

export async function createProduct(
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  try {
    const fields = parseProductFields(formData);
    const slug = slugify(fields.name);

    const product = await prisma.product.create({
      data: { ...fields, slug },
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

  revalidatePath("/admin/produk");
  revalidatePath("/produk");
  redirect("/admin/produk");
}

export async function updateProduct(
  productId: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  try {
    const fields = parseProductFields(formData);

    await prisma.product.update({
      where: { id: productId },
      data: fields,
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

  revalidatePath("/admin/produk");
  revalidatePath("/produk");
  redirect("/admin/produk");
}

export async function toggleProductActive(productId: string, isActive: boolean) {
  await prisma.product.update({ where: { id: productId }, data: { isActive } });
  revalidatePath("/admin/produk");
  revalidatePath("/produk");
}

export async function deleteProductImage(imageId: string) {
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
