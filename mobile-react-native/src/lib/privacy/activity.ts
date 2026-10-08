import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase/client";
import { deviceContext } from "@/lib/legal/consent";

/*
 * The account's own history: sign-ins, security changes, consent changes.
 *
 * Shown in Security so a person can notice something they did not do. It is a
 * convenience log written by the app, not tamper-proof evidence: that is what
 * consent_log is for. Never health data: the `detail` column holds a setting
 * name or a list of purposes, and the database caps it at 200 characters.
 *
 * Best effort everywhere. A missing table (before migration 0031) or no signal
 * must never stop the action the row describes.
 */

export type ActivityKind =
  | "sign_in"
  | "sign_out"
  | "signed_out_other_devices"
  | "password_reset_requested"
  | "app_lock_on"
  | "app_lock_off"
  | "consent_granted"
  | "consent_withdrawn"
  | "data_exported"
  | "cache_cleared"
  | "privacy_request";

export type ActivityRow = { id: string; kind: ActivityKind; source: string | null; app_version: string | null; detail: string | null; created_at: string };

export const ACTIVITY_LABEL: Record<ActivityKind, string> = {
  sign_in: "Signed in",
  sign_out: "Signed out",
  signed_out_other_devices: "Signed out of other devices",
  password_reset_requested: "Password reset requested",
  app_lock_on: "App lock turned on",
  app_lock_off: "App lock turned off",
  consent_granted: "Consent given",
  consent_withdrawn: "Consent withdrawn",
  data_exported: "Data downloaded",
  cache_cleared: "Cache cleared",
  privacy_request: "Privacy request sent",
};

export async function logActivity(kind: ActivityKind, detail?: string): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const ctx = deviceContext();
    await supabase.from("account_activity").insert({
      user_id: data.user.id,
      kind,
      source: ctx.source,
      app_version: ctx.app_version,
      detail: detail ? detail.slice(0, 200) : null,
    });
  } catch {
    // Best effort, see above.
  }
}

export const ACTIVITY_KEY = ["account-activity"] as const;

export function useActivity(limit = 12) {
  return useQuery({
    queryKey: [...ACTIVITY_KEY, limit],
    queryFn: async (): Promise<ActivityRow[] | null> => {
      const { data, error } = await supabase
        .from("account_activity")
        .select("id, kind, source, app_version, detail, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      // Null rather than [] when the table is missing, so the screen can say so.
      if (error) return null;
      return (data ?? []) as ActivityRow[];
    },
  });
}
