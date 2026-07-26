import { createBrowserClient } from "@supabase/ssr";

import { clientEnv } from "@/lib/env";

/** Browser Supabase client. Carries the anon key only; RLS is the access boundary. */
export function createClient() {
  return createBrowserClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
