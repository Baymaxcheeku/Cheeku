import * as Linking from "expo-linking";

import { supabase } from "@/lib/supabase/client";

/*
 * THE CONFIRMATION LINK.
 *
 * Supabase's email sends the person to its own verify endpoint, which marks
 * the address confirmed and then redirects to `authRedirectUrl()` with the new
 * session in the URL fragment (`#access_token=…&refresh_token=…`). The app
 * opens on /auth/callback, which hands the fragment to `completeEmailLink`.
 *
 * The address is confirmed on Supabase's side BEFORE the redirect. So a link
 * opened on a laptop, or a redirect the allow list rejects, still confirms the
 * account; the person then logs in on the phone with their password. The
 * deep link is the convenience, not the verification.
 *
 * Redirect allow list (Supabase, Authentication, URL Configuration):
 * `cheekuai://**` for builds, `exp://**` for Expo Go during development, and
 * the web origin for the preview. A redirect that is not on it falls back to
 * the Site URL.
 */

/** Where the confirmation link sends the person back to: this app, on this phone. */
export function authRedirectUrl(): string {
  return Linking.createURL("auth/callback");
}

export type EmailLinkResult =
  | { kind: "session"; accessToken: string; refreshToken: string }
  | { kind: "expired" }
  | { kind: "failed" }
  | { kind: "empty" };

/**
 * Reads what the verify endpoint put on the URL. Pure, so it is tested.
 *
 * Parameters arrive in the fragment for the implicit flow (the client's
 * default) and in the query string when Supabase reports an error, so both are
 * read, fragment winning.
 */
export function parseEmailLink(url: string | null): EmailLinkResult {
  if (!url) return { kind: "empty" };
  const params = new Map<string, string>();
  const [beforeHash, fragment = ""] = url.split("#", 2);
  const query = beforeHash?.split("?", 2)[1] ?? "";
  for (const part of [query, fragment]) {
    for (const pair of part.split("&")) {
      if (!pair) continue;
      const [k, v = ""] = pair.split("=", 2);
      if (!k) continue;
      try {
        params.set(decodeURIComponent(k), decodeURIComponent(v.replace(/\+/g, " ")));
      } catch {
        // A malformed escape is a damaged link, not a crash.
        return { kind: "failed" };
      }
    }
  }

  const error = params.get("error_code") ?? params.get("error");
  if (error) return error === "otp_expired" ? { kind: "expired" } : { kind: "failed" };

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (accessToken && refreshToken) return { kind: "session", accessToken, refreshToken };
  return { kind: "empty" };
}

/**
 * Turns the link into a session on this phone.
 *
 * `setSession` checks the access token with Supabase rather than trusting
 * whatever arrived in a URL: a forged or edited link fails here and signs
 * nobody in.
 */
export async function completeEmailLink(url: string | null): Promise<"signedIn" | "expired" | "failed" | "empty"> {
  const parsed = parseEmailLink(url);
  if (parsed.kind !== "session") return parsed.kind;
  const { error } = await supabase.auth.setSession({
    access_token: parsed.accessToken,
    refresh_token: parsed.refreshToken,
  });
  return error ? "failed" : "signedIn";
}

/**
 * Sends the confirmation email again.
 *
 * Answers only "sent" or "wait": whether the address has an account is never
 * part of the answer, for the same reason sign-in has one message for every
 * credential failure.
 */
export async function resendConfirmation(email: string): Promise<"sent" | "wait"> {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: authRedirectUrl() },
  });
  return error?.status === 429 ? "wait" : "sent";
}
