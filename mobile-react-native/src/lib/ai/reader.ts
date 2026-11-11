import { extractFromFile, type Extraction } from "@/lib/ai/mock/extract";
import type { DocType } from "@/lib/records/types";
import { supabase } from "@/lib/supabase/client";

import { readExtraction } from "./extraction";

/*
 * WHICH READER READS A SCAN.
 *
 * `EXPO_PUBLIC_DOC_READER=edge` sends the uploaded file's key to the
 * `doc-read` Edge Function, which has the AI API read it (Gemini, with the
 * analyte and medicine normalisers) and returns an Extraction. Anything else
 * reads with the stand-in, which is demo data. Either way nothing is filed
 * here: Check and save still shows what was read and asks about what the
 * reader was unsure of (Rule 12).
 *
 * NO STAND-IN WHEN THE REAL READER FAILS. The chat can fall back to its
 * stand-in because the stand-in only rephrases the person's own digest. The
 * stand-in READER invents a sample report. Showing that for someone's real
 * page, one tap from being filed into their records, would be fabricating a
 * medical record. So in edge mode a failure is a failure: Scan says the page
 * could not be read, removes the upload, and the person tries again.
 *
 * The file is never sent from the phone a second time. It is already in the
 * bucket under the key prepareUpload built; the function sends the key, and
 * the AI API fetches the object after checking the key is this account's and
 * this member's.
 */

const MODE = process.env.EXPO_PUBLIC_DOC_READER ?? "mock";

export type ReadInput = {
  path: string;
  profileId: string;
  mimeType: string;
  docType?: DocType;
  /** For the stand-in only, which routes on the picked file's name and size. */
  name: string;
  size: number;
};

export type ReadResult =
  | { ok: true; extraction: Extraction; reader: "edge" | "stand-in" }
  | { ok: false; reason: "busy" | "unreadable" };

/** The function's refusal status, when the error carries one. */
function statusOf(error: unknown): number | null {
  const res = (error as { context?: unknown } | null)?.context;
  return res instanceof Response ? res.status : null;
}

export async function readUpload(input: ReadInput): Promise<ReadResult> {
  if (MODE !== "edge") {
    return { ok: true, extraction: extractFromFile(input.name, input.size, input.docType), reader: "stand-in" };
  }
  try {
    const { data, error } = await supabase.functions.invoke("doc-read", {
      body: { path: input.path, profileId: input.profileId, mimeType: input.mimeType, ...(input.docType ? { docType: input.docType } : {}) },
    });
    if (error) return { ok: false, reason: statusOf(error) === 429 ? "busy" : "unreadable" };
    const extraction = readExtraction((data as { extraction?: unknown } | null)?.extraction, input.docType);
    return extraction ? { ok: true, extraction, reader: "edge" } : { ok: false, reason: "unreadable" };
  } catch {
    return { ok: false, reason: "unreadable" };
  }
}

/** What Scan says when a page could not be read. Content system: plain, no blame, one action. */
export const READ_FAILED: Record<"busy" | "unreadable", string> = {
  busy: "You've scanned a lot just now. Try again in a minute.",
  unreadable: "We couldn't read that page just now. Try again, or take a clearer photo.",
};
