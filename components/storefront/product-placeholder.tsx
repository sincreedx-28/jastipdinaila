// Stand-in artwork for products that don't have a photo yet: the product's
// initials on a soft gradient, hue picked deterministically from the name
// (kept in the rose/peach range of the storefront palette) so each product
// stays recognisable and the grid doesn't fill with identical grey boxes.

function hash(s: string) {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function initials(name: string) {
  const letters = name
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, "")[0] ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  return (letters || "?").toUpperCase();
}

export function ProductPlaceholder({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const h = 338 + (hash(name) % 34); // 338°–372° → rose through peach
  const text = { sm: "text-base", md: "text-5xl", lg: "text-8xl" }[size];
  return (
    <div
      aria-hidden
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={{
        background: `linear-gradient(135deg, hsl(${h % 360} 75% 91%), hsl(${(h + 30) % 360} 62% 79%))`,
      }}
    >
      <span
        className="absolute -right-[12%] -top-[12%] aspect-square w-1/2 rounded-full opacity-60"
        style={{ background: `hsl(${h % 360} 90% 96%)` }}
      />
      <span
        className={`relative font-heading font-bold ${text}`}
        style={{ color: `hsl(${h % 360} 45% 30%)` }}
      >
        {initials(name)}
      </span>
    </div>
  );
}
