import { useRouter } from "expo-router";
import {
  MessageCircle,
  BadgeCheck,
  Building2,
  CalendarHeart,
  ChevronRight,
  PenLine,
  Pill,
  RefreshCw,
  Share2,
  ShieldAlert,
  ShieldPlus,
  Stethoscope,
  Syringe,
  TestTube,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FileSkeleton } from "@/components/ui/skeleton";
import { FLAG_DOT, SectionHead, Sparkline } from "@/components/health/file-parts";
import { TYPE_STYLE } from "@/components/records/record-card";
import { Avatar } from "@/components/ui/avatar";
import { Brand } from "@/components/ui/brand";
import { Glass, GlassCircle, Gradient, glass, glassShadow } from "@/components/ui/glass";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { shareText, whenLabel, type HealthFile, type Tracked, type UpcomingKind } from "@/lib/health/file";
import { useHealthFile } from "@/lib/health/queries";
import type { ActiveProfile } from "@/lib/profiles/context";
import { useFamily, useSwitchMember } from "@/lib/profiles/family";
import { rupeesShort, shortDate } from "@/lib/records/details";
import { DOC_TYPE_LABEL, FLAG_LABEL } from "@/lib/records/types";
import { brand, hue, ink, lilac, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { Tap } from "@/components/ui/tap";

/**
 * ONE PERSON'S HEALTH FILE.
 *
 * The page a family member would want open in a doctor's waiting room: who
 * this is (allergies first), what's coming up, what the labs flagged and how
 * those values have moved, what they take, their vaccinations and cover, who
 * has seen them, and every record by kind.
 *
 * IT FOLLOWS THE FAMILY. The switcher at the top switches the whole app, the
 * same as the tray on Home, and the file is fetched per member: switching
 * shows the next person's file, never the last person's while it loads.
 *
 * WHAT IT IS NOT. Not a score, not a grade, not a "health age". Every number
 * is something a document says, or a count of documents.
 */
export default function HealthFileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const family = useFamily();
  const switchMember = useSwitchMember();
  const member = family.data?.profile ?? null;
  const members = family.data?.access.selectable ?? [];
  const file = useHealthFile(member?.id);
  const f = file.data ?? null;

  const share = () => {
    if (f) void Share.share({ title: `${f.person.name}: health summary`, message: shareText(f) }).catch(() => undefined);
  };

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader
        title="Health file"
        subtitle={member ? (member.isPrimary ? "Yours" : member.name.split(" ")[0]) : undefined}
        fallback="/home"
        right={
          <GlassCircle label="Share a summary" onPress={share}>
            <Share2 size={18} color={ink[900]} />
          </GlassCircle>
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={file.isRefetching} onRefresh={() => void file.refetch()} tintColor={brand[600]} />}
      >
        {/* Whose file. Switching here switches the app. */}
        {members.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 6 }}>
            {members.map((m) => {
              const on = m.id === member?.id;
              return (
                <Tap
                  key={m.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${m.isPrimary ? "You" : m.name}'s file`}
                  onPress={() => !on && void switchMember(m.id)}
                  style={[on ? null : glassShadow, { flexDirection: "row", alignItems: "center", gap: 8, height: 44, paddingLeft: 4, paddingRight: 14, borderRadius: 999, backgroundColor: on ? ink[900] : glass.fillStrong, borderWidth: on ? 0 : 1, borderColor: glass.rim }]}
                >
                  <Avatar svg={m.avatar} photo={m.photo} image={m.avatarImage} background={m.avatarBackground} size={36} />
                  <Text style={{ fontFamily: font.semibold, fontSize: 13, color: on ? "#fff" : ink[900] }}>{m.isPrimary ? "You" : m.name.split(" ")[0]}</Text>
                </Tap>
              );
            })}
          </ScrollView>
        ) : null}

        <View style={{ paddingHorizontal: 20 }}>
          {file.isPending || !member ? (
            <FileSkeleton />
          ) : !f ? (
            <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[500], textAlign: "center", marginTop: 50 }}>
              This file isn&apos;t available. It may belong to a family member your plan doesn&apos;t cover.
            </Text>
          ) : (
            <FileBody f={f} memberId={member.id} member={member} onAdd={() => router.push("/scan")} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function FileBody({ f, memberId, member, onAdd }: { f: HealthFile; memberId: string; member: ActiveProfile; onAdd: () => void }) {
  const router = useRouter();
  const p = f.person;
  const who = p.isPrimary ? "you" : p.firstName;
  const [allValues, setAllValues] = useState(false);
  const steady = f.tracked.filter((t) => !f.flagged.includes(t));
  const shownSteady = allValues ? steady : steady.slice(0, 6);
  const identity = [p.relationship && !p.isPrimary ? p.relationship : null, p.age !== null ? `${p.age} years` : null, p.sex].filter(Boolean).join(" · ");

  return (
    <View>
      {/* Who this is, allergies first. */}
      <View style={[glassShadow, { marginTop: 10, borderRadius: 32, overflow: "hidden", padding: 18 }]}>
        <Gradient from={lilac.base} to="#ffffff" angle="diagonal" glow="#ffffff" />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ borderRadius: 999, borderWidth: 3, borderColor: "#fff" }}>
            <Avatar svg={member.avatar} photo={member.photo} image={member.avatarImage} background={member.avatarBackground} size={62} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: ink[900] }}>{p.name}</Text>
            {identity ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 2 }}>{identity}</Text> : null}
          </View>
          <Tap scale={0.95} accessibilityRole="button" accessibilityLabel="Edit health details" onPress={() => router.push(`/family/${memberId}`)} hitSlop={6} style={{ width: 38, height: 38, borderRadius: 999, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
            <PenLine size={16} color={brand[700]} />
          </Tap>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
          <Vital label="Blood group" value={p.bloodGroup} />
          <Vital label="Height" value={p.heightCm ? `${p.heightCm} cm` : null} />
          <Vital label="Weight" value={p.weightKg ? `${p.weightKg} kg` : null} />
        </View>

        <View style={{ marginTop: 14, gap: 10 }}>
          <TagRow label="Allergies" items={p.allergies} empty="None recorded" bg={semantic.cautionBg} fg={semantic.cautionText} icon={ShieldAlert} />
          <TagRow label="Conditions" items={p.conditions} empty="None recorded" bg={brand[50]} fg={brand[700]} />
        </View>
      </View>

      {/* The file in three numbers. */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <Stat n={String(f.totals.records)} label={f.totals.records === 1 ? "record" : "records"} />
        <Stat n={String(f.totals.valuesTracked)} label="values tracked" />
        <Stat n={f.totals.firstEvent ? f.totals.firstEvent.slice(0, 4) : "–"} label="first record" />
      </View>

      {f.totals.needsReview ? (
        <Tap accessibilityRole="button" onPress={() => router.push("/records")} style={{ marginTop: 12 }}>
          <Glass strong className="flex-row items-center gap-3 rounded-xl p-3.5">
            <BadgeCheck size={18} color={brand[600]} />
            <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 13, color: ink[900] }}>
              {f.totals.needsReview} record{f.totals.needsReview === 1 ? " is" : "s are"} waiting for {p.isPrimary ? "your" : "a"} quick check
            </Text>
            <ChevronRight size={16} color={ink[500]} />
          </Glass>
        </Tap>
      ) : null}

      {f.totals.records === 0 ? (
        <Glass strong className="mt-4 items-center rounded-xl px-6 py-7">
          <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], textAlign: "center" }}>Nothing filed for {who} yet</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[500], textAlign: "center", marginTop: 6 }}>
            Snap a report, a prescription or a vaccination card and it lands here, sorted.
          </Text>
          <PillButton tone="brand" onPress={onAdd} style={{ marginTop: 16, paddingHorizontal: 22 }}>
            Add a record
          </PillButton>
        </Glass>
      ) : null}

      {f.upcoming.length ? (
        <>
          <SectionHead title="Coming up" note="Dates from the records and bookings themselves." />
          <Glass strong className="overflow-hidden rounded-xl">
            {f.upcoming.slice(0, 5).map((u, i) => {
              const k = UPCOMING[u.kind];
              const overdue = u.days < 0;
              return (
                <Tap scale={0.98} key={u.id} accessibilityRole="button" onPress={() => router.push(`/records/${u.documentId}`)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: k.bg, alignItems: "center", justifyContent: "center" }}>
                    <k.icon size={18} color={k.fg} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{u.title}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>
                      {shortDate(u.date)}
                      {u.detail ? ` · ${u.detail}` : ""}
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: overdue ? semantic.cautionBg : brand[50] }}>
                    <Text style={{ fontFamily: font.semibold, fontSize: 12, color: overdue ? semantic.cautionText : brand[700] }}>{overdue ? "Overdue" : whenLabel(u.days)}</Text>
                  </View>
                </Tap>
              );
            })}
          </Glass>
        </>
      ) : null}

      {f.flagged.length ? (
        <>
          <SectionHead title="Worth a look" right={<Text style={{ fontFamily: font.semibold, fontSize: 13, color: semantic.dangerText }}>{f.flagged.length} flagged</Text>} />
          <Glass strong className="overflow-hidden rounded-xl">
            {f.flagged.map((t, i) => (
              <ValueRow key={t.key} t={t} first={i === 0} />
            ))}
          </Glass>
          <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], marginTop: 8 }}>
            Flagged by the lab that ran the test, against its own printed range. A flag is not a diagnosis.
          </Text>
          <Tap
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/ask", params: { q: `How have ${p.isPrimary ? "my" : `${p.firstName}'s`} flagged values moved, and does anything need a doctor?` } })}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: brand[50] }}
          >
            <MessageCircle size={14} color={brand[600]} />
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[700] }}>Ask Cheeku about these</Text>
          </Tap>
        </>
      ) : null}

      {steady.length ? (
        <>
          <SectionHead title="Values over time" right={<Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>{steady.length} tracked</Text>} />
          <Glass strong className="overflow-hidden rounded-xl">
            {shownSteady.map((t, i) => (
              <ValueRow key={t.key} t={t} first={i === 0} />
            ))}
          </Glass>
          {steady.length > 6 ? (
            <Tap accessibilityRole="button" onPress={() => setAllValues((v) => !v)} hitSlop={6} style={{ alignSelf: "center", marginTop: 10 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[700] }}>{allValues ? "Show fewer" : `Show all ${steady.length}`}</Text>
            </Tap>
          ) : null}
        </>
      ) : null}

      {f.medicines.length ? (
        <>
          <SectionHead title="Medicines" right={<Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>{f.medicines.length}</Text>} />
          <Glass strong className="overflow-hidden rounded-xl">
            {f.medicines.map((m, i) => (
              <Tap scale={0.98}
                key={`${m.name}-${i}`}
                accessibilityRole={m.documentId ? "button" : "text"}
                disabled={!m.documentId}
                onPress={() => m.documentId && router.push(`/records/${m.documentId}`)}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}
              >
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: hue.plum.bg, alignItems: "center", justifyContent: "center" }}>
                  <Pill size={17} color={hue.plum.fg} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{m.name}</Text>
                  {m.detail ? <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>{m.detail}</Text> : null}
                </View>
                <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[300] }}>{m.source === "profile" ? "In the list" : m.date ? `Rx ${shortDate(m.date)}` : "From a record"}</Text>
              </Tap>
            ))}
          </Glass>
          <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], marginTop: 8 }}>
            <Brand /> never suggests a medicine, a dose or a change. This is the list, not advice.
          </Text>
        </>
      ) : null}

      {f.vaccines.length ? (
        <>
          <SectionHead title="Vaccinations" />
          <Glass strong className="overflow-hidden rounded-xl">
            {f.vaccines.map((v, i) => (
              <Tap scale={0.98} key={`${v.name}-${i}`} disabled={!v.documentId} onPress={() => v.documentId && router.push(`/records/${v.documentId}`)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: hue.rose.bg, alignItems: "center", justifyContent: "center" }}>
                  <Syringe size={17} color={hue.rose.fg} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{v.name}</Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>{v.label}</Text>
                </View>
                <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>{v.date ? shortDate(v.date) : ""}</Text>
              </Tap>
            ))}
          </Glass>
        </>
      ) : null}

      {f.cover.length ? (
        <>
          <SectionHead title="Insurance cover" />
          <View style={{ gap: 10 }}>
            {f.cover.map((c) => (
              <Pressable key={c.documentId} accessibilityRole="button" onPress={() => router.push(`/records/${c.documentId}`)} style={({ pressed }) => [glassShadow, { borderRadius: 24, overflow: "hidden", padding: 16, transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
                <Gradient from={hue.ocean.fg} to="#1b8aa3" angle="diagonal" />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <ShieldPlus size={18} color="#fff" />
                  <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>{c.insurer}</Text>
                  <Text style={{ fontFamily: font.semibold, fontSize: 12, color: "rgba(255,255,255,0.85)" }}>{c.status === "renew_soon" ? `Renews in ${c.daysLeft} days` : c.end ? `Till ${shortDate(c.end)}` : "Active"}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 20, marginTop: 12 }}>
                  <View>
                    <Text style={{ fontFamily: font.bold, fontSize: 20, color: "#fff" }}>{rupeesShort(c.remaining)}</Text>
                    <Text style={{ fontFamily: font.regular, fontSize: 12, color: "rgba(255,255,255,0.75)" }}>available</Text>
                  </View>
                  <View>
                    <Text style={{ fontFamily: font.bold, fontSize: 20, color: "#fff" }}>{rupeesShort(c.sumInsured)}</Text>
                    <Text style={{ fontFamily: font.regular, fontSize: 12, color: "rgba(255,255,255,0.75)" }}>sum insured</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {f.careTeam.length ? (
        <>
          <SectionHead title={p.isPrimary ? "Who you've seen" : `Who ${p.firstName} has seen`} />
          <Glass strong className="overflow-hidden rounded-xl">
            {f.careTeam.map((c, i) => (
              <View key={`${c.kind}-${c.name}`} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.kind === "doctor" ? hue.teal.bg : surface.line, alignItems: "center", justifyContent: "center" }}>
                  {c.kind === "doctor" ? <Stethoscope size={17} color={hue.teal.fg} /> : <Building2 size={17} color={hue.indigo.fg} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{c.name}</Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>
                    {c.visits} record{c.visits === 1 ? "" : "s"}
                    {c.last ? ` · last ${shortDate(c.last)}` : ""}
                  </Text>
                </View>
              </View>
            ))}
          </Glass>
        </>
      ) : null}

      {f.recent.length ? (
        <>
          <SectionHead
            title="Recent records"
            right={
              <Tap accessibilityRole="link" onPress={() => router.push("/records")} hitSlop={6}>
                <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[700] }}>See all</Text>
              </Tap>
            }
          />
          <Glass strong className="overflow-hidden rounded-xl">
            {f.recent.map((r, i) => {
              const style = TYPE_STYLE[r.docType] ?? TYPE_STYLE.other;
              return (
                <Tap scale={0.98} key={r.id} accessibilityRole="button" onPress={() => router.push(`/records/${r.id}`)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: style.wash, alignItems: "center", justifyContent: "center" }}>
                    <style.icon size={18} color={style.tint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{r.title}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>
                      {[r.eventDate ? shortDate(r.eventDate) : null, r.summary, r.status === "needs_review" ? "Waiting for a check" : null].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={ink[300]} />
                </Tap>
              );
            })}
          </Glass>
        </>
      ) : null}

      {f.byType.length ? (
        <>
          <SectionHead title="In the file" />
          <TypeGrid items={f.byType} onOpen={(type) => router.push({ pathname: "/records", params: { type } })} />
        </>
      ) : null}

      <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[300], textAlign: "center", marginTop: 24 }}>
        Everything here is what the records say. <Brand /> reads it back; it does not interpret it.
      </Text>
    </View>
  );
}

