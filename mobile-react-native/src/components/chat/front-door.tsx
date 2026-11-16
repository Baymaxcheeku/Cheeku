import { CalendarCheck, CalendarPlus, PencilLine, Target, Users, X } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";

import { MascotBust } from "@/components/illustrations/sprout";
import { glass, glassShadow } from "@/components/ui/glass";
import { Tap } from "@/components/ui/tap";
import { LOG_STARTS, type DailyNote, type NoteButton, type Shortcut } from "@/lib/chat/daily";
import { brand, ink } from "@/theme/tokens";
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
      <View style={[glassShadow, { flex: 1, borderRadius: 18, borderTopLeftRadius: 6, padding: 14, gap: 10, backgroundColor: glass.fillStrong, borderWidth: 1, borderColor: brand[200] }]}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{note.greeting}</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[700] }}>{note.line}</Text>
          </View>
          <Tap accessibilityRole="button" accessibilityLabel="Hide today's note" onPress={onClose} hitSlop={10}>
            <X size={16} color={ink[300]} />
          </Tap>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Tap scale={0.97} accessibilityRole="button" onPress={() => onButton(note.primary)} style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, justifyContent: "center", backgroundColor: ink[900] }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: "#fff" }}>{note.primary.label}</Text>
          </Tap>
          {note.secondary ? (
            <Tap scale={0.97} accessibilityRole="button" onPress={() => onButton(note.secondary!)} style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, justifyContent: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: glass.rim }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>{note.secondary.label}</Text>
            </Tap>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const ICON = { checkin: CalendarCheck, log: PencilLine, goals: Target, book: CalendarPlus, family: Users } as const;

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
        items.map((s) => <Chip key={s.key} label={s.label} icon={ICON[s.key]} disabled={disabled} onPress={() => onShortcut(s)} />)
      )}
    </ScrollView>
  );
}

function Chip({ label, icon: Icon, strong, disabled, accessibility, onPress }: { label: string; icon?: typeof X; strong?: boolean; disabled?: boolean; accessibility?: string; onPress: () => void }) {
  return (
    <Tap
      scale={0.96}
      accessibilityRole="button"
      accessibilityLabel={accessibility ?? label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={[glassShadow, { height: 34, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: strong ? ink[900] : glass.fillStrong, borderWidth: strong ? 0 : 1, borderColor: glass.rim, opacity: disabled ? 0.5 : 1 }]}
    >
      {Icon ? <Icon size={14} color={strong ? "#fff" : ink[900]} /> : null}
      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: strong ? "#fff" : ink[900] }}>{label}</Text>
    </Tap>
  );
}
