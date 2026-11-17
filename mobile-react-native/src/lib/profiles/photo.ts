import { randomUUID } from "expo-crypto";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase/client";
import { ensureMediaAccess } from "@/lib/upload/media-access";

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
 *
 * IT NEVER HANGS. The first version could leave the Save button spinning for
 * good: anything that threw (reading the file on web, a dropped connection
 * mid-upload) escaped the function, and a request on a dead network simply
 * never answered. Now every step has a time limit, nothing throws out of
 * here, and each failure comes back as a plain sentence the screen can show.
 */

export type PhotoResult = { ok: true; path: string } | { ok: false; message: string };

const EDGE = 512;

/** Opens the camera or the library with a square crop. Null if cancelled or refused. */
export async function pickPhoto(source: "camera" | "library"): Promise<string | null> {
  // Cheeku's own sheet first, the system dialog only after "Allow" (lib/upload/media-access).
  if (!(await ensureMediaAccess(source === "camera" ? "camera" : "photos"))) return null;

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

class TimedOut extends Error {}

/** Rejects if `work` hasn't settled in `ms`. The work itself isn't cancelled. */
function within<T>(ms: number, work: PromiseLike<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimedOut()), ms);
    Promise.resolve(work).then(
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

/*
 * The picked file as bytes. Native reads it off disk; on web the picker and
 * the manipulator hand back blob: or data: URLs, which expo-file-system
 * cannot open, so fetch reads those.
 */
async function readBytes(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === "web") return (await fetch(uri)).arrayBuffer();
  return new File(uri).arrayBuffer();
}

async function currentUserId(): Promise<string | null> {
  // The stored session first: no network, so no waiting on a slow line just
  // to learn who we are. The database checks it on every write regardless.
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.id) return data.session.user.id;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

const OFFLINE = "No connection just now. Your photo isn't saved yet; try again in a moment.";

/** Uploads a picked photo as this profile's picture and points the profile at it. */
export async function setProfilePhoto(profileId: string, uri: string): Promise<PhotoResult> {
  try {
    const userId = await within(10_000, currentUserId());
    if (!userId) return { ok: false, message: "Your session expired. Please sign in again." };

    let bytes: ArrayBuffer;
    try {
      const clean = await within(20_000, square(uri));
      bytes = await within(10_000, readBytes(clean));
    } catch {
      // Unlike a report, a profile photo is never uploaded with its metadata
      // intact: better no photo than one carrying a home address.
      return { ok: false, message: "That photo couldn't be prepared. Try another one." };
    }
    if (bytes.byteLength === 0) return { ok: false, message: "That photo came through empty. Try another one." };

    const { data: existing } = await within(10_000, supabase.from("profiles").select("avatar_url").eq("id", profileId).maybeSingle());

    const path = `${userId}/${profileId}/avatar-${randomUUID()}.jpg`;
    // "network" when it never got an answer, "server" when storage said no.
    const upload = async (): Promise<"ok" | "network" | "server"> => {
      try {
        const { error } = await within(20_000, supabase.storage.from("documents").upload(path, bytes, { contentType: "image/jpeg", upsert: true }));
        if (!error) return "ok";
        return typeof (error as { status?: unknown }).status === "number" ? "server" : "network";
      } catch {
        return "network";
      }
    };
    // One retry, only for a lost connection: a phone switching from wifi to
    // data drops the first attempt often enough to be worth it, and `upsert`
    // makes the retry safe if the first attempt did land. A refusal from
    // storage will only be refused again.
    let sent = await upload();
    if (sent === "network") sent = await upload();
    if (sent === "network") return { ok: false, message: OFFLINE };
    if (sent === "server") return { ok: false, message: "The photo didn't upload. Try again, or pick a different photo." };

    const { error } = await within(15_000, supabase.from("profiles").update({ avatar_url: path }).eq("id", profileId));
    if (error) {
      void supabase.storage.from("documents").remove([path]);
      return { ok: false, message: "The photo uploaded but didn't attach to the profile. Try again." };
    }

    const old = existing?.avatar_url as string | null | undefined;
    if (old && old !== path) void supabase.storage.from("documents").remove([old]);
    return { ok: true, path };
  } catch (e) {
    return { ok: false, message: e instanceof TimedOut ? OFFLINE : "The photo didn't save. Try again." };
  }
}

/** Back to a drawn face. The file is deleted, not just unlinked. */
export async function clearProfilePhoto(profileId: string): Promise<PhotoResult> {
  try {
    const { data: existing } = await within(10_000, supabase.from("profiles").select("avatar_url").eq("id", profileId).maybeSingle());
    const { error } = await within(15_000, supabase.from("profiles").update({ avatar_url: null }).eq("id", profileId));
    if (error) return { ok: false, message: "That didn't save. Try again." };
    const old = existing?.avatar_url as string | null | undefined;
    if (old) void supabase.storage.from("documents").remove([old]);
    return { ok: true, path: "" };
  } catch (e) {
    return { ok: false, message: e instanceof TimedOut ? OFFLINE : "That didn't save. Try again." };
  }
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
