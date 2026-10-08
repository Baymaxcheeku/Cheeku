import { useQuery } from "@tanstack/react-query";
import { Platform } from "react-native";

import { APP_VERSION } from "@/lib/app-meta";
import { supabase } from "@/lib/supabase/client";

import { consentedFingerprint, consentedVersions } from "./documents";
import { REQUIRED_PURPOSES, isPurpose, isRequired, type OptionalPurpose, type Purpose } from "./purposes";

/*
 * Consent, client side.
 *
 * The database is the authority (migration 0031): `record_consent` is the only
 * write path, `my_consent_state` is the only read, and a trigger refuses new
 * health data without the required consent. Everything here is a thin,
 * honest layer over those three, plus a pure mirror of the state logic so it
 * can be tested without a database.
 *
 * BEFORE 0031 IS APPLIED the functions do not exist. Blocking every user
 * behind a sheet they cannot complete would be worse than no sheet, so the
 * state comes back `available: false` and the gate stays out of the way, and
 * a decision is still written to the old `consent_log` columns so nothing a
 * person agrees to is lost.
 */

export type ConsentMethod = "signup_checkbox" | "reconsent_sheet" | "privacy_settings" | "withdrawal";

export type Decision = { granted: boolean; at: string; method: string | null; versions: Record<string, string> | null };

export type ConsentReason = "never" | "withdrawn" | "updated";

export type ConsentState = {
  /** False when the backend has no consent functions yet. The gate never blocks then. */
  available: boolean;
  /** The latest decision for each purpose that has one. */
  decisions: Partial<Record<Purpose, Decision>>;
  currentVersions: Record<string, string>;
  acceptedVersions: Record<string, string>;
  missing: Purpose[];
  stale: string[];
  needsConsent: boolean;
  reason: ConsentReason | null;
};

export const CONSENT_KEY = ["consent-state"] as const;

const missingFunction = (message: string | undefined) =>
  Boolean(message && /could not find the function|function .* does not exist|schema cache/i.test(message));

// ------------------------------------------------------------------ pure --

export type LedgerRow = {
  consent_type: string;
  granted: boolean;
  granted_at: string;
  method?: string | null;
  document_versions?: Record<string, string> | null;
  seq?: number | null;
};

/**
 * The same answer `my_consent_state()` gives, from raw ledger rows.
 *
 * Kept in lockstep with the SQL on purpose: tests pin the cases here, and the
 * local Postgres scenarios (supabase/manual/local-check) pin them there.
 */
export function evaluateConsent(rows: readonly LedgerRow[], current: Record<string, string>): Omit<ConsentState, "available"> {
  const latest: Partial<Record<Purpose, Decision & { seq: number }>> = {};
  for (const r of rows) {
    if (!isPurpose(r.consent_type)) continue;
    const seq = r.seq ?? 0;
    const prev = latest[r.consent_type];
    const newer = !prev || r.granted_at > prev.at || (r.granted_at === prev.at && seq > prev.seq);
    if (newer) latest[r.consent_type] = { granted: r.granted, at: r.granted_at, method: r.method ?? null, versions: r.document_versions ?? null, seq };
  }

  const decisions: Partial<Record<Purpose, Decision>> = {};
  for (const [k, v] of Object.entries(latest)) {
    const { seq: _seq, ...d } = v as Decision & { seq: number };
    decisions[k as Purpose] = d;
  }

  const missing = REQUIRED_PURPOSES.filter((p) => !decisions[p]?.granted);
  const seen = REQUIRED_PURPOSES.filter((p) => decisions[p]).length;
  const acceptedVersions = decisions.health_records?.versions ?? {};
  // YYYY-MM-DD compares correctly as a string.
  const stale = Object.entries(current)
    .filter(([k, v]) => (acceptedVersions[k] ?? "") < v)
    .map(([k]) => k);

  const reason: ConsentReason | null = seen === 0 ? "never" : missing.length ? "withdrawn" : stale.length ? "updated" : null;
  return { decisions, currentVersions: current, acceptedVersions, missing, stale, needsConsent: reason !== null, reason };
}

/** Parses the jsonb `my_consent_state()` returns. Unknown purposes (legacy rows) are dropped. */
export function parseState(raw: unknown): ConsentState {
  const o = (raw ?? {}) as Record<string, unknown>;
  const purposes = (o.purposes ?? {}) as Record<string, { granted?: boolean; at?: string; method?: string | null; versions?: Record<string, string> | null }>;
  const decisions: Partial<Record<Purpose, Decision>> = {};
  for (const [k, v] of Object.entries(purposes)) {
    if (!isPurpose(k)) continue;
    decisions[k] = { granted: Boolean(v.granted), at: String(v.at ?? ""), method: v.method ?? null, versions: v.versions ?? null };
  }
  const reason = o.reason === "never" || o.reason === "withdrawn" || o.reason === "updated" ? o.reason : null;
  return {
    available: true,
    decisions,
    currentVersions: (o.current_versions ?? {}) as Record<string, string>,
    acceptedVersions: (o.accepted_versions ?? {}) as Record<string, string>,
    missing: ((o.missing ?? []) as string[]).filter(isPurpose),
    stale: (o.stale ?? []) as string[],
    needsConsent: Boolean(o.needs_consent),
    reason,
  };
}

/** Whether an optional use is switched on right now. */
export function optionalOn(state: ConsentState | undefined, purpose: OptionalPurpose): boolean {
  return Boolean(state?.decisions[purpose]?.granted);
}

// --------------------------------------------------------------- context --

