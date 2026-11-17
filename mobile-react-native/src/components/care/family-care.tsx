import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Bell, BellOff, Check, ChevronRight, Phone } from "lucide-react-native";
import { Linking, Text, View } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { GLASS_SHEEN, PILLAR_TONE, glassCard } from "@/components/today/palette";
import { Icon3D, type Icon3DName } from "@/components/ui/icon3d";
import { LinesSkeleton } from "@/components/ui/skeleton";
import { Tap } from "@/components/ui/tap";
import { verdict, type CareAttention, type CareReading, type CareSummary } from "@/lib/care/care";
import { useMemberCare } from "@/lib/care/use-care";
import { feel } from "@/lib/feel";
import { saveDailyPrefs, useDailyPrefs } from "@/lib/home/logs";
import { SLOT_LABEL } from "@/lib/home/meds";
import { shortDate } from "@/lib/records/details";
import type { ActiveProfile } from "@/lib/profiles/context";
import { useSwitchMember } from "@/lib/profiles/family";
import { brand, ink, surface } from "@/theme/tokens";
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

/*
 * REDESIGN, 17 Nov 2026 (owner: "rework the magic, clean, breathable, better
 * colours, no gradient, no yellow or brown"). Each person is a light glass
 * card in Today's palette: their face, one coloured line for how they are,
 * today's doses as tiles, their numbers as big figures with Cheeku's 3D
 * objects, what needs you in coral, then call and open their day. Nothing
 * here is an emergency, so nothing is red; "needs you" is coral, "done" is mint.
 */

const ATTENTION_3D: Record<CareAttention["kind"], Icon3DName> = {
  late_dose: "blister",
  overdue: "calendar",
  refill: "capsule",
  quiet: "bell",
  due_soon: "calendar",
};

const READING_3D: Record<CareReading["key"], Icon3DName> = { bp: "heart", sugar: "glucose", weight: "scale" };

const NEEDS = PILLAR_TONE.eat; // coral
const GOOD = PILLAR_TONE.move; // mint

function statusTone(summary: CareSummary | null) {
  if (!summary) return { fg: ink[500], dot: ink[300] };
  if (summary.status === "attention") return { fg: NEEDS.deep, dot: NEEDS.accent };
  if (summary.status === "idle") return { fg: ink[500], dot: ink[300] };
  return { fg: GOOD.deep, dot: GOOD.accent };
}

