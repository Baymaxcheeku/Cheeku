import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpenText,
  CircleAlert,
  CornerDownRight,
  FileText,
  History,
  Info,
  ListChecks,
  MapPin,
  Phone,
  PillBottle,
  Share2,
  Sparkles,
  Stethoscope,
  Video,
} from "lucide-react-native";
import { useState } from "react";
import { Linking, Pressable, ScrollView, Share, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";

import { MascotBust } from "@/components/illustrations/sprout";
import { glass, glassShadow } from "@/components/ui/glass";
import type { ThreadMessage, TurnMemory } from "@/lib/memory/thread";
import { shortDate } from "@/lib/records/details";
import { brand, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

import { TIER_STYLE, TierBadge } from "./tier";

/*
 * ONE TURN OF THE CONVERSATION.
 *
 * An answer is built in the order someone needs it at 11 pm:
 *
 *   corrected        if this answer changes an earlier one, that comes first
 *   urgency          the tier, with the person's clock beside it
 *   the answer       plain paragraphs, the model's words
 *   what I read      the actual numbers it used, with their change
 *   tell the doctor  the script, ready to read out, share or call from
 *   watch for        the signs that would change the answer
 *   still open       a pending result or follow-up that bears on this
 *   records          the documents it cited, one tap away
 *
 * A go-now answer is none of that. It is a single red card: what, where, and
 * the numbers to call, with no analysis to read past.
 */

const tel = (n: string) => void Linking.openURL(`tel:${n.replace(/[^\d+]/g, "")}`).catch(() => undefined);

export function UserBubble({ message }: { message: ThreadMessage }) {
  return (
    <View style={{ maxWidth: "85%", alignSelf: "flex-end", alignItems: "flex-end", gap: 6 }}>
      {message.attachment ? (
        <View style={[glassShadow, { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 8 }]}>
          <SvgXml xml={message.attachment.thumbnail} width={28} height={28} />
          <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[700] }}>{message.attachment.title}</Text>
        </View>
      ) : null}
      <View style={{ backgroundColor: brand[600], borderRadius: 22, borderBottomRightRadius: 6, paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={{ fontFamily: font.regular, fontSize: 14.5, lineHeight: 21, color: "#fff" }}>{message.content}</Text>
      </View>
    </View>
  );
}

function Mark() {
  return (
    <View style={{ width: 28, flexShrink: 0, marginTop: 2 }}>
      <MascotBust size={28} />
    </View>
  );
}

export function AssistantTurn({
  message,
  name,
  onSend,
  onOpenRecord,
  onOpenMemory,
  onBook,
}: {
  message: ThreadMessage;
  /** The member's first name, for labels. */
  name: string;
  onSend?: (text: string) => void;
  onOpenRecord: (id: string) => void;
  onOpenMemory: () => void;
  /** "Doctors nearby" or "Online consultation", under an answer that offers them. */
  onBook?: (mode: "clinic" | "online") => void;
}) {
  const m = message.memory;
  if (m?.hardStop) return <HardStopCard memory={m} />;

  const paragraphs = message.content.split(/\n{2,}/).filter((p) => !m?.revisions.some((r) => r.text === p));

  return (
    <View style={{ alignSelf: "stretch", gap: 10 }}>
      {m?.revisions.length ? <Revisions memory={m} /> : null}

      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <Mark />
        <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
          {m?.tier || m?.clock ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {m?.tier ? <TierBadge tier={m.tier} /> : null}
              {m?.clock ? <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.medium, fontSize: 11.5, color: ink[500] }}>{m.clock}</Text> : null}
            </View>
          ) : null}

          <View style={[glassShadow, { backgroundColor: glass.fillStrong, borderWidth: 1, borderColor: glass.rim, borderRadius: 22, borderTopLeftRadius: 6, paddingHorizontal: 16, paddingVertical: 14, gap: 10 }]}>
            {paragraphs.map((p, i) => (
              <Paragraph key={i} text={p} />
            ))}
            {m?.notes.map((n) => (
              <Callout key={n} icon={Info} text={n} />
            ))}
            {m?.contradictions.map((c) => (
              <Callout key={c.text} icon={CircleAlert} title="Two values disagree" text={c.text} />
            ))}
            {message.citations.length ? (
              <View style={{ borderTopWidth: 1, borderTopColor: surface.line, paddingTop: 10, gap: 8 }}>
                {message.citations.map((c) => (
                  <Pressable key={c.documentId} accessibilityRole="button" accessibilityLabel={`Open ${c.label}`} onPress={() => onOpenRecord(c.documentId)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <FileText size={13} color={brand[600]} />
                    <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.medium, fontSize: 12.5, color: brand[700] }}>
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          {onBook && m?.careOffer ? <CareOffer onBook={onBook} /> : null}
          {m?.reading.length ? <ReadingStrip memory={m} onOpenRecord={onOpenRecord} /> : null}
          {m?.script ? <ScriptCard script={m.script} /> : null}
          {m?.watchFor.length ? <WatchFor items={m.watchFor} tierIsLow={m.tier === "reassure"} /> : null}
          {m?.alerts.map((a) => (
            <AlertCard key={a.title} title={a.title} text={a.text} onPress={onOpenMemory} />
          ))}
          {m?.loops.map((l) => (
            <LoopNudge key={l.key} title={l.title} when={l.when} because={l.because} onPress={onOpenMemory} />
          ))}

          {m?.basis === "general" ? <Footnote icon={Sparkles} text={`General health knowledge, not from ${name}'s records`} /> : null}
          {m?.basis === "silent" ? <Footnote icon={CircleAlert} text={`Nothing in ${name}'s memory covers this yet`} /> : null}

          {onSend && m?.followUps.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
              {m.followUps.map((f) => (
                <Pressable key={f} accessibilityRole="button" onPress={() => onSend(f)} style={[glassShadow, { flexDirection: "row", alignItems: "center", gap: 5, height: 36, paddingHorizontal: 13, borderRadius: 999, backgroundColor: glass.fillStrong, borderWidth: 1, borderColor: glass.rim }]}>
                  <CornerDownRight size={12} color={brand[600]} />
                  <Text style={{ fontFamily: font.medium, fontSize: 12.5, color: ink[900] }}>{f}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ parts --

/*
 * A paragraph, or a list. The model writes lists as a heading line followed
 * by "• " lines, so the stored prose reads fine anywhere; here they are drawn
 * as a proper list inside the answer, in the order they were written.
 */
function Paragraph({ text }: { text: string }) {
  const lines = text.split("\n");
  const items = lines.filter((l) => l.startsWith("• "));
  if (!items.length) return <Text style={{ fontFamily: font.regular, fontSize: 14.5, lineHeight: 22, color: ink[900] }}>{text}</Text>;
  const head = lines.filter((l) => !l.startsWith("• ")).join(" ").trim();
  return (
    <View style={{ gap: 8, borderRadius: 16, backgroundColor: surface.tint, padding: 12 }}>
      {head ? <Text style={{ fontFamily: font.semibold, fontSize: 14, color: ink[900] }}>{head}</Text> : null}
      {items.map((l, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 11, color: brand[600] }}>{i + 1}</Text>
          </View>
          <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: ink[700] }}>{l.slice(2)}</Text>
        </View>
      ))}
    </View>
  );
}

function CareOffer({ onBook }: { onBook: (mode: "clinic" | "online") => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        onPress={() => onBook("clinic")}
        style={({ pressed }) => ({ flex: 1, height: 46, borderRadius: 999, backgroundColor: ink[900], flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, transform: [{ scale: pressed ? 0.98 : 1 }] })}
      >
        <MapPin size={15} color="#fff" />
        <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: "#fff" }}>Doctors nearby</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => onBook("online")}
        style={({ pressed }) => [glassShadow, { flex: 1, height: 46, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: surface.line, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      >
        <Video size={15} color={brand[600]} />
        <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: ink[900] }}>Online consultation</Text>
      </Pressable>
    </View>
  );
}

function Callout({ icon: Icon, title, text }: { icon: typeof Info; title?: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, borderRadius: 14, backgroundColor: surface.tint, padding: 10 }}>
      <Icon size={14} color={brand[500]} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: ink[900] }}>{title}</Text> : null}
        <Text style={{ fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: ink[700] }}>{text}</Text>
      </View>
    </View>
  );
}

