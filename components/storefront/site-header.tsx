import Link from "next/link";
import Image from "next/image";
import type { Customer } from "@/lib/generated/prisma/client";
import { HeaderNav } from "@/components/storefront/header-nav";
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
    <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="shrink-0">
          <Image
            src="/logo-jastipdinaila-transparent.png"
            alt="jastipdinaila"
            height={44}
            width={112}
            className="h-11 w-auto object-contain"
            priority
          />
        </Link>
        <div className="flex items-center gap-6">
          <HeaderNav />
          {customer ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="rounded-full">
                    {customer.name}
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem render={<Link href="/akun">My Addresses</Link>} />
                <DropdownMenuItem onClick={signOutCustomer}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <LoginButton />
          )}
        </div>
      </div>
    </header>
  );
}