/** One person on the Family care screen. */
export function MemberCareCard({ member, phone }: { member: ActiveProfile; phone: string | null }) {
  const router = useRouter();
  const qc = useQueryClient();
  const switchMember = useSwitchMember();
  const prefs = useDailyPrefs(member.id);
  const { summary, meds, alerts, loading } = useMemberCare(member.id);
  const name = firstName(member.name);
  const st = statusTone(summary);

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
    <View style={[glassCard("rgba(255,255,255,0.82)"), { borderRadius: 28, padding: 18 }]}>
      <View pointerEvents="none" style={GLASS_SHEEN} />
      {/* Who, and how they are, in one line of colour */}
      <View className="flex-row items-center gap-3">
        <Avatar svg={member.avatar} photo={member.photo} image={member.avatarImage} background={member.avatarBackground} size={56} />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: ink[900] }}>
            {member.name}
          </Text>
          <View className="mt-1 flex-row items-center gap-1.5">
            <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: st.dot }} />
            <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 14, color: st.fg }}>{summary ? verdict(summary) : "Checking"}</Text>
          </View>
        </View>
        <Tap
          accessibilityRole="switch"
          accessibilityState={{ checked: alerts }}
          accessibilityLabel={`Alerts about ${name}`}
          onPress={toggleAlerts}
          scale={0.95}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: alerts ? brand[50] : surface.tint }}
        >
          {alerts ? <Bell size={14} color={brand[700]} /> : <BellOff size={14} color={ink[500]} />}
          <Text style={{ fontFamily: font.semibold, fontSize: 12, color: alerts ? brand[700] : ink[500] }}>{alerts ? "Alerts on" : "Alerts off"}</Text>
        </Tap>
      </View>

      {loading || !summary ? (
        <LinesSkeleton lines={3} style={{ marginTop: 16 }} />
      ) : (
        <>
          {/* Today's doses, slot by slot */}
          {summary.slots.length ? (
            <View className="mt-5">
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[500], marginBottom: 8 }}>Today&apos;s doses</Text>
              <View className="flex-row gap-2">
                {summary.slots.map((s) => {
                  const tone = s.done ? GOOD : s.late ? NEEDS : PILLAR_TONE.sleep;
                  return (
                    <View key={s.slot} style={[glassCard(tone.glass, tone.accent), { flex: 1, borderRadius: 20, padding: 12 }]}>
                      <View className="flex-row items-center justify-between">
                        <Text style={{ fontFamily: font.medium, fontSize: 12, color: tone.deep }}>{SLOT_LABEL[s.slot]}</Text>
                        {s.done ? (
                          <View style={{ width: 20, height: 20, borderRadius: 999, backgroundColor: tone.accent, alignItems: "center", justifyContent: "center" }}>
                            <Check size={11} color="#fff" strokeWidth={3.2} />
                          </View>
                        ) : null}
                      </View>
                      <Text style={{ fontFamily: font.semibold, fontSize: 24, letterSpacing: -0.6, color: ink[900], marginTop: 6 }}>
                        {s.taken}
                        <Text style={{ fontFamily: font.medium, fontSize: 14, letterSpacing: 0, color: ink[500] }}>{` / ${s.total}`}</Text>
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <Tap accessibilityRole="button" onPress={() => open("/medicines")} scale={0.98} className="mt-5 flex-row items-center gap-3" style={{ borderRadius: 20, padding: 12, backgroundColor: PILLAR_TONE.check.glass }}>
              <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                <Icon3D name="blister" size={26} />
              </View>
              <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 14, lineHeight: 19, color: PILLAR_TONE.check.deep }}>
                {meds?.unscheduled.length ? `Set when ${name} takes their medicines` : `No medicines on a schedule for ${name}`}
              </Text>
              <ChevronRight size={16} color={PILLAR_TONE.check.deep} />
            </Tap>
          )}

          {/* The week and their numbers, as big figures */}
          {weekPct !== null || summary.readings.length ? (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {weekPct !== null ? (
                <View style={{ flexGrow: 1, flexBasis: "45%", borderRadius: 20, padding: 14, backgroundColor: surface.tint }}>
                  <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[500] }}>This week</Text>
                  <Text style={{ fontFamily: font.semibold, fontSize: 26, letterSpacing: -0.8, color: ink[900], marginTop: 4 }}>
                    {weekPct}
                    <Text style={{ fontFamily: font.medium, fontSize: 14, letterSpacing: 0, color: ink[500] }}>%</Text>
                  </Text>
                  <View style={{ height: 6, borderRadius: 999, backgroundColor: "#fff", marginTop: 8, overflow: "hidden" }}>
                    <View style={{ height: 6, borderRadius: 999, width: `${Math.max(4, weekPct)}%`, backgroundColor: weekPct >= 80 ? GOOD.accent : NEEDS.accent }} />
                  </View>
                  <Text style={{ fontFamily: font.regular, fontSize: 11, color: ink[500], marginTop: 6 }}>of doses ticked</Text>
                </View>
              ) : null}
              {summary.readings.map((r) => (
                <View key={r.key} style={{ flexGrow: 1, flexBasis: "45%", borderRadius: 20, padding: 14, backgroundColor: r.flagged ? NEEDS.glass : surface.tint }}>
                  <View className="flex-row items-center justify-between">
                    <Text style={{ fontFamily: font.medium, fontSize: 12, color: r.flagged ? NEEDS.deep : ink[500] }}>{r.label}</Text>
                    <Icon3D name={READING_3D[r.key]} size={22} />
                  </View>
                  <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 26, letterSpacing: -0.8, color: ink[900], marginTop: 4 }}>
                    {r.value}
                    {r.key !== "bp" ? <Text style={{ fontFamily: font.medium, fontSize: 14, letterSpacing: 0, color: ink[500] }}>{` ${r.unit}`}</Text> : null}
                  </Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 11, color: ink[500], marginTop: 4 }}>{shortDate(r.date).replace(/ \d{4}$/, "")}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* What needs you, in coral */}
          {summary.attention.length ? (
            <View className="mt-3 gap-2">
              {summary.attention.slice(0, 3).map((a) => {
                const soft = a.kind === "due_soon";
                const tone = soft ? PILLAR_TONE.check : NEEDS;
                const body = (
                  <View className="flex-row items-center gap-3" style={{ borderRadius: 18, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: tone.glass }}>
                    <View style={{ width: 34, height: 34, borderRadius: 999, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                      <Icon3D name={ATTENTION_3D[a.kind]} size={22} />
                    </View>
                    <Text numberOfLines={2} style={{ flex: 1, fontFamily: font.medium, fontSize: 14, lineHeight: 19, color: tone.deep }}>
                      {a.text}
                    </Text>
                    {a.route ? <ChevronRight size={16} color={tone.deep} /> : null}
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
          <View className="mt-4 flex-row gap-2">
            <Tap
              accessibilityRole="button"
              onPress={() => open("/today")}
              scale={0.97}
              style={{ flex: 1, height: 48, borderRadius: 999, backgroundColor: brand[600], alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>{`Open ${name}'s day`}</Text>
            </Tap>
            {phone ? (
              <Tap
                accessibilityRole="button"
                accessibilityLabel={`Call ${name}`}
                onPress={() => {
                  feel.tap();
                  void Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, "")}`);
                }}
                scale={0.97}
                style={{ height: 48, paddingHorizontal: 18, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: GOOD.glass }}
              >
                <Phone size={16} color={GOOD.deep} />
                <Text style={{ fontFamily: font.semibold, fontSize: 15, color: GOOD.deep }}>Call</Text>
              </Tap>
            ) : null}
          </View>
        </>
      )}
    </View>
  );
}

/** One person in a line, for Home. */
function CareRow({ member, first }: { member: ActiveProfile; first: boolean }) {
  const { summary } = useMemberCare(member.id);
  const st = statusTone(summary ?? null);
  return (
    <View className="flex-row items-center gap-3 py-2.5" style={first ? undefined : { borderTopWidth: 1, borderTopColor: surface.line }}>
      <View>
        <Avatar svg={member.avatar} photo={member.photo} image={member.avatarImage} background={member.avatarBackground} size={36} />
        <View className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-pill border-2 border-white" style={{ backgroundColor: st.dot }} />
      </View>
      <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>
        {firstName(member.name)}
      </Text>
      <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 13, color: st.fg }}>
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
      <View className="px-4 pb-1.5 pt-3.5" style={[glassCard("rgba(255,255,255,0.85)"), { borderRadius: 24 }]}>
        <View className="mb-1 flex-row items-center gap-2.5">
          <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: PILLAR_TONE.mind.bg, alignItems: "center", justifyContent: "center" }}>
            <Icon3D name="family" size={24} />
          </View>
          <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>Family care</Text>
          <ChevronRight size={16} color={ink[300]} />
        </View>
        {members.slice(0, 3).map((m, i) => (
          <CareRow key={m.id} member={m} first={i === 0} />
        ))}
      </View>
    </Tap>
  );
}
