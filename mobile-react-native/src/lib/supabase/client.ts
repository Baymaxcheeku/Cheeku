import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

/*
 * The Supabase client, and the one place session tokens are stored.
 *
 * WHY SECURESTORE AND NOT ASYNCSTORAGE. AsyncStorage is unencrypted: on
 * Android it is a plaintext file in the app sandbox, readable on a rooted
 * device or from a backup. This app's token grants access to a family's
 * medical history, so it lives in the Keychain / Keystore instead.
 *
 * SecureStore caps a value at 2048 bytes. A Supabase session with a long JWT
 * can exceed that, so the adapter chunks. Losing a chunk means losing the
 * session, which logs someone out; it never means serving the wrong session,
 * because a partial read fails closed and returns null.
 *
 * WEB FALLBACK exists only so the app can run in Expo's web preview during
 * development. SecureStore has no web implementation.
 */

const CHUNK = 1800;

/*
 * Readable once the phone has been unlocked once since it started, not only
 * while it is unlocked. The default (while unlocked) made a token refresh that
 * ran with the screen locked fail with "User interaction is not allowed".
 * Still device-only: never synced to iCloud, never in a backup.
 *
 * Passed on writes only. A read that names an accessibility can miss an item
 * saved under the old one, which would sign the person out; every refresh
 * rewrites the session, so old items move over on their own.
 */
const WRITE = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

const secureAdapter = {
  async getItem(key: string): Promise<string | null> {
    const head = await SecureStore.getItemAsync(`${key}.0`);
    if (head === null) return null;

    const count = Number(await SecureStore.getItemAsync(`${key}.n`));
    if (!Number.isFinite(count) || count < 1) return null;

    let out = head;
    for (let i = 1; i < count; i += 1) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`);
      // Fail closed: a half-read session is not a session.
      if (part === null) return null;
      out += part;
    }
    return out;
  },

  async setItem(key: string, value: string): Promise<void> {
    const parts = Math.ceil(value.length / CHUNK);
    await SecureStore.setItemAsync(`${key}.n`, String(parts), WRITE);
    for (let i = 0; i < parts; i += 1) {
      await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK), WRITE);
    }
  },

  async removeItem(key: string): Promise<void> {
    const count = Number(await SecureStore.getItemAsync(`${key}.n`));
    const parts = Number.isFinite(count) && count > 0 ? count : 1;
    for (let i = 0; i < parts; i += 1) {
      await SecureStore.deleteItemAsync(`${key}.${i}`);
    }
    await SecureStore.deleteItemAsync(`${key}.n`);
  },
};

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: Platform.OS === "web" ? AsyncStorage : secureAdapter,
    autoRefreshToken: true,
    persistSession: true,
    /*
     * There is no URL to read a session back from in a native app. Leaving
     * this on makes the client parse `window.location` on every start, which
     * does not exist here.
     */
    detectSessionInUrl: false,
  },
});

export const hasSupabaseConfig = Boolean(url && anonKey);

/*
 * Refresh the session only while the app is on screen. In the background the
 * phone may be locked, the keychain closed, and a refresh would fail and log a
 * red error. The client refreshes straight away when the app comes back.
 */
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}
