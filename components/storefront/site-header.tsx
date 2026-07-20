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
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="shrink-0">
          <Image
            src="/logo-jastipdinaila.jpg"
            alt="jastipdinaila"
            height={44}
            width={160}
            className="h-11 w-auto object-contain mix-blend-multiply"
            priority
          />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/produk" className="text-muted-foreground hover:text-foreground">
            Semua Produk
          </Link>
          <Link href="/keranjang" className="text-muted-foreground hover:text-foreground">
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
