import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { clientEnv } from "@/lib/env";

/**
 * Server Supabase client bound to the request's auth cookie. Still subject to
 * RLS — this is the client every Server Action and route handler should use.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Session refresh is handled by middleware instead.
          }
        },
      },
    },
  );
}

/**
 * Returns the authenticated user or null. Always verifies with the auth server
 * rather than trusting the cookie payload.
 */
export async function getUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Use in Server Actions and route handlers that must not run anonymously. */
export async function requireUser() {
  const user = await getUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
