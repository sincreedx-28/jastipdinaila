import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// Unlike AdminUser, there is no allowlist — any authenticated Google user
// is auto-provisioned as a Customer on first call after login.
export async function getCurrentCustomer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const existing = await prisma.customer.findUnique({
    where: { supabaseUserId: user.id },
  });
  if (existing) return existing;

  return prisma.customer.create({
    data: {
      supabaseUserId: user.id,
      email: user.email ?? "",
      name:
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email ??
        "Customer",
    },
  });
}
