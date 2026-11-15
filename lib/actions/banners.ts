"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { normalizeBanners, saveBannersRaw, type Banner } from "@/lib/banners";
import { sniffImageType } from "@/lib/image-sniff";

// Banner photos live in the existing public product-images bucket under a
// banners/ prefix, so no new Supabase bucket has to be created.
const BANNER_BUCKET = "product-images";
const MAX_BANNER_BYTES = 5 * 1024 * 1024;
const MAX_BANNERS = 10;

export type SaveBannersResult = { ok: true } | { ok: false; error: string };

export async function saveBanners(banners: Banner[]): Promise<SaveBannersResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Sesi admin habis, silakan login lagi." };

  const clean = normalizeBanners(banners);
  if (clean.length > MAX_BANNERS) {
    return { ok: false, error: `Maksimal ${MAX_BANNERS} banner.` };
  }
  if (clean.length < banners.length) {
    return {
      ok: false,
      error: "Ada banner yang kosong (tanpa judul, teks, dan gambar). Isi atau hapus dulu.",
    };
  }

  await saveBannersRaw(clean);
  revalidatePath("/");
  revalidatePath("/admin/banner");
  return { ok: true };
}

export type UploadBannerResult = { ok: true; url: string } | { ok: false; error: string };

export async function uploadBannerImage(formData: FormData): Promise<UploadBannerResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Sesi admin habis, silakan login lagi." };

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Pilih gambar dulu." };
  }
  if (file.size > MAX_BANNER_BYTES) {
    return { ok: false, error: "Ukuran gambar maksimal 5MB." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImageType(bytes);
  if (!sniffed) {
    return { ok: false, error: "File harus gambar (JPEG, PNG, WebP, atau GIF)." };
  }

  const supabase = await createClient();
  const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${sniffed.ext}`;
  const { error } = await supabase.storage
    .from(BANNER_BUCKET)
    .upload(path, bytes, { upsert: false, contentType: sniffed.mime });
  if (error) return { ok: false, error: `Gagal upload: ${error.message}` };

  const { data } = supabase.storage.from(BANNER_BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
