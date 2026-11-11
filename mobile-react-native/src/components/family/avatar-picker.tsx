import { Camera, Check, ImagePlus, Shuffle, X } from "lucide-react-native";
import { Image, Text, View, type ImageSourcePropType } from "react-native";
import { Pressable } from "@/components/ui/pressable";

import { Avatar } from "@/components/ui/avatar";
import { KID_FACE_IDS } from "@/lib/profiles/face-pool";
import { allFaces, type Face } from "@/lib/profiles/faces";
import { brand, ink, lilac, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { Tap } from "@/components/ui/tap";

/*
 * Choose how someone looks: a real photo, or one of the app's own faces.
 *
 *   photo     Take one or choose one. Square-cropped, stripped of location
 *             data and stored privately (lib/profiles/photo.ts).
 *   grid      twenty illustrated faces, five to a row, all on one screen:
 *             three rows of grown-ups and one of children. No tabs: a set
 *             this size is quicker to scan whole than to page through, and
 *             it is never grouped or labelled by gender.
 *
 * A photo wins while it is set; picking a face clears it. When the person
 * being added is plainly a child (`kidsFirst`), the children's row leads.
 *
 * Rows are built by hand, never a wrapping row: a wrapped flex row once
 * stretched its tiles to full screen height on iOS (PROGRESS.md).
 */

const PER_ROW = 5;

export function AvatarPicker({
  value,
  onChange,
  derived,
  onShuffle,
  photo,
  onPickPhoto,
  onClearPhoto,
  kidsFirst = false,
  size = 52,
}: {
  /** The picked catalogue id, or "" for none / the generated face. */
  value: string;
  onChange: (seed: string) => void;
  /** An existing member's generated face, offered as "Keep generated face". */
  derived?: { svg: string; background: string; image?: ImageSourcePropType };
  onShuffle?: () => void;
  /** A photo (local file or signed URL) currently chosen, if any. */
  photo?: string | null;
  onPickPhoto?: (source: "camera" | "library") => void;
  onClearPhoto?: () => void;
  /** Lead with the children's row. */
  kidsFirst?: boolean;
  size?: number;
}) {
  const all = allFaces();
  const faces = kidsFirst ? [...all.filter((f) => KID_FACE_IDS.includes(f.id)), ...all.filter((f) => !KID_FACE_IDS.includes(f.id))] : all;
  const rows: Face[][] = [];
  for (let i = 0; i < faces.length; i += PER_ROW) rows.push(faces.slice(i, i + PER_ROW));

  return (
    <View style={{ gap: 14 }}>
      {onPickPhoto ? (
        photo ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 24, backgroundColor: brand[50], borderWidth: 1.5, borderColor: brand[500] }}>
            <Image alt="" source={{ uri: photo }} style={{ width: 52, height: 52, borderRadius: 999 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Using a photo</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>Only you can see it.</Text>
            </View>
            <Tap scale={0.95} accessibilityRole="button" accessibilityLabel="Remove photo" onPress={onClearPhoto} hitSlop={8} style={{ width: 34, height: 34, borderRadius: 999, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
              <X size={16} color={ink[700]} />
            </Tap>
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <PhotoButton icon={<Camera size={17} color={ink[900]} />} label="Take a photo" onPress={() => onPickPhoto("camera")} />
            <PhotoButton icon={<ImagePlus size={17} color={ink[900]} />} label="Choose photo" onPress={() => onPickPhoto("library")} />
          </View>
        )
      ) : null}

      <View style={{ gap: 12, opacity: photo ? 0.55 : 1 }}>
        {rows.map((row, r) => (
          <View key={r} style={{ flexDirection: "row", gap: 6 }}>
            {row.map((f) => (
              <View key={f.id} style={{ flex: 1, alignItems: "center" }}>
                <FaceTile face={f} size={size} selected={!photo && value === f.id} onPress={() => { onChange(f.id); onClearPhoto?.(); }} />
              </View>
            ))}
            {Array.from({ length: PER_ROW - row.length }, (_, i) => <View key={`pad-${i}`} style={{ flex: 1 }} />)}
          </View>
        ))}
      </View>

      {derived || onShuffle ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          {derived ? (
            <Option
              on={!photo && value === ""}
              label="Keep generated face"
              onPress={() => { onChange(""); onClearPhoto?.(); }}
              icon={<Avatar svg={derived.svg} image={derived.image} background={derived.background} size={30} />}
            />
          ) : null}
          {onShuffle ? (
            <Option
              on={false}
              label="Surprise me"
              onPress={() => { onShuffle(); onClearPhoto?.(); }}
              icon={
                <View style={{ width: 30, height: 30, borderRadius: 999, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
                  <Shuffle size={14} color={ink[900]} />
                </View>
              }
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function PhotoButton({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: 48,
        borderRadius: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: pressed ? surface.line : surface.tint,
      })}
    >
      {icon}
      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>{label}</Text>
    </Pressable>
  );
}

function FaceTile({ face, size, selected, onPress }: { face: Face; size: number; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`Face ${face.id.slice(1)}`}
      onPress={onPress}
      hitSlop={3}
      style={({ pressed }) => ({
        width: size + 8,
        height: size + 8,
        borderRadius: (size + 8) / 2,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2.5,
        borderColor: selected ? brand[600] : "transparent",
        transform: [{ scale: pressed ? 0.92 : selected ? 1.05 : 1 }],
      })}
    >
      <Avatar svg={face.svg} image={face.image} background={face.background} size={size} />
      {selected ? (
        <View style={{ position: "absolute", right: -3, bottom: -3, width: 22, height: 22, borderRadius: 999, backgroundColor: brand[600], borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>
          <Check size={12} color="#fff" strokeWidth={3} />
        </View>
      ) : null}
    </Pressable>
  );
}

function Option({ on, label, onPress, icon }: { on: boolean; label: string; onPress: () => void; icon: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingLeft: 6,
        paddingRight: 12,
        height: 42,
        borderRadius: 999,
        backgroundColor: on ? brand[50] : pressed ? brand[50] : "rgba(255,255,255,0.86)",
        borderWidth: 1.5,
        borderColor: on ? brand[500] : "rgba(15,16,48,0.08)",
      })}
    >
      {icon}
      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: on ? brand[700] : ink[700] }}>{label}</Text>
    </Pressable>
  );
}