export function deviceContext() {
  const source = Platform.OS === "ios" || Platform.OS === "android" || Platform.OS === "web" ? Platform.OS : null;
  let locale: string | null = null;
  try {
    locale = Intl.DateTimeFormat().resolvedOptions().locale.slice(0, 16);
  } catch {
    locale = null;
  }
  return { source, app_version: APP_VERSION.slice(0, 32), locale };
}

/**
 * What the sign-up form sends in the new user's metadata. The database
 * trigger turns it into ledger rows inside the insert that creates the
 * account (migration 0031, section 5).
 */
export function signupConsentPayload() {
  return {
    accepted: true,
    purposes: [...REQUIRED_PURPOSES],
    versions: consentedVersions(),
    fingerprint: consentedFingerprint(),
    agreed_at: new Date().toISOString(),
    ...deviceContext(),
  };
}

// ------------------------------------------------------------------- io --

export async function fetchConsentState(): Promise<ConsentState> {
  const { data, error } = await supabase.rpc("my_consent_state");
  if (!error) {
    // Null means no session; nothing to ask.
    if (data === null) return { ...evaluateConsent([], {}), available: false, needsConsent: false, reason: null };
    return parseState(data);
  }
  if (missingFunction(error.message)) {
    return { ...evaluateConsent([], {}), available: false, needsConsent: false, reason: null };
  }
  throw new Error(`consent: ${error.message}`);
}

export type RecordResult =
  | { ok: true; state: ConsentState }
  | { ok: false; kind: "stale" | "consent_required" | "network"; message: string };

/**
 * Writes one decision about one or more purposes.
 *
 * Required purposes are always agreed together (the database refuses
 * otherwise), so a grant that touches any of them is widened to all of them
 * here rather than failing.
 */
export async function recordConsent(purposes: readonly Purpose[], granted: boolean, method: ConsentMethod): Promise<RecordResult> {
  const list = granted && purposes.some(isRequired) ? [...new Set([...REQUIRED_PURPOSES, ...purposes])] : [...purposes];
  const ctx = deviceContext();
  const { data, error } = await supabase.rpc("record_consent", {
    p_purposes: list,
    p_granted: granted,
    p_method: method,
    p_versions: consentedVersions(),
    p_fingerprint: consentedFingerprint(),
    p_source: ctx.source,
    p_app_version: ctx.app_version,
    p_locale: ctx.locale,
  });
  if (!error) return { ok: true, state: parseState(data) };

  const hint = `${error.hint ?? ""} ${error.message ?? ""}`;
  if (/stale_terms|have been updated/.test(hint)) {
    return { ok: false, kind: "stale", message: "These terms have been updated. Please update Cheeku AI to the latest version, then try again." };
  }
  if (/consent_required/.test(hint)) {
    return { ok: false, kind: "consent_required", message: "Agree to the required uses first, then you can turn this on." };
  }
  if (missingFunction(error.message)) {
    // Before 0031: keep the decision in the columns the old ledger has.
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return { ok: false, kind: "network", message: "Your session expired. Please sign in again." };
    const version = consentedVersions().health_consent ?? "unversioned";
    const { error: insertError } = await supabase
      .from("consent_log")
      .insert(list.map((p) => ({ user_id: user.id, consent_type: p, version, granted })));
    if (insertError) return { ok: false, kind: "network", message: "Could not save that. Check your connection and try again." };
    return { ok: true, state: { ...evaluateConsent([], {}), available: false, needsConsent: false, reason: null } };
  }
  return { ok: false, kind: "network", message: "Could not save that. Check your connection and try again." };
}

/**
 * After sign-up, make sure the consent reached the ledger.
 *
 * The trigger normally writes it. If it did not (an older database, or a
 * malformed payload the trigger refused to block sign-up over), the person
 * ticked the box seconds ago in this same session, so recording it now is
 * recording what they did, not assuming it.
 */
export async function ensureSignupConsent(): Promise<void> {
  try {
    const state = await fetchConsentState();
    if (state.available && state.reason === "never") await recordConsent(REQUIRED_PURPOSES, true, "signup_checkbox");
  } catch {
    // The gate asks on launch if this fails. Never block sign-in on it.
  }
}

/** A write refused by the consent guard. Callers show the gate rather than a generic error. */
export function isConsentError(error: unknown): boolean {
  const e = error as { hint?: string; message?: string } | null;
  return Boolean(e && /consent_required|consent is needed/.test(`${e.hint ?? ""} ${e.message ?? ""}`));
}

/*
 * A save refused by the consent guard, reported from wherever it happened.
 *
 * The write paths (upload, chat) are plain functions with no query client, so
 * they cannot refresh the consent state themselves. They report here, and the
 * gate, which listens, refetches and shows the sheet at once instead of
 * waiting for the next foreground.
 */
const refusedListeners = new Set<() => void>();

export function onConsentRefused(listener: () => void): () => void {
  refusedListeners.add(listener);
  return () => refusedListeners.delete(listener);
}

/** Brings up the consent sheet now, from a screen that found consent missing. */
export function askForConsent(): void {
  for (const l of refusedListeners) l();
}

/** Call with the error from a refused write. Returns true when it was a consent refusal. */
export function reportIfConsentRefused(error: unknown): boolean {
  if (!isConsentError(error)) return false;
  askForConsent();
  return true;
}

/** What to tell someone whose save was refused, while the sheet opens. */
export const CONSENT_PAUSED = "Cheeku is paused until you agree to the terms. Nothing was saved.";

export function useConsentState(enabled = true) {
  return useQuery({ queryKey: CONSENT_KEY, queryFn: fetchConsentState, enabled, staleTime: 5 * 60_000 });
}
