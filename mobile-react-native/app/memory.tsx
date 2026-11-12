import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useRouter } from "expo-router";
import {
  Baby,
  CalendarClock,
  Check,
  FlaskConical,
  HeartHandshake,
  Info,
  MessageCircle,
  PillBottle,
  Receipt,
  Stethoscope,
  Syringe,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TIER_STYLE } from "@/components/chat/tier";
import { Gradient, glassShadow } from "@/components/ui/glass";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { formatGa, todayIso } from "@/lib/memory/clock";
import { buildContext, memoryLine, type MemoryBundle } from "@/lib/memory/context";
import type { LedgerEntry } from "@/lib/memory/ledger";
import { loopWhen, type LoopType, type LoopView } from "@/lib/memory/loops";
import { correctFact, forgetFact, memoryKey, refreshMemory, setLoopStatus, useMemory } from "@/lib/memory/store";
import type { Fact } from "@/lib/memory/types";
import { optimisticQueries } from "@/lib/optimistic";
import { useFamily } from "@/lib/profiles/family";
import { shortDate } from "@/lib/records/details";
import { brand, ink, lilac, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { Tap } from "@/components/ui/tap";
import { DetailSkeleton, ListSkeleton, ScreenSkeleton } from "@/components/ui/skeleton";

/*
 * WHAT CHEEKU REMEMBERS, AND WHERE IT CAME FROM.
 *
 * A memory people cannot see is one they cannot trust. This page shows the
 * working state the chat reasons over for the active member, every item with
 * its source, and lets them fix it:
 *
 *   now          the clock everything is read against
 *   pregnancy    dating, due date, and the moment the baby arrives
 *   from birth   what a newborn carried over, and from whom
 *   medicines    the running ledger, with anything that doubles up
 *   still open   tests, results, follow-ups and doses not yet closed
 *   readings     what was said in the chat, correctable and forgettable
 *   family       the links the memory knows about
 */

const LOOP_ICON: Record<LoopType, LucideIcon> = {
  test_ordered: FlaskConical,
  result_pending: Receipt,
  followup_due: Stethoscope,
  vaccine_due: Syringe,
  reminder: CalendarClock,
};

export default function MemoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const member = useFamily().data?.profile ?? null;
  const memory = useMemory(member?.id);
  const ctx = useMemo(() => (memory.data ? buildContext(memory.data, todayIso()) : null), [memory.data]);

  if (!member || memory.isPending) {
    return (
      <ScreenSkeleton title="Memory">
        <DetailSkeleton hero={170} />
        <ListSkeleton rows={3} />
      </ScreenSkeleton>
    );
  }
  if (!ctx) {
    return (
      <View className="flex-1 bg-canvas">
        <ScreenHeader title="Memory" fallback="/ask" />
        <Text style={{ padding: 24, fontFamily: font.regular, fontSize: 15, color: ink[500] }}>Nothing to show for this member.</Text>
      </View>
    );
  }

  const name = ctx.subject.firstName;
  const refresh = () => refreshMemory(qc, member.id);
  const ongoing = ctx.pregnancies.find((p) => p.status === "ongoing") ?? null;
  const canCarry = ctx.subject.sex === "female" && ctx.clock.ageYears !== null && ctx.clock.ageYears >= 15 && ctx.clock.ageYears <= 50;
  const facts = ctx.facts.filter((f) => !f.supersededBy).sort((a, b) => b.observedOn.localeCompare(a.observedOn));
  const ledger = [...ctx.ledger].sort((a, b) => Number(a.status === "ended") - Number(b.status === "ended"));
  const flags = ctx.flags;

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader title="Memory" fallback="/ask" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 40, gap: 22 }} showsVerticalScrollIndicator={false}>
        <View style={[glassShadow, { borderRadius: 32, overflow: "hidden" }]}>
          <Gradient from={lilac.deep} to={lilac.mist} angle="diagonal" glow="#ffffff" />
          <View style={{ padding: 20, gap: 6 }}>
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[500] }}>What I remember about {name}</Text>
            <Text style={{ fontFamily: font.semibold, fontSize: 24, letterSpacing: -0.7, color: ink[900] }}>{ctx.clock.label}</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[700] }}>
              {memoryLine(ctx)}. Everything I say about {name} is read against this.
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <Pill label="Ask about it" icon={MessageCircle} onPress={() => router.push("/ask")} dark />
              <Pill label="Past conversations" onPress={() => router.push("/chats")} />
            </View>
          </View>
        </View>

        {ctx.notes.map((n) => (
          <Note key={n.text} text={n.text} />
        ))}

        {ongoing ? (
          <Section title="Pregnancy">
            <Card>
              <Row icon={Baby} title={ctx.clock.relative?.kind === "gestational" ? `${formatGa(ctx.clock.relative.totalDays)} today` : "Pregnancy"} detail={ctx.clock.relative?.kind === "gestational" ? `Due ${shortDate(ctx.clock.relative.edd)}, by ${ctx.clock.relative.source === "scan" ? "scan dating" : ctx.clock.relative.source === "lmp" ? "the last period" : "the doctor's date"}` : null} />
              <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500] }}>
                {ongoing.datings.length ? `${ongoing.datings.length} scan dating${ongoing.datings.length === 1 ? "" : "s"} on file. ` : ""}Thresholds for {name} use pregnancy ranges for the right trimester.
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pill label="Add a scan or date" onPress={() => router.push({ pathname: "/pregnancy", params: { id: ongoing.id } })} />
                <Pill label="The baby has arrived" icon={Baby} dark onPress={() => router.push({ pathname: "/pregnancy", params: { id: ongoing.id, birth: "1" } })} />
              </View>
            </Card>
          </Section>
        ) : canCarry ? (
          <Tap scale={0.98} accessibilityRole="button" onPress={() => router.push("/pregnancy")} style={[glassShadow, { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 24, backgroundColor: "#fff", padding: 14 }]}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
              <Baby size={18} color={ink[900]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Expecting?</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>Track the weeks, and the baby joins the family with their history when they arrive.</Text>
            </View>
          </Tap>
        ) : null}

        {ctx.subject.birth ? (
          <Section title="Carried over at birth">
            <Card>
              <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 20, color: ink[700] }}>
                {[
                  ctx.subject.birth.gaAtBirthDays ? `Born at ${formatGa(ctx.subject.birth.gaAtBirthDays)}` : null,
                  ctx.subject.birth.deliveryMode ? `by ${ctx.subject.birth.deliveryMode}` : null,
                  ctx.subject.birth.birthWeightKg ? `weighing ${ctx.subject.birth.birthWeightKg} kg` : null,
                ]
                  .filter(Boolean)
                  .join(", ") || "Born into this family"}
                .
              </Text>
              {ctx.subject.birth.maternalBloodGroup ? <Row icon={HeartHandshake} title={`Mother's blood group: ${ctx.subject.birth.maternalBloodGroup}`} detail="Used when reading newborn jaundice" /> : null}
              {ctx.subject.birth.inUteroMedicines.length ? <Row icon={PillBottle} title="Mother's medicines before birth" detail={ctx.subject.birth.inUteroMedicines.join(", ")} /> : null}
              <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>Copied from the pregnancy in the mother&apos;s file when the baby was added.</Text>
            </Card>
          </Section>
        ) : null}

        <Section title="Medicines" count={ledger.filter((e) => e.status !== "ended").length}>
          {flags.map((f) => {
            const tone = f.tier === "reassure" ? null : TIER_STYLE[f.tier];
            return (
              <View key={f.title} style={{ borderRadius: 24, backgroundColor: tone ? tone.bg : surface.tint, padding: 14, gap: 4 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 13, color: tone ? tone.fg : ink[900] }}>{f.title}</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700] }}>{f.text}</Text>
              </View>
            );
          })}
          {ledger.length ? (
            <Card>
              {ledger.map((e, i) => (
                <LedgerRow key={e.key} entry={e} first={i === 0} />
              ))}
            </Card>
          ) : null}
          {ledger.some((e) => e.status === "active") ? (
            <View style={{ flexDirection: "row" }}>
              <Pill label="Doses, refills and reminders" icon={PillBottle} dark onPress={() => router.push("/medicines")} />
            </View>
          ) : null}
          {ledger.length ? null : (
            <Empty text={`No medicines on file for ${name}. A prescription, a pharmacy bill or a photo of the box all add to this.`} />
          )}
        </Section>

        <Section title="Still open" count={ctx.loops.length}>
          {ctx.loops.length ? (
            <Card>
              {ctx.loops.map((l, i) => (
                <LoopRow
                  key={l.key}
                  loop={l}
                  first={i === 0}
                  onAsk={() => router.push({ pathname: "/ask", params: { q: `What's the latest on ${l.title.toLowerCase()}?` } })}
                  onSet={(status) => {
                    // Gone from "Still open" at once; back, with Retry, if the save fails.
                    const row = { key: l.key, type: l.type, title: l.title, detail: l.detail, opened_on: l.openedOn, due_by: l.dueBy, status, source_document_id: l.sourceDocumentId };
                    void optimisticQueries(
                      qc,
                      [{ key: memoryKey(member.id), update: (old) => ({ ...(old as MemoryBundle), loops: [...(old as MemoryBundle).loops.filter((r) => r.key !== l.key), row] }) }],
                      { write: () => setLoopStatus(member.id, l, status), message: "Couldn't update that. Check your connection.", onSaved: refresh },
                    );
                  }}
                />
              ))}
            </Card>
          ) : (
            <Empty text="Nothing waiting: no test without a result, no follow-up or dose coming up." />
          )}
        </Section>

        <Section title="Readings you've told me" count={facts.length}>
          {facts.length ? (
            <Card>
              {facts.slice(0, 30).map((f, i) => (
                <FactRow
                  key={f.id}
                  fact={f}
                  first={i === 0}
                  onCorrect={(v) => {
                    // The corrected reading shows at once; the old one comes back, with Retry, if the save fails.
                    const id = randomUUID();
                    const row = { id, key: f.key, label: f.label, value: v, value_text: null, unit: f.unit, observed_on: f.observedOn, source: "chat" };
                    void optimisticQueries(
                      qc,
                      [
                        {
                          key: memoryKey(member.id),
                          update: (old) => {
                            const b = old as MemoryBundle;
                            return { ...b, facts: [...b.facts.map((r) => (r.id === f.id ? { ...r, superseded_by: id } : r)), row] };
                          },
                        },
                      ],
                      { write: () => correctFact(member.id, f, v, id), message: "Couldn't save the correction. Check your connection.", onSaved: refresh },
                    );
                  }}
                  onForget={async () => {
                    if (await forgetFact(f.id)) {
                      qc.setQueryData(memoryKey(member.id), (old: typeof memory.data) => (old ? { ...old, facts: old.facts.filter((x) => x.id !== f.id) } : old));
                      refresh();
                    }
                  }}
                />
              ))}
            </Card>
          ) : (
            <Empty text={`Tell me a reading in the chat ("BP 128/82 this morning", "weight 3.4 kg") and I'll keep it with ${name}'s reports.`} />
          )}
        </Section>

        {ctx.subject.relations.length ? (
          <Section title="Family links">
            <Card>
              {ctx.subject.relations.map((r) => (
                <Row key={r.subjectId} icon={HeartHandshake} title={`${r.type.charAt(0).toUpperCase()}${r.type.slice(1)}: ${r.name}`} detail={r.bloodGroup ? `Blood group ${r.bloodGroup}. The only thing read across from their file.` : "Nothing from their file is read across."} />
              ))}
            </Card>
          </Section>
        ) : null}

        <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], textAlign: "center", paddingHorizontal: 12 }}>
          Cheeku reads symptoms against this memory and says how urgent things look. It does not diagnose. Limits for newborns and pregnancy still need sign-off from a clinician.
        </Text>
      </ScrollView>
    </View>
  );
}

