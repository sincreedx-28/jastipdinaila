import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server Components/Actions can't always write cookies (e.g. during render),
// so setAll is wrapped in try/catch — session refresh in that case is
// handled by proxy.ts instead.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored — called from a Server Component that can't set cookies.
          }
        },
      },
    }
  );
}
