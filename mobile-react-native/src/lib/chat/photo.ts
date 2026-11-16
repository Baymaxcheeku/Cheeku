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

/** Opens the camera or the library. Null if cancelled; a sentence if it could not. */
export async function pickChatPhoto(source: "camera" | "library"): Promise<ChatPhoto | null | string> {
  try {
    const permission = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return source === "camera" ? "Cheeku needs the camera for this. Allow it in Settings, or choose a photo instead." : "Cheeku needs your photos for this. Allow it in Settings.";
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: false, quality: 1, exif: false };
    const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return null;
    const asset = result.assets[0];
    if (!asset?.uri) return null;
    return await prepare(asset.uri, asset.width, asset.height);
  } catch {
    return "Couldn't open that photo. Try another one.";
  }
}

/** The long side to `edge`, never upscaled. */
export function fit(width: number, height: number, edge: number): { width: number } | { height: number } | null {
  if (!width || !height || Math.max(width, height) <= edge) return null;
  return width >= height ? { width: edge } : { height: edge };
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
  return image.saveAsync({ compress, format: SaveFormat.JPEG, base64: true });
}

async function prepare(uri: string, width: number, height: number): Promise<ChatPhoto | string> {
  const big = await render(uri, width, height, LONG_EDGE, 0.75);
  const small = await render(uri, width, height, THUMB_EDGE, 0.6);
  if (!big.base64 || !small.base64) return "Couldn't read that photo. Try another one.";
  return { uri: big.uri, image: { mimeType: "image/jpeg", data: big.base64 }, thumb: `data:image/jpeg;base64,${small.base64}` };
}
