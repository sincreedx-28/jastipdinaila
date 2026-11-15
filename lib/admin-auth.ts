import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function getCurrentAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return prisma.adminUser.findUnique({ where: { supabaseUserId: user.id } });
}

// Guard for admin server actions. Server Actions are public POST endpoints —
// hiding a button in the admin UI does not stop anyone from calling the
// action directly — so every admin-only action must check this itself.
// Must be called OUTSIDE any try/catch, because redirect() works by throwing.
export async function requireAdminAction() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
