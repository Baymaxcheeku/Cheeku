import { Camera, Check, ImagePlus, Shuffle, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { catalogFace, FACE_GROUPS, facesIn, type Face, type FaceGroup } from "@/lib/profiles/faces";
import { brand, ink } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * Choose how someone looks: a real photo, or one of the app's own faces.
 *
 *   photo     Take one or choose one. Square-cropped, stripped of location
 *             data and stored privately (lib/profiles/photo.ts).
 *   tabs      Little ones · Kids · Grown-ups · Elders. Life stage, because
 *             "find someone who looks like Dadi" is a question about age
 *             first. Never grouped or labelled by gender.
 *   grid      that stage's faces, five to a row.
 *
 * A photo wins while it is set; picking a face clears it. The tab opens on
 * the stage the relationship suggests (a grandparent opens on Elders), which
 * saves a tap without deciding anything for anyone.
 *
 * Rows are built by hand, never a wrapping row: a wrapped flex row once
 * stretched its tiles to full screen height on iOS (PROGRESS.md).
 */

const PER_ROW = 5;

export function groupFor(relationship: string): FaceGroup {
  const r = relationship.toLowerCase();
  if (/grand|dadi|dada|nani|nana/.test(r)) return "elders";
  if (/son|daughter|child|kid|baby/.test(r)) return "kids";
  return "grown";
}

export function AvatarPicker({
  value,
  onChange,
  derived,
  onShuffle,
  photo,
  onPickPhoto,
  onClearPhoto,
  initialGroup,
  size = 52,
}: {
  /** The picked catalogue id, or "" for none / the generated face. */
  value: string;
  onChange: (seed: string) => void;
  /** An existing member's generated face, offered as "Keep generated face". */
  derived?: { svg: string; background: string };
  onShuffle?: () => void;
  /** A photo (local file or signed URL) currently chosen, if any. */
  photo?: string | null;
  onPickPhoto?: (source: "camera" | "library") => void;
  onClearPhoto?: () => void;
  initialGroup?: FaceGroup;
  size?: number;
}) {
  const startGroup = initialGroup ?? (value ? (catalogFace(value)?.group ?? "grown") : "grown");
  const [group, setGroup] = useState<FaceGroup>(startGroup);
  const faces = useMemo(() => facesIn(group), [group]);
  const rows: Face[][] = [];
  for (let i = 0; i < faces.length; i += PER_ROW) rows.push(faces.slice(i, i + PER_ROW));

  return (
    <View style={{ gap: 14 }}>
      {onPickPhoto ? (
        photo ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 20, backgroundColor: brand[50], borderWidth: 1.5, borderColor: brand[500] }}>
            <Image alt="" source={{ uri: photo }} style={{ width: 52, height: 52, borderRadius: 26 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 14.5, color: ink[900] }}>Using a photo</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: ink[500], marginTop: 1 }}>Only you can see it.</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Remove photo" onPress={onClearPhoto} hitSlop={8} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
              <X size={16} color={ink[700]} />
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <PhotoButton icon={<Camera size={17} color={brand[600]} />} label="Take a photo" onPress={() => onPickPhoto("camera")} />
            <PhotoButton icon={<ImagePlus size={17} color={brand[600]} />} label="Choose photo" onPress={() => onPickPhoto("library")} />
          </View>
        )
      ) : null}

      {/* Life stages. */}
      <View style={{ flexDirection: "row", gap: 6, padding: 4, borderRadius: 999, backgroundColor: "rgba(15,16,48,0.05)" }}>
        {FACE_GROUPS.map((g) => {
          const on = g.id === group;
          return (
            <Pressable
              key={g.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setGroup(g.id)}
              style={{ flex: 1, height: 34, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: on ? "#fff" : "transparent" }}
            >
              <Text numberOfLines={1} style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 12.5, color: on ? ink[900] : ink[500] }}>{g.label}</Text>
            </Pressable>
          );
        })}
      </View>

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
              icon={<Avatar svg={derived.svg} background={derived.background} size={30} />}
            />
          ) : null}
          {onShuffle ? (
            <Option
              on={false}
              label="Surprise me"
              onPress={() => { onShuffle(); onClearPhoto?.(); }}
              icon={
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
                  <Shuffle size={14} color={brand[600]} />
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
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: brand[300],
        backgroundColor: pressed ? "#ece8ff" : "rgba(241,240,254,0.7)",
      })}
    >
      {icon}
      <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: brand[700] }}>{label}</Text>
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
      <Avatar svg={face.svg} background={face.background} size={size} />
      {selected ? (
        <View style={{ position: "absolute", right: -3, bottom: -3, width: 22, height: 22, borderRadius: 11, backgroundColor: brand[600], borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>
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
        backgroundColor: on ? brand[50] : pressed ? "#f3f1ff" : "rgba(255,255,255,0.86)",
        borderWidth: 1.5,
        borderColor: on ? brand[500] : "rgba(15,16,48,0.08)",
      })}
    >
      {icon}
      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: on ? brand[700] : ink[700] }}>{label}</Text>
    </Pressable>
  );
}
