/*
 * Removes image metadata before an upload leaves the browser.
 *
 * A phone photo of a prescription carries EXIF: the GPS coordinates where it was
 * taken — usually someone's home — the device, and the timestamp. None of that
 * is needed to read a lab value, and a health app that quietly uploads the
 * user's home address alongside their blood work has leaked something it was
 * never asked to collect.
 *
 * Doing it client-side rather than on the server is the point: the coordinates
 * never cross the network at all, so there is no window in which they sit in a
 * request log or a temp file.
 *
 * The mechanism is a canvas round-trip. Decoding to pixels and re-encoding
 * writes a fresh file with no metadata chunks — there is nothing to miss,
 * unlike a parser that strips the tags it knows about.
 */

/** Re-encode quality. High enough that small print stays legible. */
const JPEG_QUALITY = 0.92;

/** Above this on either axis the image is scaled down before re-encoding. */
const MAX_EDGE = 3000;

export type StripResult = { file: File; stripped: boolean };

/**
 * Returns a metadata-free copy of `file`, or the original when there is nothing
 * to strip.
 *
 * PDFs pass through untouched. They can carry metadata too, but rewriting a PDF
 * needs a parser, and a botched rewrite of a medical document is worse than the
 * metadata — that one is handled server-side in a later phase.
 */
export async function stripImageMetadata(file: File): Promise<StripResult> {
  if (!file.type.startsWith("image/")) return { file, stripped: false };

  /*
   * HEIC cannot be decoded by canvas in most browsers. Returning it untouched is
   * the honest outcome: a silent failure that uploaded a *blank* canvas would
   * destroy the document, which is far worse than keeping the metadata.
   */
  if (file.type === "image/heic") return { file, stripped: false };

  try {
    const bitmap = await createImageBitmap(file);

    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return { file, stripped: false };

    // A white ground, because a PNG with transparency flattened onto a
    // transparent canvas and encoded as JPEG comes out black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) return { file, stripped: false };

    /*
     * The name is replaced too, not just the metadata. Original filenames are
     * routinely "Ananya_CBC_Fortis.jpg" — the patient, the test and the hospital
     * in one string that would otherwise travel with the request.
     */
    return {
      file: new File([blob], "upload.jpg", { type: "image/jpeg", lastModified: Date.now() }),
      stripped: true,
    };
  } catch {
    // Better to upload the original than to lose the document.
    return { file, stripped: false };
  }
}
