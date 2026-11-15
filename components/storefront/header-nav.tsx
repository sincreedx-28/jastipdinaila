"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/produk", label: "Products" },
  { href: "/keranjang", label: "Cart" },
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
        const isCart = link.href === "/keranjang";
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-label={isCart ? "Cart" : undefined}
            // On phones only the cart survives (as an icon button); Home and
            // Products are one tap away via the logo and the Ready/PO tabs.
            className={`items-center gap-1.5 text-sm ${
              isCart
                ? "flex h-10 min-w-10 justify-center rounded-full bg-secondary px-3 sm:h-auto sm:min-w-0 sm:bg-transparent sm:px-0"
                : "hidden sm:flex"
            } ${active ? "font-extrabold text-primary" : "font-semibold text-foreground"}`}
          >
            {isCart && <ShoppingBag className="size-5 text-primary sm:hidden" aria-hidden />}
            <span className={isCart ? "hidden sm:inline" : undefined}>{link.label}</span>
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
