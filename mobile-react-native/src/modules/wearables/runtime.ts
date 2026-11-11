import Constants from "expo-constants";
import { Platform } from "react-native";

/*
 * Where the app is running, as far as the native health stores care.
 *
 * Expo Go ships a fixed set of native modules. HealthKit and Health Connect
 * are not in it, and requiring either there throws. So every native adapter
 * asks here first and never touches its library otherwise.
 */

export function isExpoGo(): boolean {
  // "storeClient" is Expo Go; a development or store build is "standalone" or "bare".
  return Constants.executionEnvironment === "storeClient";
}

export function isWeb(): boolean {
  return Platform.OS === "web";
}

/** True where sample data is the only way to see the feature. */
export function needsDemo(): boolean {
  return isExpoGo() || isWeb();
}

export const OS = Platform.OS;
