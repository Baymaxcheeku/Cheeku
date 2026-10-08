import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

import { kv } from "@/lib/storage";

import { parseLockDelay, type LockDelay } from "./lock-timing";

/*
 * The biometric app lock. Phase 5 item 2.
 *
 * WHAT THIS PROTECTS AGAINST, precisely: someone who has the reader's unlocked
 * phone in their hand. A partner, a colleague, a relative, whoever picked it up
 * off the table. That is not a hypothetical for a medical app — the records in
 * here include pregnancies, mental health, HIV panels and terminations, and
 * the person most likely to open the app uninvited is someone who already
 * knows the passcode.
 *
 * WHAT IT DOES NOT PROTECT AGAINST, and must never be described as though it
 * does: anything at all on a compromised device. The records are in the app's
 * own storage and the session is in the keychain; an attacker with root reads
 * both without ever seeing this screen. This is a lock on a door, not a safe.
 * It is worth having for exactly the reason above and no more.
 */

const ENABLED_KEY = "baymax.app-lock.enabled";
const GRACE_KEY = "cheeku.lock.grace";

/*
 * The gate reads the switch once at launch. Without this, turning the lock on
 * in Settings did nothing until the next cold start, which is exactly the
 * window in which someone believes they are protected and is not.
 */
const listeners = new Set<() => void>();

export function onLockSettingsChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function changed() {
  for (const l of listeners) l();
}

export type LockCapability =
  /** Hardware present and something is enrolled. The only state that can lock. */
  | { available: true; kind: "face" | "fingerprint" | "iris" | "passcode" }
  /** Hardware present, nothing enrolled. Worth saying, because it is fixable. */
  | { available: false; reason: "not-enrolled" }
  /** No usable hardware, or web. Nothing the reader can do. */
  | { available: false; reason: "unsupported" };

/**
 * What this device can actually do.
 *
 * The enrolment check is separate from the hardware check on purpose. Offering
 * a lock toggle on a phone with no fingerprint registered produces a switch
 * that turns on and then never challenges anybody — a security control that
 * silently does nothing is worse than none, because the reader stops worrying.
 */
export async function lockCapability(): Promise<LockCapability> {
  // expo-local-authentication has no web implementation. WebAuthn is not a
  // substitute: it proves possession of a credential, not that the person
  // holding this phone right now is its owner.
  if (Platform.OS === "web") return { available: false, reason: "unsupported" };

  const hardware = await LocalAuthentication.hasHardwareAsync();
  if (!hardware) return { available: false, reason: "unsupported" };

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!enrolled) return { available: false, reason: "not-enrolled" };

  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const { FACIAL_RECOGNITION, FINGERPRINT, IRIS } = LocalAuthentication.AuthenticationType;

  if (types.includes(FACIAL_RECOGNITION)) return { available: true, kind: "face" };
  if (types.includes(FINGERPRINT)) return { available: true, kind: "fingerprint" };
  if (types.includes(IRIS)) return { available: true, kind: "iris" };

  // Enrolled, but not with a biometric — a device passcode. Still a real
  // challenge, so still worth offering.
  return { available: true, kind: "passcode" };
}

/** What to call it on screen. Guessing "Face ID" on an Android phone is worse than saying nothing. */
export function lockName(kind: Extract<LockCapability, { available: true }>["kind"]): string {
  if (kind === "face") return Platform.OS === "ios" ? "Face ID" : "face unlock";
  if (kind === "fingerprint") return Platform.OS === "ios" ? "Touch ID" : "fingerprint";
  if (kind === "iris") return "iris unlock";
  return "device passcode";
}

export async function isLockEnabled(): Promise<boolean> {
  return (await kv.get(ENABLED_KEY)) === "1";
}

/**
 * Turning the lock ON requires passing it first.
 *
 * Otherwise someone who already has the phone can enable the lock against the
 * owner and hand it back, and the owner is now locked out of their own records
 * by a control they never set. Making enrolment prove itself keeps the switch
 * honest in both directions.
 */
export async function setLockEnabled(enabled: boolean): Promise<boolean> {
  if (enabled) {
    const passed = await authenticate("Confirm it's you to turn on the app lock");
    if (!passed) return false;
    await kv.set(ENABLED_KEY, "1");
    changed();
    return true;
  }

  /*
   * Turning it OFF also requires passing it. This is the case people forget:
   * a lock anybody can switch off from the settings screen behind it is not a
   * lock, and the settings screen is reachable the moment the app is unlocked.
   */
  const passed = await authenticate("Confirm it's you to turn off the app lock");
  if (!passed) return false;
  await kv.remove(ENABLED_KEY);
  changed();
  return true;
}

export async function lockDelay(): Promise<LockDelay> {
  return parseLockDelay(await kv.get(GRACE_KEY));
}

/**
 * A longer delay is a weaker lock, so it has to pass the challenge like the
 * switch does. A shorter one only makes the lock stricter and goes straight
 * through.
 */
export async function setLockDelay(next: LockDelay): Promise<boolean> {
  const current = await lockDelay();
  if (next > current) {
    const passed = await authenticate("Confirm it's you to change the auto-lock");
    if (!passed) return false;
  }
  await kv.set(GRACE_KEY, String(next));
  changed();
  return true;
}

/**
 * Run the challenge. True only on a real pass.
 *
 * FAILS CLOSED. Every error path returns false, including ones that are the
 * app's fault rather than the reader's, because the alternative is a bug that
 * unlocks medical records. The way out for someone whose biometrics have
 * genuinely broken is the sign-out escape on the lock screen, not a fallback
 * that quietly gives up.
 */
export async function authenticate(prompt: string): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: prompt,
      // The OS passcode sheet stays available. Biometrics fail for ordinary
      // reasons — wet hands, a mask, a cracked sensor — and a lock with no
      // second route strands people out of their own medical history.
      disableDeviceFallback: false,
      cancelLabel: "Cancel",
    });
    return result.success;
  } catch {
    return false;
  }
}
