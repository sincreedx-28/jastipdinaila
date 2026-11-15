"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Banner } from "@/lib/banner-types";

// Swipeable, auto-advancing promo banners. On phones the next slide peeks in
// from the right so it's obvious the strip can be swiped; on desktop two sit
// side by side. Auto-advance pauses while the shopper is touching it and is
// off entirely under prefers-reduced-motion.
export function HeroBanners({ banners }: { banners: Banner[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pauseUntil = useRef(0);
  const [active, setActive] = useState(0);

  const slideTo = useCallback((i: number) => {
    const track = trackRef.current;
    if (!track || track.children.length === 0) return;
    const n = track.children.length;
    const target = track.children[((i % n) + n) % n] as HTMLElement;
    const first = track.children[0] as HTMLElement;
    track.scrollTo({ left: target.offsetLeft - first.offsetLeft, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let t: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const first = track.children[0] as HTMLElement | undefined;
        if (!first) return;
        const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
        if (atEnd && track.scrollLeft > 0) {
          setActive(track.children.length - 1);
          return;
        }
        let best = 0;
        let bestDist = Infinity;
        Array.from(track.children).forEach((c, i) => {
          const d = Math.abs((c as HTMLElement).offsetLeft - first.offsetLeft - track.scrollLeft);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        });
        setActive(best);
      }, 80);
    };
    const hold = () => {
      pauseUntil.current = Date.now() + 9000;
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    ["pointerdown", "touchstart", "wheel", "mouseenter"].forEach((ev) =>
      track.addEventListener(ev, hold, { passive: true })
    );
    return () => {
      clearTimeout(t);
      track.removeEventListener("scroll", onScroll);
      ["pointerdown", "touchstart", "wheel", "mouseenter"].forEach((ev) =>
        track.removeEventListener(ev, hold)
      );
    };
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const id = setInterval(() => {
      const track = trackRef.current;
      if (!track || reduced.matches || document.hidden || Date.now() < pauseUntil.current) return;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      slideTo(atEnd ? 0 : active + 1);
    }, 5000);
    return () => clearInterval(id);
  }, [banners.length, active, slideTo]);

  if (banners.length === 0) return null;
  const single = banners.length === 1;

  return (
    <div>
      <div
        ref={trackRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain rounded-2xl"
      >
        {banners.map((b, i) => {
          const body = (
            <>
              {b.imageUrl && (
                <Image
                  src={b.imageUrl}
                  alt=""
                  fill
                  sizes={single ? "100vw" : "(min-width: 768px) 50vw, 88vw"}
                  className="object-cover"
                  priority={i === 0}
                />
              )}
              {(b.title || b.subtitle) && (
                <span
                  className={
                    b.imageUrl
                      ? "absolute inset-x-0 bottom-0 grid gap-1 bg-gradient-to-t from-black/60 to-transparent px-5 pb-4 pt-10 text-white"
                      : "absolute inset-0 grid max-w-[78%] content-center gap-1.5 px-6"
                  }
                >
                  {b.title && (
                    <span className="text-balance font-heading text-[clamp(1.25rem,4.6vw,1.9rem)] font-bold leading-tight">
                      {b.title}
                    </span>
                  )}
                  {b.subtitle && (
                    <span className="text-[15px] leading-snug opacity-95">{b.subtitle}</span>
                  )}
                </span>
              )}
            </>
          );
          // Width (not flex-basis) + a min-height floor: iOS Safari can collapse
          // an aspect-ratio flex item to zero height when its size comes only
          // from flex-basis and all of its content is absolutely positioned.
          const cls = `banner-${b.color} relative block shrink-0 grow-0 snap-start overflow-hidden rounded-2xl min-h-[140px] ${
            single
              ? "w-full aspect-[12/5] md:aspect-auto md:h-[clamp(160px,22vw,280px)]"
              : "w-[88%] aspect-[12/5] md:w-[calc(50%-6px)]"
          }`;
          return b.link ? (
            <Link key={b.id} href={b.link} className={cls} aria-label={b.title || `Banner ${i + 1}`}>
              {body}
            </Link>
          ) : (
            <div key={b.id} className={cls}>
              {body}
            </div>
          );
        })}
      </div>
      {!single && (
        <div className="mt-1.5 flex justify-center">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`Banner ${i + 1}`}
              onClick={() => {
                pauseUntil.current = Date.now() + 9000;
                slideTo(i);
              }}
              className="grid h-6 w-7 place-items-center"
            >
              <span
                className={`block h-2 rounded-full transition-all ${
                  i === active ? "w-5 bg-primary" : "w-2 bg-border"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