// ------------------------------------------------------------------ parts --

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3, color: ink[900] }}>{title}</Text>
        {count ? <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>{count}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={[glassShadow, { borderRadius: 24, backgroundColor: "#fff", padding: 14, gap: 12 }]}>{children}</View>;
}

function Note({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, borderRadius: 24, backgroundColor: brand[50], padding: 14 }}>
      <Info size={15} color={ink[900]} style={{ marginTop: 2 }} />
      <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[700] }}>{text}</Text>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={{ borderRadius: 24, borderWidth: 1, borderStyle: "dashed", borderColor: surface.line, padding: 14 }}>
      <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[500] }}>{text}</Text>
    </View>
  );
}

function Row({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string | null }) {
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} color={ink[900]} />
      </View>
      <View style={{ flex: 1, gap: 2, justifyContent: "center" }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{title}</Text>
        {detail ? <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: ink[500] }}>{detail}</Text> : null}
      </View>
    </View>
  );
}

function Pill({ label, icon: Icon, onPress, dark }: { label: string; icon?: LucideIcon; onPress: () => void; dark?: boolean }) {
  return (
    <Tap accessibilityRole="button" onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 13, borderRadius: 999, backgroundColor: dark ? ink[900] : surface.tint }}>
      {Icon ? <Icon size={14} color={dark ? "#fff" : ink[900]} /> : null}
      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: dark ? "#fff" : ink[900] }}>{label}</Text>
    </Tap>
  );
}

