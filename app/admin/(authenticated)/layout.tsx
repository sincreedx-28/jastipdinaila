import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminBodyTheme } from "@/components/admin/admin-body-theme";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

// Proxy.ts already does an optimistic "is there a session" check. This layout
// does the real authorization: the user must be in AdminUser, OR — if the
// allowlist is still empty — they become the first admin automatically
// (bootstrap). Adding more staff after that is a manual DB insert by the owner.
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  let admin = await prisma.adminUser.findUnique({
    where: { supabaseUserId: user.id },
  });

  if (!admin) {
    const adminCount = await prisma.adminUser.count();
    if (adminCount === 0) {
      admin = await prisma.adminUser.create({
        data: {
          supabaseUserId: user.id,
          email: user.email ?? "",
          name: user.email ?? "Admin",
          isSuperAdmin: true,
        },
      });
    } else {
      await supabase.auth.signOut();
      redirect("/admin/login");
    }
  }

  return admin;
}

const navItems = [
  { href: "/admin", label: "Ringkasan" },
  { href: "/admin/produk", label: "Produk" },
  { href: "/admin/pesanan", label: "Pesanan" },
  { href: "/admin/banner", label: "Banner" },
  { href: "/admin/pengaturan", label: "Pengaturan", superAdminOnly: true },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="theme-admin min-h-screen">
      <AdminBodyTheme />
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-5xl space-y-3 px-4 pt-3 pb-3">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Lihat toko" className="shrink-0 max-sm:hidden">
              <Image
                src="/logo-jastipdinaila-transparent.png"
                alt="jastipdinaila"
                width={120}
                height={48}
                className="h-10 w-auto"
                priority
              />
            </Link>
            <h1 className="flex min-w-0 items-center gap-2 text-2xl">
              <span className="truncate">Kelola toko</span>
              <span className="rounded-full bg-primary px-2.5 py-0.5 font-sans text-xs font-bold text-primary-foreground">
                {admin.isSuperAdmin ? "Owner" : "Admin"}
              </span>
            </h1>
            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/"
                className="text-sm font-bold text-primary hover:underline max-sm:hidden"
              >
                Lihat toko →
              </Link>
              <form action={signOut}>
                <Button type="submit" variant="outline" size="sm">
                  Keluar
                </Button>
              </form>
            </div>
          </div>
          <AdminNav
            items={navItems.filter((item) => !item.superAdminOnly || admin.isSuperAdmin)}
          />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
