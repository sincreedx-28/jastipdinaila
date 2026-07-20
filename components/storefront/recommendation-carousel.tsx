"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";

export type RecommendationItem = {
  slug: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
};

export function RecommendationCarousel({ items }: { items: RecommendationItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + el.clientWidth, behavior: "smooth" });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto"
        style={{ scrollSnapType: "x mandatory", scrollBehavior: "smooth" }}
      >
        {items.map((p) => (
          <Link
            key={p.slug}
            href={`/produk/${p.slug}`}
            className="relative flex aspect-[21/8] min-h-[220px] flex-none basis-full items-end"
            style={{ scrollSnapAlign: "start" }}
          >
            {p.imageUrl ? (
              <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
            ) : (
              <div className="stripes absolute inset-0 text-sm">Tidak ada foto</div>
            )}
            <div
              className="relative w-full px-7 py-6"
              style={{
                background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)",
              }}
            >
              {p.category && (
                <div className="mb-1 text-xs font-bold tracking-wide text-white/90">
                  {p.category}
                </div>
              )}
              <div className="text-xl font-extrabold text-white">{p.name}</div>
            </div>
          </Link>
        ))}
      </div>
      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-base font-bold"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-base font-bold"
          >
            →
          </button>
        </>
      )}
    </div>
  );
}