function Divider({ show }: { show: boolean }) {
  return show ? <View style={{ height: 1, backgroundColor: surface.line }} /> : null;
}

const CLASS_LABEL: Record<string, string> = { nutraceutical: "Food supplement licence", cosmetic: "Cosmetic licence", device: "Device" };

function LedgerRow({ entry, first }: { entry: LedgerEntry; first: boolean }) {
  const ended = entry.status === "ended";
  return (
    <View style={{ gap: 12 }}>
      <Divider show={!first} />
      <View style={{ flexDirection: "row", gap: 10, opacity: ended ? 0.55 : 1 }}>
        <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
          <PillBottle size={16} color={ink[900]} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{entry.name}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: ink[500] }}>
            {[entry.ingredients.map((i) => i.name).join(" + "), entry.prescribedBy, ended ? `Ended ${shortDate(entry.end)}` : entry.end ? `Until ${shortDate(entry.end)}` : null].filter(Boolean).join(" · ")}
          </Text>
          {CLASS_LABEL[entry.regulatoryClass] ? (
            <View style={{ alignSelf: "flex-start", marginTop: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: surface.tint }}>
              <Text style={{ fontFamily: font.medium, fontSize: 11, color: ink[700] }}>{CLASS_LABEL[entry.regulatoryClass]}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function LoopRow({ loop, first, onAsk, onSet }: { loop: LoopView; first: boolean; onAsk: () => void; onSet: (s: "closed" | "dismissed") => void }) {
  const Icon = LOOP_ICON[loop.type];
  return (
    <View style={{ gap: 12 }}>
      <Divider show={!first} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} color={ink[900]} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{loop.title}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: loop.overdue ? brand[700] : ink[500] }}>
            {loopWhen(loop)}
            {loop.detail ? ` · ${loop.detail}` : ""}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Pill label="Done" icon={Check} onPress={() => onSet("closed")} />
            <Pill label="Not needed" icon={X} onPress={() => onSet("dismissed")} />
            <Pill label="Ask" icon={MessageCircle} onPress={onAsk} />
          </View>
        </View>
      </View>
    </View>
  );
}

