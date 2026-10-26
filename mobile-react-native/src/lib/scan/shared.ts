import type { ShareIntentFile } from "expo-share-intent";
import { create } from "zustand";

import type { PickedFile } from "@/lib/records/upload";

/*
 * A FILE SHARED INTO CHEEKU (int-share-target).
 *
 * Most Indian reports arrive as a WhatsApp PDF or a photo. Sharing one to
 * Cheeku from WhatsApp, Files, Gmail or Photos lands it here, and Scan picks
 * it up instead of asking for a camera or a file: the person only says what
 * it is and whose it is, then checks what was read.
 *
 * Only the file's local copy, made by the system for the share, is held, in
 * memory, until Scan files it or the person drops it. Nothing is uploaded
 * before they choose who it belongs to.
 */

export const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/heic"] as const;

export type SharedFile = PickedFile & { size: number | null; accepted: boolean };

type State = { file: SharedFile | null; at: number };

export const useSharedFile = create<State>(() => ({ file: null, at: 0 }));

/** The first usable file of a share, normalised for the upload path. */
export function fromShare(files: readonly ShareIntentFile[] | null | undefined): SharedFile | null {
  const f = files?.[0];
  if (!f?.path) return null;
  const mime = normaliseMime(f.mimeType, f.fileName);
  return {
    uri: f.path.startsWith("file://") || f.path.startsWith("content://") ? f.path : `file://${f.path}`,
    mimeType: mime,
    name: f.fileName || (mime === "application/pdf" ? "shared.pdf" : "shared.jpg"),
    size: typeof f.size === "number" ? f.size : null,
    accepted: (ACCEPTED as readonly string[]).includes(mime),
  };
}

/** WhatsApp sometimes sends "image/jpg" or no type at all; read the name then. */
export function normaliseMime(mime: string | null | undefined, name: string | null | undefined): string {
  const m = (mime ?? "").toLowerCase();
  if (m === "image/jpg") return "image/jpeg";
  if (m && m !== "application/octet-stream" && m !== "*/*") return m;
  const ext = (name ?? "").toLowerCase().split(".").pop();
  return ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : ext === "heic" ? "image/heic" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : m || "application/octet-stream";
}

export function holdShared(file: SharedFile) {
  useSharedFile.setState({ file, at: Date.now() });
}

export function clearShared() {
  useSharedFile.setState({ file: null, at: 0 });
}
