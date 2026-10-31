/*
 * EVERY PIECE OF DATA THIS APP KEEPS ON THE PHONE.
 *
 * The app has no cookies, but it has the same obligation a website's cookie
 * notice exists for: say what is stored on the device, why, for how long, and
 * when it goes. This list is that notice in code. The Storage and cache screen
 * renders it, sign-out reads it to decide what to wipe, and a test fails when a
 * key is written anywhere in the app without being listed here.
 *
 * SCOPE decides what sign-out does:
 *   account  About the person signed in. Wiped on sign-out, because the next
 *            person to sign in on this phone may be somebody else.
 *   device   About the phone, chosen by whoever holds it (the app lock, the
 *            offline setting). Kept across accounts, wiped on uninstall.
 *   session  The sign-in itself. Removed by Supabase's own sign-out.
 */

export type StorageScope = "account" | "device" | "session";
export type StorageWhere = "keychain" | "app-storage" | "temporary-files";
export type StorageContains = "health" | "personal" | "preference" | "credential";

export type StoredItem = {
  /** The key, or a prefix ending in "*" for a family of keys or files. */
  key: string;
  label: string;
  why: string;
  where: StorageWhere;
  contains: StorageContains;
  scope: StorageScope;
  /** How long it lives at most, in words. */
  lasts: string;
  /** Cleared by "Clear cache" as well as by sign-out. */
  cache?: boolean;
};

