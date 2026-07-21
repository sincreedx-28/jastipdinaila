import Link from "next/link";
import Image from "next/image";
import type { Customer } from "@/lib/generated/prisma/client";
import { LoginButton } from "@/components/storefront/login-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutCustomer } from "@/lib/actions/customer-auth";

export function SiteHeader({ customer }: { customer?: Customer | null }) {
  return (
    <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo-jastipdinaila.jpg"
            alt="Jastipdinaila"
            width={140}
            height={44}
            className="h-11 w-auto object-contain"
            priority
          />
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/produk"
            className="font-semibold text-[var(--brand-ink)] hover:text-[var(--brand-accent)]"
          >
            Produk
          </Link>
          <Link
            href="/keranjang"
            className="font-semibold text-[var(--brand-ink)] hover:text-[var(--brand-accent)]"
          >
            Keranjang
          </Link>
          {customer ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm">
                    {customer.name}
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem render={<Link href="/akun">Alamat Saya</Link>} />
                <DropdownMenuItem onClick={signOutCustomer}>Keluar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <LoginButton />
          )}
        </nav>
      </div>
    </header>
  );
}