function Footnote({ icon: Icon, text }: { icon: typeof Info; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 }}>
      <Icon size={11} color={ink[300]} />
      <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 11, color: ink[500] }}>{text}</Text>
    </View>
  );
}

function Revisions({ memory }: { memory: TurnMemory }) {
  return (
    <View style={{ marginLeft: 36, borderRadius: 18, backgroundColor: brand[50], padding: 12, gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <History size={14} color={brand[600]} />
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[700] }}>I&apos;ve corrected an earlier answer</Text>
      </View>
      {memory.revisions.map((r) => (
        <View key={r.label + r.after} style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontFamily: font.medium, fontSize: 12.5, color: ink[500], textDecorationLine: "line-through" }}>{r.before}</Text>
            <Text style={{ fontFamily: font.medium, fontSize: 12.5, color: ink[500] }}>to</Text>
            <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: ink[900] }}>{r.after}</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>· {r.label}</Text>
          </View>
          <Text style={{ fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: ink[700] }}>{r.text}</Text>
        </View>
      ))}
    </View>
  );
}

function ReadingStrip({ memory, onOpenRecord }: { memory: TurnMemory; onOpenRecord: (id: string) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: ink[500], paddingHorizontal: 4 }}>What I read</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
        {memory.reading.map((r) => {
          const tone = r.tier && r.tier !== "reassure" ? TIER_STYLE[r.tier] : null;
          const down = /\bdown\b/.test(r.change ?? "");
          const up = /\bup\b/.test(r.change ?? "");
          return (
            <Pressable
              key={r.key}
              accessibilityRole="button"
              disabled={!r.documentId}
              onPress={() => r.documentId && onOpenRecord(r.documentId)}
              style={[glassShadow, { width: 168, borderRadius: 18, backgroundColor: "#fff", borderWidth: 1, borderColor: tone ? tone.bg : surface.line, padding: 12, gap: 4 }]}
            >
              <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 12, color: ink[500] }}>
                {r.label}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3, color: tone && !tone.solid ? tone.fg : ink[900] }}>{r.value}</Text>
                {down ? <ArrowDownRight size={14} color={ink[500]} /> : up ? <ArrowUpRight size={14} color={ink[500]} /> : null}
              </View>
              <Text numberOfLines={2} style={{ fontFamily: font.regular, fontSize: 11.5, lineHeight: 15, color: ink[500] }}>
                {r.change ?? `${r.source === "record" ? "From a report" : "You told me"} · ${shortDate(r.date)}`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function ScriptCard({ script, urgent }: { script: NonNullable<TurnMemory["script"]>; urgent?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <View style={[glassShadow, { borderRadius: 22, backgroundColor: "#fff", borderWidth: 1, borderColor: surface.line, overflow: "hidden" }]}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((o) => !o)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14, backgroundColor: brand[50] }}>
        <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
          <Stethoscope size={17} color={brand[600]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 14, color: ink[900] }}>{urgent ? "What to tell them when you get there" : script.to ? `What to tell ${script.to}` : "What to tell the doctor"}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>{urgent ? "Show this at the desk, or read it out" : "Read it out, or send it ahead"}</Text>
        </View>
        <Text style={{ fontFamily: font.medium, fontSize: 12, color: brand[600] }}>{open ? "Hide" : "Show"}</Text>
      </Pressable>
      {open ? (
        <View style={{ padding: 14, gap: 8 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 13.5, lineHeight: 20, color: ink[900] }}>{script.opener}</Text>
          {script.lines.map((l) => (
            <View key={l} style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: brand[400], marginTop: 8 }} />
              <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13.5, lineHeight: 20, color: ink[700] }}>{l}</Text>
            </View>
          ))}
          {script.asks.map((a) => (
            <Text key={a} style={{ fontFamily: font.semibold, fontSize: 13.5, lineHeight: 20, color: brand[700] }}>
              Ask: {a}
            </Text>
          ))}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
            {script.phone ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Call ${script.to ?? "the doctor"}`} onPress={() => script.phone && tel(script.phone)} style={{ flex: 1, height: 42, borderRadius: 999, backgroundColor: ink[900], flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Phone size={15} color="#fff" />
                <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: "#fff" }}>Call</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => void Share.share({ message: script.text }).catch(() => undefined)}
              style={{ flex: 1, height: 42, borderRadius: 999, backgroundColor: surface.tint, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <Share2 size={15} color={ink[900]} />
              <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: ink[900] }}>Send to doctor</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function WatchFor({ items, tierIsLow }: { items: string[]; tierIsLow: boolean }) {
  return (
    <View style={{ borderRadius: 20, backgroundColor: tierIsLow ? surface.tint : semantic.cautionBg, padding: 14, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <ListChecks size={15} color={tierIsLow ? ink[700] : semantic.cautionText} />
        <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: tierIsLow ? ink[900] : semantic.cautionText }}>Call the doctor if you see</Text>
      </View>
      {items.map((w) => (
        <View key={w} style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: tierIsLow ? ink[300] : semantic.caution, marginTop: 7 }} />
          <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[700] }}>{w}</Text>
        </View>
      ))}
    </View>
  );
}

function AlertCard({ title, text, onPress }: { title: string; text: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ flexDirection: "row", gap: 10, borderRadius: 20, backgroundColor: semantic.dangerBg, padding: 14 }}>
      <PillBottle size={17} color={semantic.dangerText} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: semantic.dangerText }}>{title}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: ink[700] }}>{text}</Text>
      </View>
    </Pressable>
  );
}

function LoopNudge({ title, when, because, onPress }: { title: string; when: string; because: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[glassShadow, { flexDirection: "row", gap: 10, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: surface.line, padding: 14 }]}>
      <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
        <BookOpenText size={16} color={brand[600]} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: brand[600] }}>Still open · {when}</Text>
        <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: ink[900] }}>{title}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: ink[700] }}>{because}</Text>
      </View>
    </Pressable>
  );
}

/** Go now. No analysis, no reading list: what, where, who to call. */
export function HardStopCard({ memory }: { memory: TurnMemory }) {
  const stop = memory.hardStop;
  if (!stop) return null;
  return (
    <View style={{ alignSelf: "stretch", gap: 10 }}>
      <View style={{ borderRadius: 24, backgroundColor: semantic.dangerStrong, padding: 18, gap: 10 }}>
        <TierBadge tier="go_now" />
        <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 19, lineHeight: 25, letterSpacing: -0.3, color: "#fff" }}>
          {stop.title}
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: "rgba(255,255,255,0.92)" }}>{stop.text}</Text>
        <View style={{ flexDirection: "row", gap: 8, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.14)", padding: 12 }}>
          <MapPin size={16} color="#fff" style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 13.5, lineHeight: 19, color: "#fff" }}>Go to {stop.where}.</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Call 108 for an ambulance" onPress={() => tel("108")} style={{ flex: 1, height: 48, borderRadius: 999, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Phone size={16} color={semantic.dangerStrong} />
            <Text style={{ fontFamily: font.semibold, fontSize: 14, color: semantic.dangerStrong }}>Ambulance 108</Text>
          </Pressable>
          {memory.script?.phone ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`Call ${memory.script.to ?? "the doctor"}`} onPress={() => memory.script?.phone && tel(memory.script.phone)} style={{ flex: 1, height: 48, borderRadius: 999, borderWidth: 1.5, borderColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Phone size={16} color="#fff" />
              <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 14, color: "#fff" }}>{memory.script.to ?? "Doctor"}</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel="Call 112" onPress={() => tel("112")} style={{ flex: 1, height: 48, borderRadius: 999, borderWidth: 1.5, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 14, color: "#fff" }}>Emergency 112</Text>
            </Pressable>
          )}
        </View>
      </View>
      {memory.script ? <ScriptCard script={memory.script} urgent /> : null}
    </View>
  );
}
