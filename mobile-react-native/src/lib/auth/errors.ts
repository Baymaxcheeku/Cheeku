/*
 * What a person reads when sign-in, sign-up or a code fails.
 *
 * Ported from the web app's `authFailureMessage` and widened for codes. The
 * rule it exists to keep: NOTHING HERE MAY REVEAL WHETHER AN EMAIL HAS AN
 * ACCOUNT. In a health app, being a member is itself sensitive.
 *
 * - Wrong password and no such account read the same on sign-in.
 * - Asking for a code always looks like it worked, unless the failure says
 *   nothing about the account (a rate limit, no signal, an address the mailer
 *   refuses for everyone). `sendFailure` returns null for "show it as sent".
 * - Anything unrecognised falls through to the generic message for its step,
 *   so a new Supabase error code can never become an accidental oracle.
 *
 * A rate limit or a dropped connection is said plainly. Calling those "wrong
 * password" sends someone to reset a password that was never the problem.
 */

/** The part of a supabase-js AuthError this reads. Plain data, so it tests without the client. */
export type AuthFailure = { code?: string; status?: number; name?: string; message?: string } | null | undefined;

export type AuthStep = "signIn" | "signUp" | "verify" | "newPassword";

export const MESSAGES = {
  credentials: "That email and password do not match an account.",
  offline: "Could not reach Cheeku AI. Check your connection and try again.",
  rateLimited: "Too many tries in a row. Wait a minute, then try again.",
  badAddress: "That email address wasn't accepted. Try a different one.",
  undeliverable: "We can't send email to that address right now. Try again later.",
  signupClosed: "New accounts are paused for now. Please try again later.",
  weakPassword: "Choose a longer password that's harder to guess.",
  signupFailed: "Couldn't create an account with that email. If it's yours, log in instead.",
  wrongCode: "That code didn't work. Check the digits, or send a new code.",
  samePassword: "That's the password you already have. Choose a new one.",
  resetExpired: "This reset has timed out. Start again from Log in.",
  saveFailed: "Couldn't save your password. Try again.",
} as const;

const RATE_CODES = new Set([
  "over_email_send_rate_limit",
  "over_request_rate_limit",
  "over_sms_send_rate_limit",
]);

/** No response at all: no signal, DNS, a timeout. supabase-js reports status 0 for these. */
export function isOffline(error: AuthFailure): boolean {
  if (!error) return false;
  return error.name === "AuthRetryableFetchError" || error.status === 0;
}

export function isRateLimited(error: AuthFailure): boolean {
  if (!error) return false;
  return RATE_CODES.has(error.code ?? "") || error.status === 429;
}

/** Signed in with the right password to an account whose email was never confirmed. */
export function isUnconfirmed(error: AuthFailure): boolean {
  return error?.code === "email_not_confirmed";
}

/** The message for a failed step. Safe by default: unknown codes get the step's generic line. */
export function authMessage(error: AuthFailure, step: AuthStep): string {
  if (isOffline(error)) return MESSAGES.offline;
  if (isRateLimited(error)) return MESSAGES.rateLimited;
  const code = error?.code ?? "";

  switch (step) {
    case "signIn":
      // Deliberately one message for everything else, including user_not_found.
      return MESSAGES.credentials;

    case "signUp":
      switch (code) {
        case "email_address_invalid":
        case "validation_failed":
          return MESSAGES.badAddress;
        case "email_address_not_authorized":
          return MESSAGES.undeliverable;
        case "signup_disabled":
          return MESSAGES.signupClosed;
        case "weak_password":
          return MESSAGES.weakPassword;
        default:
          // Includes user_already_exists, which only appears while email
          // confirmation is off. With it on, Supabase answers a repeat sign-up
          // exactly like a new one and this line is never reached for it.
          return MESSAGES.signupFailed;
      }

    case "verify":
      // Supabase says otp_expired for a wrong code and an old one alike.
      return MESSAGES.wrongCode;

    case "newPassword":
      switch (code) {
        case "weak_password":
          return MESSAGES.weakPassword;
        case "same_password":
          return MESSAGES.samePassword;
        case "session_not_found":
        case "session_expired":
        case "reauthentication_needed":
          return MESSAGES.resetExpired;
        default:
          return MESSAGES.saveFailed;
      }
  }
}

/**
 * Whether a "send me a code" failure is worth showing, and how.
 *
 * Null means: say the code is on its way. A login code for an address with no
 * account fails inside Supabase (`otp_disabled`), and saying so would tell a
 * stranger who is a member. Only failures that are true for every address get
 * through.
 */
export function sendFailure(error: AuthFailure): string | null {
  if (!error) return null;
  if (isOffline(error)) return MESSAGES.offline;
  if (isRateLimited(error)) return MESSAGES.rateLimited;
  if (error.code === "email_address_invalid") return MESSAGES.badAddress;
  if (error.code === "email_address_not_authorized") return MESSAGES.undeliverable;
  return null;
}
