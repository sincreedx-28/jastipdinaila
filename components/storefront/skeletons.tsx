import Image from "next/image";

// Lightweight placeholders shown by loading.tsx the instant a shopper taps a
// link, so the phone visibly reacts while the next page's data loads.

function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-secondary ${className}`} />;
}

export function StoreHeaderSkeleton() {
  return (
    <div className="sticky top-0 z-10 border-b border-border bg-card/95">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:py-3.5">
        <Image
          src="/logo-jastipdinaila-transparent.png"
          alt="jastipdinaila"
          height={44}
          width={112}
          className="h-10 w-auto object-contain sm:h-11"
          priority
        />
        <div className="flex items-center gap-3">
          <Bar className="size-10 rounded-full" />
          <Bar className="h-8 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl ring-1 ring-border">
          <Bar className="aspect-square rounded-none" />
          <div className="space-y-2 p-3">
            <Bar className="h-3 w-1/3" />
            <Bar className="h-4 w-4/5" />
            <Bar className="h-5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CatalogSkeleton() {
  return (
    <div className="theme-shop flex min-h-screen flex-col" aria-busy="true" aria-label="Memuat">
      <StoreHeaderSkeleton />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Bar className="mb-4 h-7 w-44" />
        <Bar className="mb-4 h-[60px] max-w-xl rounded-2xl" />
        <div className="mb-6 flex gap-2.5 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Bar key={i} className="h-10 w-24 flex-none rounded-full" />
          ))}
        </div>
        <ProductGridSkeleton />
      </main>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="theme-shop flex min-h-screen flex-col" aria-busy="true" aria-label="Memuat">
      <div className="h-[33px] bg-primary" />
      <StoreHeaderSkeleton />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 sm:pt-6">
        <Bar className="aspect-[12/5] min-h-[140px] w-full rounded-2xl md:aspect-auto md:h-[clamp(160px,22vw,280px)]" />
        <Bar className="mt-8 h-[60px] max-w-xl rounded-2xl" />
        <Bar className="mb-4 mt-10 h-7 w-40" />
        <ProductGridSkeleton count={4} />
      </main>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="theme-shop flex min-h-screen flex-col" aria-busy="true" aria-label="Memuat">
      <StoreHeaderSkeleton />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-8 pt-6 sm:py-8">
        <Bar className="mb-5 h-4 w-32" />
        <div className="grid gap-8 md:grid-cols-2">
          <Bar className="aspect-[4/3] rounded-lg sm:aspect-square" />
          <div className="space-y-4">
            <Bar className="h-4 w-24" />
            <Bar className="h-8 w-3/4" />
            <Bar className="h-7 w-32" />
            <Bar className="h-16 w-full" />
            <div className="flex gap-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Bar key={i} className="h-11 w-16" />
              ))}
            </div>
            <Bar className="h-11 w-full" />
          </div>
        </div>
      </main>
    </div>
  );
}