function FactRow({ fact, first, onCorrect, onForget }: { fact: Fact; first: boolean; onCorrect: (v: number) => void; onForget: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(fact.value !== null ? String(fact.value) : "");
  const n = Number(value);
  return (
    <View style={{ gap: 12 }}>
      <Divider show={!first} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>
            {fact.label}: {fact.valueText && fact.key.startsWith("bp_") ? fact.valueText : `${fact.value ?? fact.valueText}${fact.unit ? ` ${fact.unit}` : ""}`}
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>
            {shortDate(fact.observedOn)} · {fact.source === "device" ? "From a home device" : "You told me"}
            {fact.valueText && !fact.key.startsWith("bp_") ? ` · ${fact.valueText}` : ""}
          </Text>
        </View>
        {!editing ? (
          <>
            {fact.value !== null && !fact.key.startsWith("bp_") ? (
              <Tap accessibilityRole="button" accessibilityLabel={`Correct ${fact.label}`} onPress={() => setEditing(true)} hitSlop={6}>
                <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[600] }}>Correct</Text>
              </Tap>
            ) : null}
            <Tap accessibilityRole="button" accessibilityLabel={`Forget ${fact.label}`} onPress={onForget} hitSlop={6}>
              <Trash2 size={16} color={ink[300]} />
            </Tap>
          </>
        ) : null}
      </View>
      {editing ? (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <TextInput
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            accessibilityLabel={`New value for ${fact.label}`}
            style={{ flex: 1, height: 44, borderRadius: 16, borderWidth: 1, borderColor: brand[300], paddingHorizontal: 12, fontFamily: font.regular, fontSize: 15, color: ink[900] }}
          />
          <PillButton
            disabled={!Number.isFinite(n) || value.trim() === ""}
            onPress={() => {
              setEditing(false);
              onCorrect(n);
            }}
            style={{ height: 44 }}
          >
            Save
          </PillButton>
        </View>
      ) : null}
    </View>
  );
}
