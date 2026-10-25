import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Bell, BellOff, CalendarClock, Check, ChevronRight, HeartHandshake, Package, Phone, Pill, TimerOff, type LucideIcon } from "lucide-react-native";
import { Linking, Text, View } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { glassShadow } from "@/components/ui/glass";
import { SpringSwitch } from "@/components/ui/motion";
import { LinesSkeleton } from "@/components/ui/skeleton";
import { Tap } from "@/components/ui/tap";
import { verdict, type CareAttention, type CareSummary } from "@/lib/care/care";
import { useMemberCare } from "@/lib/care/use-care";
import { feel } from "@/lib/feel";
import { saveDailyPrefs, useDailyPrefs } from "@/lib/home/logs";
import { SLOT_LABEL } from "@/lib/home/meds";
import { shortDate } from "@/lib/records/details";
import type { ActiveProfile } from "@/lib/profiles/context";
import { useSwitchMember } from "@/lib/profiles/family";
import { brand, hue, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * FAMILY CARE, THE CARDS (loop-caregiver).
 *
 * MemberCareCard is one person on the Family care screen: how today's doses
 * are going, the week, their latest BP and sugar, what needs you, and three
 * ways to act (call, open their day, mute alerts). CareRow is the same person
 * in one line, for Home.
 *
 * Colour follows the app's rules: caution only for "needs you", brand for
 * done, never red (nothing here is an emergency).
 */

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

const ATTENTION_ICON: Record<CareAttention["kind"], LucideIcon> = {
  late_dose: Pill,
  overdue: CalendarClock,
  refill: Package,
  quiet: TimerOff,
  due_soon: CalendarClock,
};

function StatusPill({ summary }: { summary: CareSummary }) {
  const tone =
    summary.status === "attention"
      ? { bg: semantic.cautionBg, fg: semantic.cautionText }
      : summary.status === "idle"
        ? { bg: surface.tint, fg: ink[500] }
        : { bg: brand[50], fg: brand[700] };
  return (
    <View className="flex-row items-center gap-1 rounded-pill px-2.5 py-1" style={{ backgroundColor: tone.bg }}>
      {summary.status === "good" ? <Check size={12} color={tone.fg} strokeWidth={3} /> : null}
      <Text style={{ fontFamily: font.semibold, fontSize: 12, color: tone.fg }}>{verdict(summary)}</Text>
    </View>
  );
}

/** One person on the Family care screen. */
export function MemberCareCard({ member, phone }: { member: ActiveProfile; phone: string | null }) {
  const router = useRouter();
  const qc = useQueryClient();
  const switchMember = useSwitchMember();
  const prefs = useDailyPrefs(member.id);
  const { summary, meds, alerts, loading } = useMemberCare(member.id);
  const name = firstName(member.name);

  // Their own screens open in their context, like a tap on their face.
  const open = (route: string) => {
    feel.tap();
    void switchMember(member.id);
    router.push(route as never);
  };

  const toggleAlerts = () => {
    feel.tick();
    const current = prefs.data ?? {};
    const care = (current as { care?: Record<string, unknown> }).care ?? {};
    void saveDailyPrefs(qc, member.id, { ...current, care: alerts ? { ...care, alerts: false } : Object.fromEntries(Object.entries(care).filter(([k]) => k !== "alerts")) });
  };

  const weekPct = summary?.week && summary.week.due ? Math.round((summary.week.taken / summary.week.due) * 100) : null;

  return (
    <View className="rounded-xl bg-white p-4" style={[glassShadow, { borderWidth: 1, borderColor: summary?.status === "attention" ? semantic.cautionBg : surface.line }]}>
      <View className="flex-row items-center gap-3">
        <Avatar svg={member.avatar} photo={member.photo} image={member.avatarImage} background={member.avatarBackground} size={48} />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3, color: ink[900] }}>
            {member.name}
          </Text>
          {summary ? (
            <View className="mt-1 flex-row">
              <StatusPill summary={summary} />
            </View>
          ) : null}
        </View>
        <View className="items-center">
          <SpringSwitch checked={alerts} onChange={toggleAlerts} label={`Alerts about ${name}`} />
          <View className="mt-1 flex-row items-center gap-1">
            {alerts ? <Bell size={11} color={ink[500]} /> : <BellOff size={11} color={ink[300]} />}
            <Text style={{ fontFamily: font.medium, fontSize: 11, color: alerts ? ink[500] : ink[300] }}>{alerts ? "Alerts on" : "Alerts off"}</Text>
          </View>
        </View>
      </View>

      {loading || !summary ? (
        <LinesSkeleton lines={3} style={{ marginTop: 16 }} />
      ) : (
        <>
          {/* Today's doses, slot by slot */}
          {summary.slots.length ? (
            <View className="mt-4 flex-row gap-2">
              {summary.slots.map((s) => {
                const tone = s.done ? { bg: brand[600], fg: "#fff" } : s.late ? { bg: semantic.cautionBg, fg: semantic.cautionText } : { bg: surface.tint, fg: ink[700] };
                return (
                  <View key={s.slot} className="flex-1 rounded-lg px-3 py-2.5" style={{ backgroundColor: tone.bg }}>
                    <Text style={{ fontFamily: font.medium, fontSize: 12, color: s.done ? "rgba(255,255,255,0.8)" : ink[500] }}>{SLOT_LABEL[s.slot]}</Text>
                    <View className="mt-0.5 flex-row items-center gap-1">
                      {s.done ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
                      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: tone.fg }}>{s.done ? "Done" : `${s.taken} of ${s.total}`}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Tap accessibilityRole="button" onPress={() => open("/medicines")} className="mt-4 flex-row items-center gap-2 rounded-lg px-3 py-3" style={{ backgroundColor: surface.tint }}>
              <Pill size={16} color={brand[600]} />
              <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 13, color: ink[700] }}>{meds?.unscheduled.length ? `Set when ${name} takes their medicines` : `No medicines on a schedule for ${name}`}</Text>
              <ChevronRight size={16} color={ink[300]} />
            </Tap>
          )}

          {/* The week and their numbers */}
          {weekPct !== null || summary.readings.length ? (
            <View className="mt-2 flex-row gap-2">
              {weekPct !== null ? <Stat label="This week" value={`${weekPct}%`} sub="doses ticked" /> : null}
              {summary.readings.map((r) => (
                <Stat key={r.key} label={r.label} value={r.value} unit={r.key === "bp" ? undefined : r.unit} sub={shortDate(r.date).replace(/ \d{4}$/, "")} warn={r.flagged} />
              ))}
            </View>
          ) : null}

          {/* What needs you */}
          {summary.attention.length ? (
            <View className="mt-3 gap-1.5">
              {summary.attention.slice(0, 3).map((a) => {
                const Icon = ATTENTION_ICON[a.kind];
                const soft = a.kind === "due_soon";
                const body = (
                  <View className="flex-row items-center gap-2.5 rounded-lg px-3 py-2.5" style={{ backgroundColor: soft ? surface.tint : semantic.cautionBg }}>
                    <Icon size={15} color={soft ? ink[500] : semantic.cautionText} />
                    <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.medium, fontSize: 13, color: soft ? ink[700] : semantic.cautionText }}>
                      {a.text}
                    </Text>
                    {a.route ? <ChevronRight size={15} color={soft ? ink[300] : semantic.cautionText} /> : null}
                  </View>
                );
                return a.route ? (
                  <Tap key={a.kind + a.text} accessibilityRole="button" onPress={() => open(a.route as string)} scale={0.98}>
                    {body}
                  </Tap>
                ) : (
                  <View key={a.kind + a.text}>{body}</View>
                );
              })}
            </View>
          ) : null}

          {/* Act */}
          <View className="mt-4 flex-row flex-wrap items-center gap-2" style={{ alignItems: "flex-start" }}>
            {phone ? (
              <Tap
                accessibilityRole="button"
                accessibilityLabel={`Call ${name}`}
                onPress={() => {
                  feel.tap();
                  void Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, "")}`);
                }}
                className="h-10 flex-row items-center gap-1.5 rounded-pill px-4"
                style={{ backgroundColor: brand[600] }}
              >
                <Phone size={15} color="#fff" />
                <Text style={{ fontFamily: font.semibold, fontSize: 13, color: "#fff" }}>{`Call ${name}`}</Text>
              </Tap>
            ) : null}
            <Tap
              accessibilityRole="button"
              onPress={() => open("/today")}
              className="h-10 flex-row items-center gap-1.5 rounded-pill px-4"
              style={{ backgroundColor: phone ? "#fff" : brand[600], borderWidth: phone ? 1 : 0, borderColor: surface.line }}
            >
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: phone ? ink[900] : "#fff" }}>{`Open ${name}'s day`}</Text>
            </Tap>
          </View>
        </>
      )}
    </View>
  );
}

