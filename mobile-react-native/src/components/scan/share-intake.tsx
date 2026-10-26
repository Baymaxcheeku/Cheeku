import { usePathname, useRouter } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import { useEffect, useState } from "react";

import { fromShare, holdShared, useSharedFile } from "@/lib/scan/shared";
import { supabase } from "@/lib/supabase/client";

/*
 * Catches a file shared to Cheeku and takes it to Scan.
 *
 * Mounted once at the root, inside ShareIntentProvider. A share can arrive
 * before sign-in (a cold start from WhatsApp); the file waits in memory and
 * Scan opens as soon as there is a session. Text and links are ignored: only
 * a PDF or a photo can become a record.
 */
export function ShareIntake() {
  const router = useRouter();
  const pathname = usePathname();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const pending = useSharedFile((s) => s.file);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!hasShareIntent) return;
    const file = fromShare(shareIntent.files);
    if (file) holdShared(file);
    // The module's copy is cleared; ours is the one Scan reads.
    resetShareIntent();
  }, [hasShareIntent, shareIntent, resetShareIntent]);

  useEffect(() => {
    if (!pending || !signedIn || pathname === "/scan") return;
    router.navigate({ pathname: "/scan", params: { shared: "1" } });
  }, [pending, signedIn, pathname, router]);

  return null;
}
