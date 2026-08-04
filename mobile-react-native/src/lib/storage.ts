import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/*
 * Small key/value storage for things that are not secrets.
 *
 * Two callers so far: the onboarding audience hint and the active profile id.
 * Neither is sensitive on its own, but both are read back and acted on, so they
 * go to SecureStore on device for the same reason the session does — a value
 * that decides *whose medical records are shown* should not sit in a plaintext
 * file that survives in an Android backup.
 *
 * THE WEB BRANCH IS A DEVELOPMENT AFFORDANCE, NOT A FALLBACK POSITION.
 * `expo-secure-store` ships a literally empty module for web (`export default
 * {}`), so every call there is a silent no-op that loses the value rather than
 * throwing. The preview is the only place this runs on web, and AsyncStorage
 * matches what lib/supabase/client.ts already does for the session there.
 */

const web = Platform.OS === "web";

export const kv = {
  get: (key: string): Promise<string | null> =>
    web ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key),

  set: (key: string, value: string): Promise<void> =>
    web ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value),

  remove: (key: string): Promise<void> =>
    web ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key),
};
