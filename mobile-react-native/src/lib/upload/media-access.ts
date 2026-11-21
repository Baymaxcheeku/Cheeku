import * as ImagePicker from "expo-image-picker";
import { Alert, Linking, Platform } from "react-native";

import { anySheetOpen } from "@/components/ui/sheet";
import { create } from "zustand";

/*
 * ASKING FOR THE CAMERA AND PHOTOS, IN OUR WORDS FIRST (owner, 17 Nov 2026).
 *
 * iOS shows its permission dialog exactly once. So the first time someone
 * taps "camera" or "photos" anywhere in the app, Cheeku explains in one sheet
 * what it needs and why, and only "Allow" triggers the system dialog. A "no"
 * costs nothing: the sheet comes back next time. If the system dialog was
 * already refused, the sheet says so and offers Settings instead.
 *
 * `ensureMediaAccess` is the one door every picker goes through; the sheet
 * itself (MediaAccessHost) is mounted once in the root layout.
 */

export type MediaKind = "photos" | "camera";
type Mode = "ask" | "settings";

type State = {
  kind: MediaKind | null;
  mode: Mode;
  resolve: ((ok: boolean) => void) | null;
  busy: boolean;
};

export const useMediaAccess = create<State>(() => ({ kind: null, mode: "ask", resolve: null, busy: false }));

/** iOS "Selected photos" counts as yes: the picker shows what they allowed. */
const limited = (p: object) => (p as { accessPrivileges?: string }).accessPrivileges === "limited";

async function current(kind: MediaKind) {
  try {
    return kind === "camera" ? await ImagePicker.getCameraPermissionsAsync() : await ImagePicker.getMediaLibraryPermissionsAsync();
  } catch {
    return null;
  }
}

/** True when the picker may open now; shows Cheeku's sheet first when it must ask. */
export async function ensureMediaAccess(kind: MediaKind): Promise<boolean> {
  const p = await current(kind);
  // Web, tests, or a platform that does not report: let the picker handle it.
  if (!p) return true;
  if (p.granted || (kind === "photos" && limited(p))) return true;
  const mode: Mode = p.canAskAgain === false ? "settings" : "ask";
  /*
   * Asked from inside a sheet (the meal sheet's "Take photo"): our explainer
   * is a sheet too, and iOS won't show it over another one, so the upload
   * hung and the screen stopped answering (owner, 20 Nov). The system's own
   * dialog and alerts do show over sheets, so use those here instead.
   */
  if (anySheetOpen()) {
    if (mode === "ask") return request(kind);
    return new Promise<boolean>((resolve) => {
      Alert.alert(
        kind === "camera" ? "Camera access is off" : "Photo access is off",
        "Turn it on for Cheeku in Settings, then come back.",
        [
          { text: "Not now", style: "cancel", onPress: () => resolve(false) },
          { text: "Open Settings", onPress: () => { void Linking.openSettings(); resolve(false); } },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
  }
  return new Promise<boolean>((resolve) => {
    useMediaAccess.setState({ kind, mode, resolve, busy: false });
  });
}

async function request(kind: MediaKind): Promise<boolean> {
  try {
    const r = kind === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    return r.granted || (kind === "photos" && limited(r));
  } catch {
    return false;
  }
}

/*
 * The sheet leaves in about 240 ms and its Modal is gone a moment later.
 * Opening the camera or library before that, iOS refuses to present it and
 * the picker never answers: the chat froze right after "Allow" (owner,
 * 20 Nov). So the caller hears back only once the sheet is truly gone.
 */
const SHEET_GONE_MS = Platform.OS === "ios" ? 480 : 260;

function finish(ok: boolean) {
  const { resolve } = useMediaAccess.getState();
  useMediaAccess.setState({ kind: null, resolve: null, busy: false });
  if (resolve) setTimeout(() => resolve(ok), SHEET_GONE_MS);
}

/** "Allow": the system dialog now, after the person chose to see it. */
export async function allowMediaAccess() {
  const { kind, mode } = useMediaAccess.getState();
  if (!kind) return;
  if (mode === "settings") {
    void Linking.openSettings();
    return finish(false);
  }
  useMediaAccess.setState({ busy: true });
  finish(await request(kind));
}

export function declineMediaAccess() {
  finish(false);
}