function Stat({ label, value, unit, sub, warn }: { label: string; value: string; unit?: string; sub: string; warn?: boolean }) {
  return (
    <View className="flex-1 rounded-lg px-3 py-2.5" style={{ backgroundColor: warn ? semantic.cautionBg : surface.tint }}>
      <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[500] }}>{label}</Text>
      <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 17, color: warn ? semantic.cautionText : ink[900], marginTop: 1 }}>
        {value}
        {unit ? <Text style={{ fontFamily: font.medium, fontSize: 11, color: ink[500] }}>{` ${unit}`}</Text> : null}
      </Text>
      <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 11, color: ink[500], marginTop: 1 }}>
        {sub}
      </Text>
    </View>
  );
}

/** One person in a line, for Home. */
function CareRow({ member, first }: { member: ActiveProfile; first: boolean }) {
  const { summary } = useMemberCare(member.id);
  const tone = summary?.status === "attention" ? semantic.caution : summary?.status === "good" ? brand[500] : ink[300];
  return (
    <View className="flex-row items-center gap-3 py-2.5" style={first ? undefined : { borderTopWidth: 1, borderTopColor: surface.line }}>
      <View>
        <Avatar svg={member.avatar} photo={member.photo} image={member.avatarImage} background={member.avatarBackground} size={36} />
        <View className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-pill border-2 border-white" style={{ backgroundColor: tone }} />
      </View>
      <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>
        {firstName(member.name)}
      </Text>
      <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 13, color: summary?.status === "attention" ? semantic.cautionText : ink[500] }}>
        {summary ? verdict(summary) : " "}
      </Text>
    </View>
  );
}

/** Home's window onto Family care: everyone else, one line each. */
export function FamilyCareCard({ members, onOpen }: { members: readonly ActiveProfile[]; onOpen: () => void }) {
  if (!members.length) return null;
  return (
    <Tap accessibilityRole="button" accessibilityLabel="Family care. See how everyone is doing" onPress={onOpen} scale={0.98}>
      <View className="rounded-xl bg-white px-4 pb-1.5 pt-3.5" style={[glassShadow, { borderWidth: 1, borderColor: surface.line }]}>
        <View className="mb-1 flex-row items-center gap-2">
          <View className="h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: hue.rose.bg }}>
            <HeartHandshake size={15} color={hue.rose.fg} />
          </View>
          <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Family care</Text>
          <ChevronRight size={16} color={ink[300]} />
        </View>
        {members.slice(0, 3).map((m, i) => (
          <CareRow key={m.id} member={m} first={i === 0} />
        ))}
      </View>
    </Tap>
  );
}
