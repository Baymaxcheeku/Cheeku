import { Image, type ImageSourcePropType } from "react-native";

/*
 * Says why a bundled image did not draw, in development only.
 *
 * On an iPhone in Expo Go (2026-11-01) faces and Cheeku's face drew on Home
 * but came up as empty circles on Add a record, in chat and on Profile, while
 * the same files load from the dev server and the same values reach <Image>.
 * A blank circle says nothing; this puts the address and the native error in
 * a LogBox warning so the next run on the phone says what is going on.
 * Release builds never call it.
 */
export function onImageFailure(where: string, source: ImageSourcePropType | null | undefined) {
  if (!__DEV__) return undefined;
  // Takes React Native's error event or expo-image's error text.
  return (e: { nativeEvent?: { error?: string } } | string | undefined) => {
    let uri = "unknown";
    try {
      uri = typeof source === "number" ? (Image.resolveAssetSource(source)?.uri ?? `asset ${source}`) : JSON.stringify(source);
    } catch {
      // Only a diagnostic.
    }
    const why = typeof e === "string" ? e : (e?.nativeEvent?.error ?? "no error given");
    console.warn(`[image] ${where} did not load: ${why} (${uri})`);
  };
}
