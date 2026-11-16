import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

/*
 * A PHOTO ASKED ABOUT IN CHAT (a medicine strip, a rash, a food label, a report).
 *
 * WHAT HAPPENS TO THE PICTURE.
 *  - Picked from the camera or the library, no crop.
 *  - Re-drawn as a fresh JPEG at most 1280 px on the long side. That throws
 *    away every EXIF tag (a phone photo carries the GPS of the room it was
 *    taken in) and keeps it around 150 to 300 KB.
 *  - That copy goes to the cheeku-chat Edge Function with the question and on
 *    to the model, once. It is never uploaded to storage and never saved.
 *  - A 256 px thumbnail is kept on the person's own message (messages.attachment,
 *    under the same RLS as the words), so the thread still shows what was asked about.
 *
 * IT NEVER HANGS (2026-11-17). The first version froze the chat on opening the
 * gallery: it opened the system picker from inside our own bottom sheet while
 * the sheet was still animating away (iOS will not present over a dismissing
 * modal, and the picker's promise then never settles), and it asked for photo
 * library permission the system picker doesn't need. Now:
 *  - the caller opens the picker from a native action sheet or straight from
 *    the tap, never from one of our modals (app/(app)/ask.tsx);
 *  - the library opens without a permission prompt (the system picker runs
 *    out of process and only hands back what was chosen);
 *  - the big copy is made first and the thumbnail from IT, not from the
 *    full-size original, so a 48 MP photo is decoded once;
 *  - preparing the photo has a time limit and every failure is a sentence.
 */

export type ChatPhoto = {
  /** For the preview above the composer. */
  uri: string;
  /** What the model sees. */
  image: { mimeType: "image/jpeg"; data: string };
  /** What the thread keeps: a small data: URI. */
  thumb: string;
};

const LONG_EDGE = 1280;
const THUMB_EDGE = 256;
const PREPARE_MS = 20_000;

/**
 * Opens the camera or the library. Resolves to null if cancelled, a sentence
 * if it couldn't. `onPicked` fires as soon as a photo is chosen, before it is
 * prepared, so the screen can show it is working.
 */
export async function pickChatPhoto(source: "camera" | "library", onPicked?: () => void): Promise<ChatPhoto | null | string> {
  let asset: ImagePicker.ImagePickerAsset | undefined;
  try {
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return "Cheeku needs the camera for this. Allow it in Settings, or choose a photo instead.";
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: false, allowsMultipleSelection: false, quality: 1, exif: false };
    const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return null;
    asset = result.assets[0];
  } catch {
    return source === "camera" ? "Couldn't open the camera. Try choosing a photo instead." : "Couldn't open your photos. Try again.";
  }
  if (!asset?.uri) return null;
  onPicked?.();
  try {
    return await within(PREPARE_MS, prepare(asset.uri, asset.width, asset.height));
  } catch {
    return "That photo took too long to read. Try another one.";
  }
}

/** The long side to `edge`, never upscaled. */
export function fit(width: number, height: number, edge: number): { width: number } | { height: number } | null {
  if (!width || !height || Math.max(width, height) <= edge) return null;
  return width >= height ? { width: edge } : { height: edge };
}

/** Rejects if `work` hasn't settled in `ms`. */
export function within<T>(ms: number, work: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timed_out")), ms);
    work.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

/** base64 from a save result, which on web may only come back as a data: URI. */
function base64Of(saved: { uri: string; base64?: string | null }): string | null {
  if (saved.base64) return saved.base64;
  const m = /^data:image\/[a-z]+;base64,(.+)$/i.exec(saved.uri);
  return m?.[1] ?? null;
}

async function render(uri: string, width: number, height: number, edge: number, compress: number) {
  const context = ImageManipulator.manipulate(uri);
  if (!width || !height) {
    // Web pickers can leave the size out: read it off the image first.
    const first = await context.renderAsync();
    width = first.width;
    height = first.height;
  }
  const size = fit(width, height, edge);
  if (size) context.resize(size);
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress, format: SaveFormat.JPEG, base64: true });
  return { uri: saved.uri, width: saved.width, height: saved.height, base64: base64Of(saved) };
}

async function prepare(uri: string, width: number, height: number): Promise<ChatPhoto | string> {
  const big = await render(uri, width, height, LONG_EDGE, 0.75);
  // From the 1280 px copy, not the original: one full-size decode, not two.
  const small = await render(big.uri, big.width, big.height, THUMB_EDGE, 0.6);
  if (!big.base64 || !small.base64) return "Couldn't read that photo. Try another one.";
  return { uri: big.uri, image: { mimeType: "image/jpeg", data: big.base64 }, thumb: `data:image/jpeg;base64,${small.base64}` };
}
