import Link from "next/link";

export type ProductTypeFilter = "READY" | "PO" | null;

// The two shelves of a jastip shop. Used on the home page (as shortcuts into
// the catalog) and on /produk (as the active filter).
export function TypeTabs({
  active,
  counts,
  hrefFor,
  showAll = false,
}: {
  active: ProductTypeFilter;
  counts: { ready: number; po: number };
  hrefFor: (type: ProductTypeFilter) => string;
  showAll?: boolean;
}) {
  const tabs: { type: ProductTypeFilter; label: string; count?: number }[] = [
    ...(showAll ? [{ type: null as ProductTypeFilter, label: "All" }] : []),
    { type: "READY", label: "Ready Stock", count: counts.ready },
    { type: "PO", label: "Pre-Order", count: counts.po },
  ];

  return (
    <div
      className={`grid gap-1.5 rounded-2xl bg-secondary p-1.5 ${
        showAll ? "grid-cols-[auto_1fr_1fr]" : "grid-cols-2"
      } max-w-xl`}
    >
      {tabs.map((t) => {
        const isActive = t.type === active;
        return (
          <Link
            key={t.label}
            href={hrefFor(t.type)}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-12 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-[15px] font-extrabold transition-colors sm:gap-2 sm:px-4 sm:text-base ${
              isActive
                ? "bg-card text-primary shadow-sm"
                : "text-foreground hover:bg-card/60"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="text-[13px] font-semibold text-muted-foreground">{t.count}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
