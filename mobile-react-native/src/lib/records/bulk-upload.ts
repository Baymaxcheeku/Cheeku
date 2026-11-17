import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import { stripImageMetadata } from "@/lib/upload/strip-exif";

import { uploadDocument, type PickedFile } from "./upload";
import { ensureMediaAccess } from "@/lib/upload/media-access";

/*
 * Several past reports at once, filed under one member.
 *
 * Used when a member is added ("Got old reports? Add them now") and from the
 * member screen. Each file goes through exactly the path a single scan does:
 * location data stripped from photos first, then `uploadDocument`, which
 * re-checks that the member belongs to the account and that the plan covers
 * them. One at a time, in order, so a slow connection shows steady progress
 * instead of ten stalled bars, and a failure stops only its own file.
 */

export const MAX_QUEUE = 10;

export type QueueItem = {
  key: string;
  file: PickedFile;
  status: "waiting" | "uploading" | "done" | "failed";
  message?: string;
  documentId?: string;
};

let seq = 0;
function item(file: PickedFile): QueueItem {
  seq += 1;
  return { key: `${Date.now()}-${seq}`, file, status: "waiting" };
}

export async function pickFiles(): Promise<QueueItem[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "image/jpeg", "image/png", "image/heic"],
    copyToCacheDirectory: true,
    multiple: true,
  });
  if (result.canceled) return [];
  return result.assets.map((a) => item({ uri: a.uri, mimeType: a.mimeType ?? "application/pdf", name: a.name ?? "document.pdf" }));
}

export async function pickPhotos(): Promise<QueueItem[]> {
  if (!(await ensureMediaAccess("photos"))) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    selectionLimit: MAX_QUEUE,
    quality: 1,
    exif: false,
  });
  if (result.canceled) return [];
  return result.assets.map((a) => item({ uri: a.uri, mimeType: a.mimeType ?? "image/jpeg", name: a.fileName ?? "photo.jpg" }));
}

export async function snapPhoto(): Promise<QueueItem[]> {
  if (!(await ensureMediaAccess("camera"))) return [];
  const result = await ImagePicker.launchCameraAsync({ quality: 1, exif: false });
  if (result.canceled) return [];
  const a = result.assets[0];
  return a ? [item({ uri: a.uri, mimeType: a.mimeType ?? "image/jpeg", name: a.fileName ?? "photo.jpg" })] : [];
}

/** Uploads every waiting or failed item for `profileId`, reporting each change. */
export async function uploadQueue(
  profileId: string,
  items: QueueItem[],
  onUpdate: (key: string, patch: Partial<QueueItem>) => void,
): Promise<{ done: number; failed: number }> {
  let done = 0;
  let failed = 0;
  for (const it of items) {
    if (it.status === "done") {
      done += 1;
      continue;
    }
    onUpdate(it.key, { status: "uploading", message: undefined });
    const { uri, stripped } = await stripImageMetadata(it.file.uri, it.file.mimeType);
    const result = await uploadDocument(stripped ? { ...it.file, uri, mimeType: "image/jpeg" } : it.file, profileId);
    if (result.ok) {
      done += 1;
      onUpdate(it.key, { status: "done", documentId: result.documentId });
    } else {
      failed += 1;
      onUpdate(it.key, { status: "failed", message: result.message });
    }
  }
  return { done, failed };
}
