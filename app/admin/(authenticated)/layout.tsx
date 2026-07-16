import { redirect } from "next/navigation";
import Link from "next/link";
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
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/produk", label: "Produk" },
  { href: "/admin/pesanan", label: "Pesanan" },
  { href: "/admin/pengaturan", label: "Pengaturan" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-4">
            <span className="font-semibold">Jastipdinaila Admin</span>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{admin.email}</span>
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">
                Keluar
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
