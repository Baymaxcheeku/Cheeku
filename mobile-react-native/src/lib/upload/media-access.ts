import * as ImagePicker from "expo-image-picker";
import { Linking } from "react-native";
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
  return new Promise<boolean>((resolve) => {
    useMediaAccess.setState({ kind, mode, resolve, busy: false });
  });
}

function finish(ok: boolean) {
  const { resolve } = useMediaAccess.getState();
  useMediaAccess.setState({ kind: null, resolve: null, busy: false });
  resolve?.(ok);
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
  try {
    const r = kind === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    finish(r.granted || (kind === "photos" && limited(r)));
  } catch {
    finish(false);
  }
}

export function declineMediaAccess() {
  finish(false);
}
