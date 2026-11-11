/*
 * The rules of an emailed code, kept free of React and of the Supabase client
 * so they test in plain Node.
 *
 * WHY CODES AND NOT LINKS. A link in an email opens a browser. Nothing in the
 * app catches it (`detectSessionInUrl` is off, there is no auth deep link), so
 * a link confirms the address on a web page and leaves the phone signed out.
 * A code is typed, or autofilled from the email by iOS and Android, into the
 * app that asked for it. One screen, `/verify`, serves all three purposes.
 */

/** Why a code was sent. Decides the copy, the resend call and what happens after. */
export type Purpose = "signup" | "login" | "recovery";

/**
 * Digits in a code. Supabase's "Email OTP Length" setting must match: 6 is
 * what the email templates and this screen are drawn for. Overridable so a
 * project left on another length still works while someone fixes the setting.
 */
export function parseCodeLength(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 6 && n <= 10 ? n : 6;
}

export const CODE_LENGTH = parseCodeLength(process.env.EXPO_PUBLIC_AUTH_CODE_LENGTH);

/** Supabase refuses a second email to one address inside 60 seconds by default. */
export const RESEND_SECONDS = 60;

/**
 * `verifyOtp` type for each purpose. "email" checks both the sign-up
 * confirmation and a login code, so a person who signed up, never confirmed
 * and later asks for a login code is still let in by the code they hold.
 */
export function otpType(purpose: Purpose): "email" | "recovery" {
  return purpose === "recovery" ? "recovery" : "email";
}

/**
 * Digits only, at most `length` of them. Pasted codes arrive as "123 456",
 * "123-456" or inside a sentence; autofill sometimes adds a space.
 */
export function cleanCode(raw: string, length: number = CODE_LENGTH): string {
  return raw.replace(/\D/g, "").slice(0, length);
}

export function isCompleteCode(code: string, length: number = CODE_LENGTH): boolean {
  return code.length === length && /^\d+$/.test(code);
}

/** Whole seconds until another code may be asked for. Never negative. */
export function secondsUntilResend(sentAt: number, now: number, wait: number = RESEND_SECONDS): number {
  const left = Math.ceil((sentAt + wait * 1000 - now) / 1000);
  return Math.max(0, Math.min(wait, left));
}

/** 42 → "0:42", 60 → "1:00". */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/*
 * The code in flight, held in memory only.
 *
 * Not in the route: an email address in a URL is personal data in browser
 * history and in any log that records paths. Not on disk: a half-finished
 * sign-in has nothing worth surviving a restart, and the app cold-starts to
 * where it belongs anyway. Losing it sends the person back to Log in.
 */
export type PendingCode = { email: string; purpose: Purpose; sentAt: number };

let pending: PendingCode | null = null;

export function setPendingCode(next: PendingCode): void {
  pending = { ...next, email: next.email.trim().toLowerCase() };
}

export function getPendingCode(): PendingCode | null {
  return pending;
}

export function markCodeResent(now: number): void {
  if (pending) pending = { ...pending, sentAt: now };
}

export function clearPendingCode(): void {
  pending = null;
}

/*
 * Routes a signed-out person may be on. Anywhere else, losing the session
 * means the screen is showing an account that is no longer signed in.
 */
const SIGNED_OUT_ROUTES = new Set(["/", "/welcome", "/sign-in", "/verify", "/reset-password"]);

export function isSignedOutRoute(pathname: string): boolean {
  const path = pathname.split("?")[0] || "/";
  return SIGNED_OUT_ROUTES.has(path) || path.startsWith("/legal");
}
