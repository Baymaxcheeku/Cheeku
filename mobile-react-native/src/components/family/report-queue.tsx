import { AlertCircle, Camera, Check, FileText, FolderOpen, ImageIcon, X } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";

import { glass } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { MAX_QUEUE, pickFiles, pickPhotos, snapPhoto, type QueueItem } from "@/lib/records/bulk-upload";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * Past reports, gathered before anything uploads.
 *
 * Three ways in, the three ways reports actually live on an Indian phone: a
 * fresh photo of the paper, photos already in the gallery (WhatsApp saves them
 * there), and PDFs from a lab portal or email. Up to ten at a time. Each row
 * shows its own state, and a failed one says why and can be tried again
 * without re-picking the rest.
 */
export function ReportQueue({
  items,
  onChange,
  locked,
}: {
  items: QueueItem[];
  onChange: (items: QueueItem[]) => void;
  /** True while uploading: no adding or removing mid-flight. */
  locked?: boolean;
}) {
  const still = useReducedMotion();
  const room = MAX_QUEUE - items.length;

  async function add(pick: () => Promise<QueueItem[]>) {
    const picked = await pick();
    if (picked.length) onChange([...items, ...picked].slice(0, MAX_QUEUE));
  }

  return (
    <View style={{ gap: 12 }}>
      {!locked && room > 0 ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Source icon={<Camera size={20} color={brand[600]} />} label="Snap" onPress={() => void add(snapPhoto)} />
          <Source icon={<ImageIcon size={20} color={brand[600]} />} label="Photos" onPress={() => void add(pickPhotos)} />
          <Source icon={<FolderOpen size={20} color={brand[600]} />} label="Files" onPress={() => void add(pickFiles)} />
        </View>
      ) : null}

      {items.map((it, i) => (
        <Animated.View key={it.key} entering={still ? undefined : FadeInDown.duration(220)} layout={still ? undefined : LinearTransition.duration(160)}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 18, backgroundColor: glass.fillStrong, borderWidth: 1, borderColor: it.status === "failed" ? "#f5c2c7" : surface.line }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
              {it.file.mimeType === "application/pdf" ? <FileText size={18} color={brand[600]} /> : <ImageIcon size={18} color={brand[600]} />}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 14, color: ink[900] }}>
                {it.file.mimeType === "application/pdf" ? `Report ${i + 1} (PDF)` : `Report ${i + 1} (photo)`}
              </Text>
              <Text numberOfLines={2} style={{ fontFamily: font.regular, fontSize: 12.5, color: it.status === "failed" ? "#c00a1c" : ink[500], marginTop: 1 }}>
                {it.status === "waiting"
                  ? "Ready to file"
                  : it.status === "uploading"
                    ? "Reading and filing..."
                    : it.status === "done"
                      ? "Filed"
                      : (it.message ?? "Didn't upload")}
              </Text>
            </View>
            {it.status === "uploading" ? (
              <ActivityIndicator color={brand[600]} />
            ) : it.status === "done" ? (
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: brand[600], alignItems: "center", justifyContent: "center" }}>
                <Check size={14} color="#fff" strokeWidth={3} />
              </View>
            ) : it.status === "failed" ? (
              <AlertCircle size={20} color="#c00a1c" />
            ) : !locked ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Remove" hitSlop={8} onPress={() => onChange(items.filter((x) => x.key !== it.key))}>
                <X size={18} color={ink[300]} />
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ))}

      {items.length > 0 ? (
        <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[300] }}>
          {room > 0 ? `${items.length} added. Up to ${MAX_QUEUE} at a time.` : `That's ${MAX_QUEUE}, the most at once. Add more later from their file.`}
        </Text>
      ) : null}
    </View>
  );
}

function Source({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add from ${label.toLowerCase()}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: 78,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: brand[300],
        backgroundColor: pressed ? "#ece8ff" : "rgba(241,240,254,0.7)",
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      {icon}
      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[700] }}>{label}</Text>
    </Pressable>
  );
}
