import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/*
 * Removes image metadata before an upload leaves the device.
 *
 * A phone photo of a prescription carries EXIF: the GPS coordinates where it
 * was taken — usually someone's home — the device, and the timestamp. None of
 * that is needed to read a lab value, and a health app that quietly uploads the
 * user's home address alongside their blood work has leaked something it was
 * never asked to collect.
 *
 * Doing it ON DEVICE rather than on the server is the point: the coordinates
 * never cross the network at all, so there is no window in which they sit in a
 * request log or a temp file.
 *
 * THE MECHANISM IS A DECODE AND RE-ENCODE, exactly as the web build's canvas
 * round-trip was. Writing fresh pixels produces a file with no metadata chunks
 * at all — there is nothing to miss, unlike a parser that strips only the tags
 * it happens to know about. `expo-image-manipulator` is the native equivalent;
 * there is no canvas here.
 */

/** Re-encode quality. High enough that small print stays legible. */
const JPEG_QUALITY = 0.92;

/** Above this on either axis the image is scaled down before re-encoding. */
const MAX_EDGE = 3000;

export type StrippedImage = {
  uri: string;
  /** False when the file was passed through untouched, and why. */
  stripped: boolean;
};

/**
 * Returns a metadata-free copy of the image at `uri`.
 *
 * PDFs are not handled here and must not be passed in. They can carry metadata
 * too, but rewriting a PDF needs a parser, and a botched rewrite of a medical
 * document is worse than the metadata it removes.
 */
export async function stripImageMetadata(uri: string, mimeType: string): Promise<StrippedImage> {
  if (!mimeType.startsWith("image/")) return { uri, stripped: false };

  try {
    const context = ImageManipulator.manipulate(uri);
    const image = await context.renderAsync();

    /*
     * Scale down only when the source exceeds the cap. Resizing a small image
     * up, or resizing at all when it is unnecessary, costs sharpness on exactly
     * the small print this app exists to read.
     */
    const longest = Math.max(image.width, image.height);
    if (longest > MAX_EDGE) {
      const scale = MAX_EDGE / longest;
      context.resize({
        width: Math.round(image.width * scale),
        height: Math.round(image.height * scale),
      });
    }

    // Rendered again so the resize above is included; the first render only
    // existed to learn the source dimensions.
    const rendered = longest > MAX_EDGE ? await context.renderAsync() : image;
    const saved = await rendered.saveAsync({
      compress: JPEG_QUALITY,
      format: SaveFormat.JPEG,
    });

    return { uri: saved.uri, stripped: true };
  } catch {
    /*
     * Better to upload the original than to lose the document.
     *
     * A silent failure that uploaded a blank or truncated image would destroy
     * the record, which is far worse than keeping the metadata on it. The
     * caller is told the difference so the screen can say so rather than claim
     * a strip that did not happen.
     */
    return { uri, stripped: false };
  }
}
