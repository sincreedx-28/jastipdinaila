"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveBanners, uploadBannerImage } from "@/lib/actions/banners";
import { BANNER_COLORS, type Banner, type BannerColor } from "@/lib/banner-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const COLOR_LABELS: Record<BannerColor, string> = {
  rose: "Pink tua",
  blush: "Pink lembut",
  white: "Putih",
  dark: "Gelap",
};

export type BannerLinkOption = { value: string; label: string };

function newBanner(): Banner {
  return {
    id: `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    title: "",
    subtitle: "",
    imageUrl: null,
    link: "",
    color: "rose",
    active: true,
  };
}

export function BannerManager({
  initial,
  linkOptions,
}: {
  initial: Banner[];
  linkOptions: BannerLinkOption[];
}) {
  const [banners, setBanners] = useState<Banner[]>(initial);
  const [dirty, setDirty] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const update = (id: string, patch: Partial<Banner>) => {
    setBanners((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    setDirty(true);
  };
  const move = (i: number, d: -1 | 1) => {
    setBanners((bs) => {
      const j = i + d;
      if (j < 0 || j >= bs.length) return bs;
      const next = [...bs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setDirty(true);
  };

  async function onPickImage(id: string, file: File | undefined) {
    if (!file) return;
    setUploadingId(id);
    const fd = new FormData();
    fd.set("image", file);
    const res = await uploadBannerImage(fd);
    setUploadingId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    update(id, { imageUrl: res.url });
    toast.success("Gambar terunggah. Jangan lupa Simpan banner.");
  }

  function onSave() {
    startSaving(async () => {
      const res = await saveBanners(banners);
      if (res.ok) {
        setDirty(false);
        toast.success("Banner tersimpan.");
      } else {
        toast.error(res.error);
      }
    });
  }

  // Links that no longer exist (e.g. a deleted product) still show up as an
  // option so the select doesn't silently rewrite them.
  const optionFor = (link: string) =>
    link && !linkOptions.some((o) => o.value === link)
      ? [{ value: link, label: `${link} (tidak ditemukan)` }]
      : [];

  return (
    <div className="space-y-4">
      {banners.length === 0 && (
        <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
          Belum ada banner buatan sendiri. Selama kosong, beranda menampilkan banner
          otomatis dari jumlah barang Ready dan Pre-Order.
        </p>
      )}

      {banners.map((b, i) => (
        <div key={b.id} className="box grid gap-4 p-4 md:grid-cols-[280px_1fr]">
          <div className="theme-shop !bg-transparent">
            <div
              className={`banner-${b.color} relative aspect-[12/5] overflow-hidden rounded-xl ${
                b.active ? "" : "opacity-50"
              }`}
            >
              {b.imageUrl && (
                <Image src={b.imageUrl} alt="" fill sizes="280px" className="object-cover" />
              )}
              <span
                className={
                  b.imageUrl
                    ? "absolute inset-x-0 bottom-0 grid bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6 text-white"
                    : "absolute inset-0 grid max-w-[78%] content-center gap-0.5 px-4"
                }
              >
                <span className="font-heading text-base font-bold leading-tight">
                  {b.title || (b.imageUrl ? "" : "Judul banner")}
                </span>
                {b.subtitle && <span className="text-xs leading-snug">{b.subtitle}</span>}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                ref={(el) => {
                  fileInputs.current[b.id] = el;
                }}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={(e) => {
                  onPickImage(b.id, e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={uploadingId === b.id}
                onClick={() => fileInputs.current[b.id]?.click()}
              >
                {uploadingId === b.id ? "Mengunggah..." : b.imageUrl ? "Ganti gambar" : "Upload gambar"}
              </Button>
              {b.imageUrl && (
                <Button type="button" size="sm" variant="ghost" onClick={() => update(b.id, { imageUrl: null })}>
                  Hapus gambar
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`t-${b.id}`}>Judul</Label>
              <Input
                id={`t-${b.id}`}
                value={b.title}
                maxLength={80}
                placeholder="mis. PO Jepang batch 2 dibuka!"
                onChange={(e) => update(b.id, { title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`s-${b.id}`}>Teks kecil</Label>
              <Input
                id={`s-${b.id}`}
                value={b.subtitle}
                maxLength={140}
                placeholder="mis. Close 25 Nov · estimasi tiba Desember"
                onChange={(e) => update(b.id, { subtitle: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`c-${b.id}`}>Warna (kalau tanpa gambar)</Label>
              <select
                id={`c-${b.id}`}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-base"
                value={b.color}
                onChange={(e) => update(b.id, { color: e.target.value as BannerColor })}
              >
                {BANNER_COLORS.map((c) => (
                  <option key={c} value={c}>
                    {COLOR_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`l-${b.id}`}>Saat diklik</Label>
              <select
                id={`l-${b.id}`}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-base"
                value={b.link}
                onChange={(e) => update(b.id, { link: e.target.value })}
              >
                <option value="">Tidak ke mana-mana</option>
                {[...optionFor(b.link), ...linkOptions].map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-[#b9575e]"
                checked={b.active}
                onChange={(e) => update(b.id, { active: e.target.checked })}
              />
              Tampilkan di beranda
            </label>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Button type="button" size="sm" variant="outline" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Geser ke atas">
                ↑
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={i === banners.length - 1}
                onClick={() => move(i, 1)}
                aria-label="Geser ke bawah"
              >
                ↓
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => {
                  setBanners((bs) => bs.filter((x) => x.id !== b.id));
                  setDirty(true);
                }}
              >
                Hapus
              </Button>
            </div>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setBanners((bs) => [...bs, newBanner()]);
            setDirty(true);
          }}
        >
          + Banner baru
        </Button>
        <Button type="button" onClick={onSave} disabled={saving || !dirty}>
          {saving ? "Menyimpan..." : "Simpan banner"}
        </Button>
        {dirty && <span className="text-sm text-muted-foreground">Ada perubahan yang belum disimpan.</span>}
      </div>
    </div>
  );
}
