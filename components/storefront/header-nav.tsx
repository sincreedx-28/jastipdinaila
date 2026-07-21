"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCartStore } from "@/lib/store/cart";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/produk", label: "Produk" },
  { href: "/keranjang", label: "Keranjang" },
];

export function HeaderNav() {
  const pathname = usePathname();
  const hasHydrated = useCartStore((s) => s.hasHydrated);
  const cartCount = useCartStore((s) =>
    s.items.reduce((sum, item) => sum + item.qty, 0)
  );

  return (
    <nav className="flex items-center gap-6">
      {LINKS.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-1.5 text-sm ${
              active ? "font-extrabold text-primary" : "font-semibold text-foreground"
            }`}
          >
            {link.label}
            {link.href === "/keranjang" && hasHydrated && cartCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-extrabold text-primary-foreground">
                {cartCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
