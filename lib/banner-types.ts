// Banner types and pure helpers, safe to import from client components
// (lib/banners.ts adds the database access on top of these).

export const BANNER_COLORS = ["rose", "blush", "white", "dark"] as const;
export type BannerColor = (typeof BANNER_COLORS)[number];

export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  // "" = not clickable; otherwise an internal path like "/produk?type=PO"
  // or "/produk/<slug>". Validated in the save action.
  link: string;
  color: BannerColor;
  active: boolean;
};

function isBannerColor(v: unknown): v is BannerColor {
  return typeof v === "string" && (BANNER_COLORS as readonly string[]).includes(v);
}

// Only internal links: keeps admin-entered data from turning the storefront
// into an open redirect / javascript: vector.
export function isSafeBannerLink(link: string) {
  return link === "" || (link.startsWith("/") && !link.startsWith("//"));
}

// next/image only allows the Supabase public-storage host (next.config.ts);
// any other URL would throw at render and take the home page down with it.
const SUPABASE_PUBLIC_IMAGE = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\//;
function isAllowedImageUrl(url: string) {
  return SUPABASE_PUBLIC_IMAGE.test(url) || (url.startsWith("/") && !url.startsWith("//"));
}

export function normalizeBanners(raw: unknown): Banner[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((b): b is Record<string, unknown> => typeof b === "object" && b !== null)
    .map((b, i) => ({
      id: typeof b.id === "string" && b.id ? b.id : `b${i}`,
      title: String(b.title ?? "").slice(0, 80),
      subtitle: String(b.subtitle ?? "").slice(0, 140),
      imageUrl: typeof b.imageUrl === "string" && isAllowedImageUrl(b.imageUrl) ? b.imageUrl : null,
      link: typeof b.link === "string" && isSafeBannerLink(b.link) ? b.link : "",
      color: isBannerColor(b.color) ? b.color : "rose",
      active: b.active !== false,
    }))
    .filter((b) => b.title || b.subtitle || b.imageUrl);
}

// Shown when the admin hasn't made any banners yet, built from live catalog
// counts so the copy is always true (never "PO open" with nothing to order).
export function autoBanners(counts: { ready: number; po: number }): Banner[] {
  const out: Banner[] = [];
  if (counts.po > 0) {
    out.push({
      id: "auto-po",
      title: "Pre-Order is open",
      subtitle: `${counts.po} item${counts.po > 1 ? "s" : ""} waiting for you — order before the batch closes`,
      imageUrl: null,
      link: "/produk?type=PO",
      color: "rose",
      active: true,
    });
  }
  if (counts.ready > 0) {
    out.push({
      id: "auto-ready",
      title: "Ready Stock, ships right away",
      subtitle: `${counts.ready} item${counts.ready > 1 ? "s" : ""} in stock now`,
      imageUrl: null,
      link: "/produk?type=READY",
      color: "blush",
      active: true,
    });
  }
  return out;
}