export const STORAGE_REGISTRY: readonly StoredItem[] = [
  {
    key: "sb-*-auth-token*",
    label: "Your sign-in",
    why: "Keeps you signed in between launches.",
    where: "keychain",
    contains: "credential",
    scope: "session",
    lasts: "Until you sign out or the session expires",
  },
  {
    key: "baymax_profile",
    label: "Family member you last viewed",
    why: "Opens the app on the same person.",
    where: "keychain",
    contains: "preference",
    scope: "account",
    lasts: "Until you sign out",
  },
  {
    key: "baymax_audience",
    label: "Sign-up choice (just me or family)",
    why: "Carries your choice through onboarding.",
    where: "keychain",
    contains: "preference",
    scope: "account",
    lasts: "24 hours",
  },
  {
    key: "baymax.offline.v1",
    label: "Offline copy of your records",
    why: "Lets you read records without a signal.",
    where: "app-storage",
    contains: "health",
    scope: "account",
    lasts: "Up to 7 days, or your setting",
    cache: true,
  },
  {
    key: "cheeku.appointments",
    label: "Upcoming appointments",
    why: "Shows your bookings and reminds you before them.",
    where: "keychain",
    contains: "health",
    scope: "account",
    lasts: "Until you sign out",
  },
  {
    key: "cheeku.serviceRequests",
    label: "Recent service requests",
    why: "Shows the status of care you asked for.",
    where: "keychain",
    contains: "health",
    scope: "account",
    lasts: "Until you sign out",
  },
  {
    key: "cheeku.labAddress",
    label: "Home collection address",
    why: "Saves typing it again for the next lab visit.",
    where: "keychain",
    contains: "personal",
    scope: "account",
    lasts: "Until you sign out",
  },
  {
    key: "cheeku.location",
    label: "Your last known place",
    why: "Shows nearby doctors, labs and classes at once on the next open, and whether to keep it up to date. The same place is saved to your account; Profile, Location wipes both.",
    where: "keychain",
    contains: "personal",
    scope: "account",
    lasts: "Until you change it, forget it or sign out",
  },
  {
    key: "cheeku.locationPrimer",
    label: "When we last asked about location",
    why: "So the location card on Home asks at most once a week.",
    where: "app-storage",
    contains: "preference",
    scope: "device",
    lasts: "Until the app is removed",
  },

  {
    key: "cheeku.serviceAddress",
    label: "Delivery and visit address",
    why: "Saves typing it again for the next booking.",
    where: "keychain",
    contains: "personal",
    scope: "account",
    lasts: "Until you sign out",
  },
  {
    key: "cheeku.notify",
    label: "Services you asked to hear about",
    why: "Moved to your account the next time you open Home, then removed.",
    where: "keychain",
    contains: "preference",
    scope: "account",
    lasts: "Until the next launch",
  },
  {
    key: "cheeku.pushToken",
    label: "This phone's notification address",
    why: "Lets reminders and results reach this phone.",
    where: "keychain",
    contains: "credential",
    scope: "account",
    lasts: "Until you sign out or switch notifications off",
  },
  {
    key: "cheeku.home",
    label: "Which Home you see",
    why: "Opens straight on Today once it's unlocked, without a flash of the starter screen.",
    where: "keychain",
    contains: "preference",
    scope: "account",
    lasts: "Until you sign out",
  },
  {
    key: "cheeku.pushPrimer",
    label: "Notification prompt seen",
    why: "So we only explain notifications once.",
    where: "keychain",
    contains: "preference",
    scope: "device",
    lasts: "Until uninstall",
  },
  {
    key: "baymax.app-lock.enabled",
    label: "App lock switch",
    why: "Remembers that this phone asks for Face ID, fingerprint or passcode.",
    where: "keychain",
    contains: "preference",
    scope: "device",
    lasts: "Until you switch it off",
  },
  {
    key: "cheeku.lock.grace",
    label: "Auto-lock timing",
    why: "How long the app can be away before it locks.",
    where: "keychain",
    contains: "preference",
    scope: "device",
    lasts: "Until uninstall",
  },
  {
    key: "cheeku.offline.prefs",
    label: "Offline reading setting",
    why: "Whether to keep an offline copy, and for how long.",
    where: "keychain",
    contains: "preference",
    scope: "device",
    lasts: "Until uninstall",
  },
  {
    key: "cheeku-ai-export-*",
    label: "Data export file",
    why: "The file you share when you download your data.",
    where: "temporary-files",
    contains: "health",
    scope: "account",
    lasts: "Removed after sharing",
    cache: true,
  },
  {
    key: "ImagePicker/*",
    label: "Photos being uploaded",
    why: "A copy the camera or gallery hands the app while a report uploads.",
    where: "temporary-files",
    contains: "health",
    scope: "account",
    lasts: "Until uploaded, or the cache is cleared",
    cache: true,
  },
  {
    key: "ImageManipulator/*",
    label: "Photos with location removed",
    why: "The cleaned copy uploaded in place of the original.",
    where: "temporary-files",
    contains: "health",
    scope: "account",
    lasts: "Until uploaded, or the cache is cleared",
    cache: true,
  },
  {
    key: "DocumentPicker/*",
    label: "PDFs being uploaded",
    why: "A copy the file picker hands the app while a report uploads.",
    where: "temporary-files",
    contains: "health",
    scope: "account",
    lasts: "Until uploaded, or the cache is cleared",
    cache: true,
  },
];

/** Exact keys (no wildcard) in app storage or the keychain, by scope. */
export function keysFor(scope: StorageScope): string[] {
  return STORAGE_REGISTRY.filter((i) => i.scope === scope && i.where !== "temporary-files" && !i.key.includes("*")).map((i) => i.key);
}

/** Cache-directory entries owned by the app, as prefixes. */
export function temporaryPrefixes(): string[] {
  return STORAGE_REGISTRY.filter((i) => i.where === "temporary-files").map((i) => i.key.replace(/\*$/, ""));
}

/** True when a key is listed, directly or under a wildcard. */
export function isRegistered(key: string): boolean {
  return STORAGE_REGISTRY.some((i) => {
    if (!i.key.includes("*")) return i.key === key;
    const re = new RegExp(`^${i.key.split("*").map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
    return re.test(key);
  });
}

export const WHERE_LABEL: Record<StorageWhere, string> = {
  keychain: "Secure keychain",
  "app-storage": "App storage",
  "temporary-files": "Temporary files",
};
