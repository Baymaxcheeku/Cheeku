import { X } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";

import { MascotBust } from "@/components/illustrations/sprout";
import { glassCard } from "@/components/today/palette";
import { Icon3D, type Icon3DName } from "@/components/ui/icon3d";
import { Tap } from "@/components/ui/tap";
import { LOG_STARTS, type DailyNote, type NoteButton, type Shortcut } from "@/lib/chat/daily";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * THE CHAT'S FRONT DOOR.
 *
 * DailyCard: Cheeku's one note for today, before anyone types.
 * ShortcutRow: the five things the chat can always do (owner's list, 11 Nov
 * 2026): weekly check-in, log, goals, book, family. Always above the typing
 * box, so they never have to be guessed or typed.
 */

export function DailyCard({ note, onButton, onClose }: { note: DailyNote; onButton: (b: NoteButton) => void; onClose: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
      <View style={{ marginTop: 2 }}>
        <MascotBust size={28} mood="calm" motion="idle" />
      </View>
      <View style={[glassCard("#ffffff", "#0f1030"), { flex: 1, borderRadius: 22, borderTopLeftRadius: 6, padding: 16, gap: 12, shadowOpacity: 0.05 }]}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 16, lineHeight: 21, color: ink[900] }}>{note.greeting}</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: ink[700] }}>{note.line}</Text>
          </View>
          <Tap accessibilityRole="button" accessibilityLabel="Hide today's note" onPress={onClose} hitSlop={10}>
            <X size={16} color={ink[300]} />
          </Tap>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Tap scale={0.97} accessibilityRole="button" onPress={() => onButton(note.primary)} style={{ height: 38, paddingHorizontal: 16, borderRadius: 999, justifyContent: "center", backgroundColor: brand[600] }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: "#fff" }}>{note.primary.label}</Text>
          </Tap>
          {note.secondary ? (
            <Tap scale={0.97} accessibilityRole="button" onPress={() => onButton(note.secondary!)} style={{ height: 38, paddingHorizontal: 16, borderRadius: 999, justifyContent: "center", backgroundColor: surface.tint }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>{note.secondary.label}</Text>
            </Tap>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const ICON_3D = { checkin: "calendar-check", log: "report", goals: "trophy", book: "calendar", family: "family" } as const;

/**
 * One row of chips. "Log" swaps the row for what can be logged; each of those
 * starts the sentence in the typing box ("I walked "), and the person finishes it.
 */
export function ShortcutRow({ items, logOpen, onShortcut, onLog, onCloseLog, disabled }: { items: Shortcut[]; logOpen: boolean; onShortcut: (s: Shortcut) => void; onLog: (text: string) => void; onCloseLog: () => void; disabled?: boolean }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0, marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
      {logOpen ? (
        <>
          <Chip label="Log" icon={X} strong accessibility="Close logging" onPress={onCloseLog} />
          {LOG_STARTS.map((l) => (
            <Chip key={l.key} label={l.label} accessibility={`Log ${l.label.toLowerCase()}`} onPress={() => onLog(l.text)} />
          ))}
        </>
      ) : (
        items.map((s) => <Chip key={s.key} label={s.label} art={ICON_3D[s.key]} disabled={disabled} onPress={() => onShortcut(s)} />)
      )}
    </ScrollView>
  );
}

function Chip({ label, icon: Icon, art, strong, disabled, accessibility, onPress }: { label: string; icon?: typeof X; art?: Icon3DName; strong?: boolean; disabled?: boolean; accessibility?: string; onPress: () => void }) {
  return (
    <Tap
      scale={0.96}
      accessibilityRole="button"
      accessibilityLabel={accessibility ?? label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={[strong ? null : glassCard("#ffffff", "#0f1030"), { height: 40, flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: art ? 6 : 14, paddingRight: 14, borderRadius: 999, shadowOpacity: 0.05, backgroundColor: strong ? brand[600] : "#ffffff", opacity: disabled ? 0.5 : 1 }]}
    >
      {art ? <Icon3D name={art} size={26} /> : Icon ? <Icon size={14} color={strong ? "#fff" : ink[900]} /> : null}
      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: strong ? "#fff" : ink[900] }}>{label}</Text>
    </Tap>
  );
}
