import * as Linking from "expo-linking";

import { supabase } from "@/lib/supabase/client";

/*
 * THE CONFIRMATION LINK.
 *
 * Supabase's email sends the person to its own verify endpoint, which marks
 * the address confirmed and then redirects to `authRedirectUrl()` with a
 * one-time code (`?code=…`). The app opens on /auth/callback, and
 * `completeEmailLink` exchanges the code for a session using the verifier
 * sign-up left in this phone's keychain (PKCE, lib/supabase/client.ts).
 *
 * A link that carries a ready-made session (`#access_token=…`) is refused.
 * Only the implicit flow sends one, this app never asks for it, and accepting
 * it would let anyone sign a victim in to an account of the sender's choosing.
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
  | { kind: "code"; code: string }
  | { kind: "expired" }
  | { kind: "failed" }
  | { kind: "empty" };

/**
 * Reads what the verify endpoint put on the URL. Pure, so it is tested.
 *
 * The code arrives in the query string; Supabase reports errors in either the
 * query or the fragment, so both are read.
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

  // A ready-made session is never accepted, whatever else the link carries.
  if (params.has("access_token") || params.has("refresh_token")) return { kind: "failed" };

  const code = params.get("code");
  return code ? { kind: "code", code } : { kind: "empty" };
}

/**
 * Turns the link into a session on this phone.
 *
 * The exchange needs the verifier this phone stored when it asked for the
 * email, so a code from anybody else's sign-up, or from an older email this
 * phone has since replaced, fails here and signs nobody in. A link opened on
 * another device fails the same way, but the address is confirmed already:
 * logging in finishes it.
 */
export async function completeEmailLink(url: string | null): Promise<"signedIn" | "expired" | "failed" | "empty"> {
  const parsed = parseEmailLink(url);
  if (parsed.kind !== "code") return parsed.kind;
  const { error } = await supabase.auth.exchangeCodeForSession(parsed.code);
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
