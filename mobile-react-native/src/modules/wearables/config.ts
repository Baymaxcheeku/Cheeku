/*
 * Switches for the wearables layer. Everything here is safe to ship: there is
 * no key or secret in the app for any source.
 */

/** The whole layer. Off: no Home card, no Profile row, no chat notes, no sync. */
export const WEARABLES_ENABLED = process.env.EXPO_PUBLIC_WEARABLES !== "off";

/**
 * The direct Google Health connection (Fitbit and Pixel Watch). Built, and off
 * until the Google Cloud project has its keys in Supabase and, for real users,
 * has passed Google's review of its restricted scopes. Set
 * EXPO_PUBLIC_WEARABLES_GOOGLE=on in `.env.local` to try it with test accounts.
 */
export const GOOGLE_HEALTH_ENABLED = process.env.EXPO_PUBLIC_WEARABLES_GOOGLE === "on";

/** How far back a sync reads. Health Connect allows 30 days without extra permission. */
export const SYNC_DAYS = 14;

/** How many days stay in the phone's own copy, for the charts. */
export const KEEP_DAYS = 35;

/** A sync is skipped if the last one finished more recently than this. */
export const MIN_SYNC_GAP_MS = 10 * 60 * 1000;

/** Steps goal when the plan has not set one. */
export const DEFAULT_STEPS_GOAL = 8000;
