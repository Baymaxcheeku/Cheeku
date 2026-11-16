import { useState } from "react";
import { Image } from "react-native";
import { SvgXml } from "react-native-svg";

/*
 * A doctor's picture: the real photo when the partner sends one, the
 * illustrated face when it doesn't, or when the photo fails to load. Fills
 * its parent (give the parent the size, radius and overflow hidden).
 */
export type Face = { svg: string; background: string; photo?: string | null };

export function FaceArt({ face, size }: { face: Face; size: number }) {
  const [broken, setBroken] = useState(false);
  if (face.photo && !broken) {
    return <Image source={{ uri: face.photo }} onError={() => setBroken(true)} resizeMode="cover" accessibilityIgnoresInvertColors style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: face.background }} />;
  }
  return <SvgXml xml={face.svg} width={size} height={size} />;
}

/** A logo when there is one, else the fallback (a monogram, an icon). */
export function LogoArt({ uri, fallback }: { uri: string | null | undefined; fallback: React.ReactNode }) {
  const [broken, setBroken] = useState(false);
  if (!uri || broken) return <>{fallback}</>;
  return <Image source={{ uri }} onError={() => setBroken(true)} resizeMode="contain" accessibilityIgnoresInvertColors style={{ width: "78%", height: "78%" }} />;
}
