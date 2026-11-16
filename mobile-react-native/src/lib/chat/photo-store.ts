import { useQuery } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { File } from "expo-file-system";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase/client";

import { keepableCopy, within, type ChatPhoto } from "./photo";

/*
 * WHERE A CHAT PHOTO GOES AFTER IT IS ASKED ABOUT.
 *
 *  - By default, nowhere. The message keeps the model's description of it
 *    (attachment.summary) and that is the memory: photosFor() hands the last
 *    few descriptions back to the model on later turns.
 *  - "Keep photo" uploads a re-drawn copy (lib/chat/photo keepableCopy) to the
 *    private documents bucket at <user>/<profile>/chat-<uuid>.jpg, the folder
 *    the bucket's own policies (0005) tie to the signed-in user. It is shown
 *    through an hour-long signed URL, never a public link.
 *  - For the rest of the visit the bubble shows the photo from the phone
 *    (sessionPhoto), whether or not it was kept.
 */

const BUCKET = "documents";
const local = new Map<string, string>();

/** The phone's copy of a photo sent this visit, by message id. Gone when the app closes. */
export function rememberSessionPhoto(messageId: string, uri: string) {
  local.set(messageId, uri);
}
export function sessionPhoto(messageId: string): string | null {
  return local.get(messageId) ?? null;
}

async function readBytes(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === "web" || uri.startsWith("data:") || uri.startsWith("blob:")) return (await fetch(uri)).arrayBuffer();
  return new File(uri).arrayBuffer();
}

/** Uploads the kept copy. The path, or null if it could not be kept (the answer is saved regardless). */
export async function keepPhoto(userId: string, profileId: string, photo: ChatPhoto): Promise<string | null> {
  try {
    const bytes = await within(15_000, readBytes(await keepableCopy(photo)));
    if (!bytes.byteLength) return null;
    const path = `${userId}/${profileId}/chat-${randomUUID()}.jpg`;
    const { error } = await within(30_000, supabase.storage.from(BUCKET).upload(path, bytes, { contentType: "image/jpeg", upsert: false }));
    return error ? null : path;
  } catch {
    return null;
  }
}

/** Removes a kept copy whose message never saved. Best effort. */
export async function dropKeptPhoto(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path]).then(
    () => undefined,
    () => undefined,
  );
}

/** A kept photo, through a signed URL that lasts an hour. */
export function useKeptPhoto(path: string | null) {
  return useQuery({
    queryKey: ["chat-photo", path],
    enabled: Boolean(path),
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path as string, 3600);
      return data?.signedUrl ?? null;
    },
  });
}

/** What their last photos showed, newest first, for the model's memory. Best effort: [] on any failure. */
export async function photosFor(profileId: string): Promise<{ date: string; summary: string }[]> {
  try {
    const convos = await supabase.from("conversations").select("id").eq("profile_id", profileId).order("created_at", { ascending: false }).limit(60);
    const ids = (convos.data ?? []).map((c) => c.id as string);
    if (!ids.length) return [];
    const { data } = await supabase
      .from("messages")
      .select("created_at, attachment")
      .in("conversation_id", ids)
      .eq("role", "user")
      .eq("attachment->>kind", "photo")
      .order("created_at", { ascending: false })
      .limit(8);
    return (data ?? [])
      .map((r) => ({ date: String(r.created_at).slice(0, 10), summary: (r.attachment as { summary?: unknown } | null)?.summary }))
      .filter((r): r is { date: string; summary: string } => typeof r.summary === "string" && r.summary.trim().length > 0);
  } catch {
    return [];
  }
}
