import { Check, Shuffle } from "lucide-react-native";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { avatarPicks, type AvatarPick } from "@/lib/profiles/avatar";
import { brand, ink } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * Choose a face.
 *
 * The app's own ten drawings, plus "Let Cheeku pick", which keeps the face
 * generated from the profile (what everyone had before this existed). Faces
 * are not labelled or grouped by gender or anything else: a person picks the
 * one that looks like the person they are adding, and the app learns nothing
 * from that beyond which drawing to show.
 *
 * Laid out in fixed rows of five rather than a wrapping row. A wrapped flex
 * row once stretched its tiles to the full screen height on iOS while looking
 * perfect in the browser (PROGRESS.md), so rows are built by hand.
 */

const PER_ROW = 5;

export function AvatarPicker({
  value,
  onChange,
  derived,
  onShuffle,
  size = 54,
}: {
  /** The picked catalogue id, or "" for the generated face. */
  value: string;
  onChange: (seed: string) => void;
  /**
   * An existing member's generated face. When given, a "Keep generated face"
   * option appears. Only for people who already have an id to derive from; a
   * new member's preview must be exactly what gets saved.
   */
  derived?: { svg: string; background: string };
  /** When given, a "Surprise me" option picks a random face. */
  onShuffle?: () => void;
  size?: number;
}) {
  const picks = useMemo(() => avatarPicks(), []);
  const rows: AvatarPick[][] = [];
  for (let i = 0; i < picks.length; i += PER_ROW) rows.push(picks.slice(i, i + PER_ROW));

  return (
    <View style={{ gap: 12 }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {row.map((p) => (
            <Face key={p.id} pick={p} size={size} selected={value === p.id} onPress={() => onChange(p.id)} />
          ))}
        </View>
      ))}
      {derived ? (
        <Option
          on={value === ""}
          label="Keep generated face"
          onPress={() => onChange("")}
          icon={<Avatar svg={derived.svg} background={derived.background} size={32} />}
        />
      ) : null}
      {onShuffle ? (
        <Option
          on={false}
          label="Surprise me"
          onPress={onShuffle}
          icon={
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
              <Shuffle size={15} color={brand[600]} />
            </View>
          }
        />
      ) : null}
    </View>
  );
}

function Face({ pick, size, selected, onPress }: { pick: AvatarPick; size: number; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`Face ${pick.id.slice(1)}`}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: size + 8,
        height: size + 8,
        borderRadius: (size + 8) / 2,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2.5,
        borderColor: selected ? brand[600] : "transparent",
        transform: [{ scale: pressed ? 0.93 : selected ? 1.04 : 1 }],
      })}
    >
      <Avatar svg={pick.svg} background={pick.background} size={size} />
      {selected ? (
        <View
          style={{
            position: "absolute",
            right: -2,
            bottom: -2,
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: brand[600],
            borderWidth: 2,
            borderColor: "#fff",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
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
        gap: 10,
        alignSelf: "flex-start",
        paddingLeft: 6,
        paddingRight: 14,
        height: 44,
        borderRadius: 999,
        backgroundColor: on ? brand[50] : pressed ? "#f3f1ff" : "rgba(255,255,255,0.86)",
        borderWidth: 1.5,
        borderColor: on ? brand[500] : "rgba(15,16,48,0.08)",
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      {icon}
      <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: on ? brand[700] : ink[700] }}>{label}</Text>
    </Pressable>
  );
}