const UPCOMING: Record<UpcomingKind, { icon: LucideIcon; bg: string; fg: string }> = {
  follow_up: { icon: CalendarHeart, bg: hue.teal.bg, fg: hue.teal.fg },
  next_dose: { icon: Syringe, bg: hue.rose.bg, fg: hue.rose.fg },
  renewal: { icon: ShieldPlus, bg: hue.ocean.bg, fg: hue.ocean.fg },
  appointment: { icon: Stethoscope, bg: hue.blue.wash, fg: hue.blue.fg },
  lab_visit: { icon: TestTube, bg: lilac.base, fg: "#6b4fc4" },
  refill: { icon: RefreshCw, bg: hue.plum.bg, fg: hue.plum.fg },
};

function Vital({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.8)" }}>
      <Text style={{ fontFamily: font.regular, fontSize: 11, color: ink[500] }}>{label}</Text>
      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: value ? ink[900] : ink[300], marginTop: 2 }}>{value ?? "Not added"}</Text>
    </View>
  );
}

function TagRow({ label, items, empty, bg, fg, icon: Icon }: { label: string; items: string[]; empty: string; bg: string; fg: string; icon?: LucideIcon }) {
  /*
   * Packed into rows by length rather than three at a time. A fixed three let
   * "Type 2 diabetes mellitus with peripheral neuropathy" run off the screen.
   * Rows are built here instead of with flexWrap, which stretched wrapped
   * rows to full height on iOS (see PROGRESS.md). A pill longer than a row
   * sits alone and its text wraps.
   */
  const BUDGET = 30;
  const rows: string[][] = [];
  let used = 0;
  for (const t of items) {
    const last = rows[rows.length - 1];
    if (last && used + t.length <= BUDGET) {
      last.push(t);
      used += t.length;
    } else {
      rows.push([t]);
      used = t.length;
    }
  }
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <Text style={{ width: 78, fontFamily: font.medium, fontSize: 13, color: ink[500], marginTop: 5 }}>{label}</Text>
      <View style={{ flex: 1, gap: 6 }}>
        {items.length === 0 ? (
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[300], marginTop: 4 }}>{empty}</Text>
        ) : (
          rows.map((row, r) => (
            <View key={r} style={{ flexDirection: "row", gap: 6 }}>
              {row.map((t) => (
                <View key={t} style={{ flexShrink: 1, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: bg }}>
                  {Icon ? <Icon size={11} color={fg} /> : null}
                  <Text style={{ flexShrink: 1, fontFamily: font.semibold, fontSize: 12, color: fg }}>{t}</Text>
                </View>
              ))}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <Glass strong className="rounded-xl" style={{ flex: 1, padding: 12 }}>
      <Text style={{ fontFamily: font.bold, fontSize: 20, letterSpacing: -0.4, color: ink[900] }}>{n}</Text>
      <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>{label}</Text>
    </Glass>
  );
}

function ValueRow({ t, first }: { t: Tracked; first: boolean }) {
  const router = useRouter();
  const flag = t.latest.flag;
  const flagged = flag === "high" || flag === "low" || flag === "caution";
  return (
    <Tap scale={0.98}
      accessibilityRole="button"
      disabled={!t.latest.documentId}
      onPress={() => t.latest.documentId && router.push(`/records/${t.latest.documentId}`)}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: first ? 0 : 1, borderTopColor: surface.line }}
    >
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>{t.name}</Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 1 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{t.latest.value}</Text>
          {t.unit ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>{t.unit}</Text> : null}
        </View>
        <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: ink[300], marginTop: 2 }}>
          {[t.refRange ? `Range ${t.refRange}` : null, t.latest.date ? shortDate(t.latest.date) : null].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        {flagged && flag ? (
          <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: flag === "caution" ? semantic.cautionBg : semantic.dangerBg }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 11, color: flag === "caution" ? semantic.cautionText : semantic.dangerText }}>{FLAG_LABEL[flag]}</Text>
          </View>
        ) : null}
        {t.points.length > 1 ? (
          <Sparkline values={t.points.map((p) => p.value)} refRange={t.refRange} flag={flag} />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: flag ? FLAG_DOT[flag] : brand[400] }} />
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[300] }}>One reading</Text>
          </View>
        )}
        {t.direction && t.direction !== "same" && t.previous ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            {t.direction === "up" ? <TrendingUp size={12} color={ink[500]} /> : <TrendingDown size={12} color={ink[500]} />}
            <Text style={{ fontFamily: font.regular, fontSize: 11, color: ink[500] }}>from {t.previous.value}</Text>
          </View>
        ) : null}
      </View>
    </Tap>
  );
}

function TypeGrid({ items, onOpen }: { items: { type: keyof typeof DOC_TYPE_LABEL; count: number }[]; onOpen: (type: string) => void }) {
  const rows: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <View style={{ gap: 8 }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: "row", gap: 8 }}>
          {row.map((it) => {
            const style = TYPE_STYLE[it.type] ?? TYPE_STYLE.other;
            return (
              <Pressable key={it.type} accessibilityRole="button" accessibilityLabel={`${it.count} ${DOC_TYPE_LABEL[it.type]}`} onPress={() => onOpen(it.type)} style={({ pressed }) => [glassShadow, { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 24, backgroundColor: "#fff", transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: style.wash, alignItems: "center", justifyContent: "center" }}>
                  <style.icon size={17} color={style.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.bold, fontSize: 17, color: ink[900] }}>{it.count}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>{style.label}</Text>
                </View>
              </Pressable>
            );
          })}
          {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}
