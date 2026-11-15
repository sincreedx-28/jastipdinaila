import { prisma } from "@/lib/prisma";
import { normalizeBanners, type Banner } from "@/lib/banner-types";

export * from "@/lib/banner-types";

// Home-page banner carousel. Stored as one JSON value in the existing
// key/value Settings table (key "banners") so this needs no migration —
// banners are a short, admin-curated list, never queried individually.
const BANNERS_KEY = "banners";

export async function getBanners(): Promise<Banner[]> {
  const row = await prisma.settings.findUnique({ where: { key: BANNERS_KEY } });
  if (!row) return [];
  try {
    return normalizeBanners(JSON.parse(row.value));
  } catch {
    return [];
  }
}

export async function saveBannersRaw(banners: Banner[]) {
  const value = JSON.stringify(banners);
  await prisma.settings.upsert({
    where: { key: BANNERS_KEY },
    create: { key: BANNERS_KEY, value },
    update: { value },
  });
}
