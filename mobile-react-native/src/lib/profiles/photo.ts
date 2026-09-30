import { randomUUID } from "expo-crypto";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { supabase } from "@/lib/supabase/client";

/*
 * A real photo as someone's profile picture.
 *
 * WHAT HAPPENS TO THE PICTURE.
 *  - Picked with a square crop, from the camera or the library.
 *  - Re-drawn at 512 x 512 as a fresh JPEG, which throws away every EXIF tag
 *    (a phone photo carries the GPS of the room it was taken in) and keeps the
 *    upload around 60 KB.
 *  - Stored in the PRIVATE documents bucket at
 *    <user>/<profile>/avatar-<uuid>.jpg. The database only accepts a key in
 *    that exact shape under the owner's own folder (migration 0026).
 *  - Shown through a signed URL that lasts an hour, never a public link: a
 *    face is personal data, and a permanent URL to one is a permanent leak.
 *  - Replacing or removing it deletes the old file.
 */

export type PhotoResult = { ok: true; path: string } | { ok: false; message: string };

const EDGE = 512;

/** Opens the camera or the library with a square crop. Null if cancelled or refused. */
export async function pickPhoto(source: "camera" | "library"): Promise<string | null> {
  const permission =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
    exif: false,
  };
  const result =
    source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}

async function square(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  const image = await context.renderAsync();
  const side = Math.min(image.width, image.height);
  context.crop({ originX: (image.width - side) / 2, originY: (image.height - side) / 2, width: side, height: side });
  context.resize({ width: EDGE, height: EDGE });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
  return saved.uri;
}

/** Uploads a picked photo as this profile's picture and points the profile at it. */
export async function setProfilePhoto(profileId: string, uri: string): Promise<PhotoResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Your session expired. Please sign in again." };

  let clean: string;
  try {
    clean = await square(uri);
  } catch {
    // Unlike a report, a profile photo is never uploaded with its metadata
    // intact: better no photo than one carrying a home address.
    return { ok: false, message: "That photo couldn't be prepared. Try another one." };
  }

  const { data: existing } = await supabase.from("profiles").select("avatar_url").eq("id", profileId).maybeSingle();

  const path = `${user.id}/${profileId}/avatar-${randomUUID()}.jpg`;
  const bytes = await new File(clean).arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (uploadError) return { ok: false, message: "The photo didn't upload. Check your connection and try again." };

  const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", profileId);
  if (error) {
    await supabase.storage.from("documents").remove([path]);
    return { ok: false, message: "The photo didn't save. Try again." };
  }

  const old = existing?.avatar_url as string | null | undefined;
  if (old && old !== path) void supabase.storage.from("documents").remove([old]);
  return { ok: true, path };
}

/** Back to a drawn face. The file is deleted, not just unlinked. */
export async function clearProfilePhoto(profileId: string): Promise<PhotoResult> {
  const { data: existing } = await supabase.from("profiles").select("avatar_url").eq("id", profileId).maybeSingle();
  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", profileId);
  if (error) return { ok: false, message: "That didn't save. Try again." };
  const old = existing?.avatar_url as string | null | undefined;
  if (old) void supabase.storage.from("documents").remove([old]);
  return { ok: true, path: "" };
}

/** Signed, hour-long URLs for a batch of photo keys, in one request. */
export async function signPhotos(paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (paths.length === 0) return out;
  const { data } = await supabase.storage.from("documents").createSignedUrls(paths, 3600);
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) out.set(row.path, row.signedUrl);
  }
  return out;
}
