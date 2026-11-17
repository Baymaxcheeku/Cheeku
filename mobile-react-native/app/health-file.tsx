import { useRouter } from "expo-router";
import { ChevronRight, PenLine, Share2, TrendingDown, TrendingUp } from "lucide-react-native";
import { useState } from "react";
import { RefreshControl, ScrollView, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FileSkeleton } from "@/components/ui/skeleton";
import { FLAG_DOT, SectionHead, Sparkline } from "@/components/health/file-parts";
import { FamilyRow, SkyWash } from "@/components/home/front";
import { statusWords } from "@/components/insurance/parts";
import { GLASS_SHEEN, PILLAR_TONE, glassCard } from "@/components/today/palette";
import { Avatar } from "@/components/ui/avatar";
import { Brand } from "@/components/ui/brand";
import { GlassCircle } from "@/components/ui/glass";
import { Icon3D, type Icon3DName } from "@/components/ui/icon3d";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { Tap } from "@/components/ui/tap";
import { shareText, whenLabel, type HealthFile, type Tracked, type UpcomingKind } from "@/lib/health/file";
import { useHealthFile } from "@/lib/health/queries";
import type { ActiveProfile } from "@/lib/profiles/context";
import { useFamily, useSwitchMember } from "@/lib/profiles/family";
import { rupeesShort, shortDate } from "@/lib/records/details";
import { DOC_TYPE_LABEL, FLAG_LABEL } from "@/lib/records/types";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

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
        <SkyWash top={-140} />
        {/* Whose file: the same row of faces as Home. Switching here switches the app. */}
        {members.length > 1 ? (
          <View style={{ marginBottom: 6 }}>
            <FamilyRow members={members} activeId={member?.id ?? ""} locked={false} onSelect={(id) => id !== member?.id && void switchMember(id)} onAdd={() => router.push("/family")} />
          </View>
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

/*
 * REDESIGN, 17 Nov 2026 (owner: "100x the health file, our new icons, keep
 * Home's structure"). Same language as Home: the family as a row of faces,
 * white glass cards, big numbers people can read across a room, Cheeku's 3D
 * objects instead of outline icons, and colour only where it means something
 * (a lab flag, an allergy, something overdue). The order answers a doctor's
 * waiting-room questions: who is this, what's flagged, what's coming, what
 * do they take, what covers them, who has seen them, what's in the file.
 */

const CARD = [glassCard("#ffffff", "#0f1030"), { borderRadius: 24, shadowOpacity: 0.05 }] as const;
const NEEDS = PILLAR_TONE.eat; // coral
const LOW = PILLAR_TONE.check; // blue

const TYPE_3D: Record<string, Icon3DName> = {
  lab_report: "test-tube",
  prescription: "blister",
  discharge: "hospital",
  scan: "monitor",
  bill: "report",
  consultation_invoice: "report",
  booking_invoice: "report",
  vaccination: "syringe",
  insurance: "shield",
  medication: "capsule",
  other: "folder",
};

/** Short names for the "In the file" tiles, so none is cut off. */
const TYPE_SHORT: Record<string, string> = {
  lab_report: "Lab reports",
  prescription: "Prescriptions",
  discharge: "Discharges",
  scan: "Scans",
  bill: "Bills",
  consultation_invoice: "Consults",
  booking_invoice: "Bookings",
  vaccination: "Vaccines",
  insurance: "Insurance",
  medication: "Medicines",
  other: "Other",
};

const UPCOMING_3D: Record<UpcomingKind, Icon3DName> = {
  follow_up: "doctor",
  next_dose: "syringe",
  renewal: "shield",
  appointment: "calendar-check",
  lab_visit: "test-tube",
  refill: "capsule",
};

function Plate({ name, size = 44 }: { name: Icon3DName; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: surface.tint, alignItems: "center", justifyContent: "center" }}>
      <Icon3D name={name} size={Math.round(size * 0.64)} />
    </View>
  );
}

function FileBody({ f, memberId, member, onAdd }: { f: HealthFile; memberId: string; member: ActiveProfile; onAdd: () => void }) {
  const router = useRouter();
  const everyone = useFamily().data?.access.all ?? [];
  const p = f.person;
  const who = p.isPrimary ? "you" : p.firstName;
  const [allValues, setAllValues] = useState(false);
  const [allUpcoming, setAllUpcoming] = useState(false);
  const steady = f.tracked.filter((t) => !f.flagged.includes(t));
  const shownSteady = allValues ? steady : steady.slice(0, 5);
  const identity = [p.relationship && !p.isPrimary ? p.relationship : null, p.age !== null ? `${p.age} years` : null, p.sex].filter(Boolean).join(" · ");
  // The same booking can arrive from a record and a booking: show it once.
  const upcoming = f.upcoming.filter((u, i, all) => all.findIndex((x) => x.title === u.title && x.date === u.date) === i);
  const shownUpcoming = allUpcoming ? upcoming : upcoming.slice(0, 3);
  const recent = f.recent.filter((r, i, all) => all.findIndex((x) => x.title === r.title && x.eventDate === r.eventDate) === i);

  return (
    <View>
      {/* Who this is: face, the three numbers a nurse asks first, allergies before anything else. */}
      <View style={[...CARD, { marginTop: 8, borderRadius: 28, padding: 18 }]}>
        <View pointerEvents="none" style={GLASS_SHEEN} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Avatar svg={member.avatar} photo={member.photo} image={member.avatarImage} background={member.avatarBackground} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 22, letterSpacing: -0.5, color: ink[900] }}>{p.name}</Text>
            {identity ? <Text style={{ fontFamily: font.regular, fontSize: 14, color: ink[500], marginTop: 2 }}>{identity}</Text> : null}
          </View>
          <Tap scale={0.95} accessibilityRole="button" accessibilityLabel="Edit health details" onPress={() => router.push(`/family/${memberId}`)} hitSlop={6} style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: surface.tint, alignItems: "center", justifyContent: "center" }}>
            <PenLine size={16} color={ink[700]} />
          </Tap>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
          <Vital label="Blood" value={p.bloodGroup} icon="blood" />
          <Vital label="Height" value={p.heightCm ? String(p.heightCm) : null} unit="cm" />
          <Vital label="Weight" value={p.weightKg ? String(p.weightKg) : null} unit="kg" icon="scale" />
        </View>

        <View style={{ marginTop: 16, gap: 12 }}>
          <TagRow label="Allergies" items={p.allergies} empty="None recorded" bg={NEEDS.bg} fg={NEEDS.deep} />
          <TagRow label="Conditions" items={p.conditions} empty="None recorded" bg={brand[50]} fg={brand[700]} />
        </View>
      </View>

      {/* The file at a glance. */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        <Stat icon="folder" n={String(f.totals.records)} label={f.totals.records === 1 ? "record" : "records"} />
        <Stat icon="heart" n={String(f.totals.valuesTracked)} label="values tracked" />
        <Stat icon="calendar" n={f.totals.firstEvent ? f.totals.firstEvent.slice(0, 4) : "–"} label="first record" />
      </View>

      {f.totals.needsReview ? (
        <Tap accessibilityRole="button" onPress={() => router.push("/records")} scale={0.98} style={[...CARD, { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 12, padding: 12 }]}>
          <Plate name="report" size={40} />
          <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 14, lineHeight: 19, color: ink[900] }}>
            {f.totals.needsReview} record{f.totals.needsReview === 1 ? " is" : "s are"} waiting for {p.isPrimary ? "your" : "a"} quick check
          </Text>
          <ChevronRight size={16} color={ink[300]} />
        </Tap>
      ) : null}

      {f.totals.records === 0 ? (
        <View style={[...CARD, { marginTop: 14, alignItems: "center", paddingHorizontal: 24, paddingVertical: 26, borderRadius: 28 }]}>
          <Icon3D name="folder" size={64} />
          <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: ink[900], textAlign: "center", marginTop: 10 }}>Nothing filed for {who} yet</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink[500], textAlign: "center", marginTop: 6 }}>
            Snap a report, a prescription or a vaccination card. It lands here, sorted.
          </Text>
          <PillButton tone="brand" onPress={onAdd} style={{ marginTop: 18, paddingHorizontal: 24 }}>
            Add a record
          </PillButton>
        </View>
      ) : null}

      {/* What the labs flagged: tiles with the number big and the trend drawn. */}
      {f.flagged.length ? (
        <>
          <SectionHead title="Worth a look" right={<Text style={{ fontFamily: font.semibold, fontSize: 14, color: NEEDS.deep }}>{f.flagged.length} flagged</Text>} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {f.flagged.map((t) => (
              <FlagTile key={t.key} t={t} />
            ))}
          </View>
          <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], marginTop: 10 }}>
            Flagged by the lab that ran the test, against its own printed range. A flag is not a diagnosis.
          </Text>
          <Tap
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/ask", params: { q: `How have ${p.isPrimary ? "my" : `${p.firstName}'s`} flagged values moved, and does anything need a doctor?` } })}
            scale={0.97}
            style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, alignSelf: "flex-start", height: 44, paddingLeft: 6, paddingRight: 16, borderRadius: 999, backgroundColor: brand[600] }}
          >
            <View style={{ width: 32, height: 32, borderRadius: 999, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
              <Icon3D name="chat" size={22} />
            </View>
            <Text style={{ fontFamily: font.semibold, fontSize: 14, color: "#fff" }}>Ask Cheeku about these</Text>
          </Tap>
        </>
      ) : null}

      {upcoming.length ? (
        <>
          <SectionHead title="Coming up" right={<Text style={{ fontFamily: font.medium, fontSize: 14, color: ink[500] }}>{upcoming.length}</Text>} />
          <View style={[...CARD, { overflow: "hidden" }]}>
            {shownUpcoming.map((u, i) => {
              const overdue = u.days < 0;
              return (
                <Tap scale={0.98} key={u.id} accessibilityRole="button" onPress={() => router.push((u.href ?? `/records/${u.documentId}`) as never)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}>
                  <Plate name={UPCOMING_3D[u.kind]} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{u.title}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>
                      {shortDate(u.date)}
                      {u.detail ? ` · ${u.detail}` : ""}
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: overdue ? NEEDS.bg : surface.tint }}>
                    <Text style={{ fontFamily: font.semibold, fontSize: 12, color: overdue ? NEEDS.deep : ink[700] }}>{overdue ? "Overdue" : whenLabel(u.days)}</Text>
                  </View>
                </Tap>
              );
            })}
          </View>
          {upcoming.length > 3 ? (
            <Tap accessibilityRole="button" onPress={() => setAllUpcoming((v) => !v)} hitSlop={6} style={{ alignSelf: "center", marginTop: 10 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 14, color: brand[600] }}>{allUpcoming ? "Show fewer" : `Show all ${upcoming.length}`}</Text>
            </Tap>
          ) : null}
        </>
      ) : null}

      {steady.length ? (
        <>
          <SectionHead title="Values over time" right={<Text style={{ fontFamily: font.medium, fontSize: 14, color: ink[500] }}>{steady.length} tracked</Text>} />
          <View style={[...CARD, { overflow: "hidden" }]}>
            {shownSteady.map((t, i) => (
              <ValueRow key={t.key} t={t} first={i === 0} />
            ))}
          </View>
          {steady.length > 5 ? (
            <Tap accessibilityRole="button" onPress={() => setAllValues((v) => !v)} hitSlop={6} style={{ alignSelf: "center", marginTop: 10 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 14, color: brand[600] }}>{allValues ? "Show fewer" : `Show all ${steady.length}`}</Text>
            </Tap>
          ) : null}
        </>
      ) : null}

      {f.medicines.length ? (
        <>
          <SectionHead title="Medicines" right={<Text style={{ fontFamily: font.medium, fontSize: 14, color: ink[500] }}>{f.medicines.length}</Text>} />
          <View style={[...CARD, { overflow: "hidden" }]}>
            {f.medicines.map((m, i) => (
              <Tap
                scale={0.98}
                key={`${m.name}-${i}`}
                accessibilityRole={m.documentId ? "button" : "text"}
                disabled={!m.documentId}
                onPress={() => m.documentId && router.push(`/records/${m.documentId}`)}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}
              >
                <Plate name={/syrup|drop|gargle|ml\b/i.test(`${m.name} ${m.detail ?? ""}`) ? "capsule" : "blister"} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{m.name}</Text>
                  {m.detail ? <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>{m.detail}</Text> : null}
                </View>
                <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[300] }}>{m.source === "profile" ? "In the list" : m.date ? shortDate(m.date).replace(/ \d{4}$/, "") : "From a record"}</Text>
              </Tap>
            ))}
          </View>
          <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], marginTop: 8 }}>
            <Brand /> never suggests a medicine, a dose or a change. This is the list, not advice.
          </Text>
        </>
      ) : null}

      {f.vaccines.length ? (
        <>
          <SectionHead title="Vaccinations" right={<Text style={{ fontFamily: font.medium, fontSize: 14, color: ink[500] }}>{f.vaccines.length}</Text>} />
          <View style={[...CARD, { overflow: "hidden" }]}>
            {f.vaccines.map((v, i) => (
              <Tap scale={0.98} key={`${v.name}-${i}`} disabled={!v.documentId} onPress={() => v.documentId && router.push(`/records/${v.documentId}`)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}>
                <Plate name="syringe" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{v.name}</Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>{v.label}</Text>
                </View>
                <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>{v.date ? shortDate(v.date) : ""}</Text>
              </Tap>
            ))}
          </View>
        </>
      ) : null}

      {/* Insurance, light: the amount left is the number that matters. */}
      <SectionHead
        title="Insurance"
        right={
          f.cover.length ? (
            <Tap accessibilityRole="button" onPress={() => router.push("/insurance")} hitSlop={8}>
              <Text style={{ fontFamily: font.semibold, fontSize: 14, color: brand[600] }}>Manage</Text>
            </Tap>
          ) : undefined
        }
      />
      {f.cover.length ? (
        <View style={{ gap: 10 }}>
          {f.cover.map((c) => {
            const left = c.sumInsured > 0 ? Math.max(0, Math.min(1, c.remaining / c.sumInsured)) : 0;
            const covered = everyone.filter((m) => c.coveredIds.includes(m.id));
            return (
              <Tap key={c.href} accessibilityRole="button" accessibilityLabel={`${c.insurer}. ${rupeesShort(c.remaining)} available of ${rupeesShort(c.sumInsured)}. ${statusWords(c.status, c.daysLeft, c.start, c.end)}.`} onPress={() => router.push(c.href as never)} scale={0.98} style={[...CARD, { padding: 16 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Plate name="shield" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{c.insurer}</Text>
                    {c.subtitle ? <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>{c.subtitle}</Text> : null}
                  </View>
                  <ChevronRight size={16} color={ink[300]} />
                </View>
                <Text style={{ marginTop: 14 }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 30, letterSpacing: -1, color: ink[900] }}>{rupeesShort(c.remaining)}</Text>
                  <Text style={{ fontFamily: font.medium, fontSize: 14, color: ink[500] }}>{`  left of ${rupeesShort(c.sumInsured)}`}</Text>
                </Text>
                <View style={{ height: 8, borderRadius: 999, backgroundColor: surface.tint, marginTop: 10, overflow: "hidden" }}>
                  <View style={{ height: 8, borderRadius: 999, width: `${Math.max(3, left * 100)}%`, backgroundColor: brand[500] }} />
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
                  {covered.length ? (
                    <View style={{ flexDirection: "row" }}>
                      {covered.slice(0, 4).map((m, i) => (
                        <View key={m.id} style={{ marginLeft: i ? -8 : 0 }}>
                          <Avatar svg={m.avatar} photo={m.photo} image={m.avatarImage} background={m.avatarBackground} size={24} ring="#ffffff" />
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.regular, fontSize: 12, color: ink[500] }}>{statusWords(c.status, c.daysLeft, c.start, c.end)}</Text>
                  {c.policyNo ? <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[300] }}>{`•••• ${c.policyNo.slice(-4)}`}</Text> : null}
                </View>
              </Tap>
            );
          })}
        </View>
      ) : (
        <Tap
          accessibilityRole="button"
          onPress={() => router.push({ pathname: "/insurance/edit", params: { for: member.id } })}
          scale={0.98}
          style={[...CARD, { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }]}
        >
          <Plate name="shield" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{p.isPrimary ? "Add your insurance" : `Add ${p.firstName}'s insurance`}</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>See what's left, and ask Cheeku what it covers</Text>
          </View>
          <ChevronRight size={16} color={ink[300]} />
        </Tap>
      )}

      {/* Who they've seen: a shelf of doctors and places, like Home's booking row. */}
      {f.careTeam.length ? (
        <>
          <SectionHead title={p.isPrimary ? "Who you've seen" : `Who ${p.firstName} has seen`} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 6, gap: 10 }}>
            {f.careTeam.map((c) => (
              <View key={`${c.kind}-${c.name}`} style={[...CARD, { width: 150, padding: 14, borderRadius: 22 }]}>
                <Plate name={c.kind === "doctor" ? "doctor" : "hospital"} size={48} />
                <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 14, lineHeight: 18, color: ink[900], marginTop: 10, minHeight: 36 }}>{c.name}</Text>
                <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 4 }}>
                  {c.visits} record{c.visits === 1 ? "" : "s"}
                  {c.last ? ` · ${shortDate(c.last).replace(/ \d{4}$/, "")}` : ""}
                </Text>
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}

      {/* Everything in the file, by kind. */}
      {f.byType.length ? (
        <>
          <SectionHead
            title="In the file"
            right={
              <Tap accessibilityRole="link" onPress={() => router.push("/records")} hitSlop={6}>
                <Text style={{ fontFamily: font.semibold, fontSize: 14, color: brand[600] }}>All records</Text>
              </Tap>
            }
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {f.byType.map((it) => (
              <Tap key={it.type} accessibilityRole="button" accessibilityLabel={`${it.count} ${DOC_TYPE_LABEL[it.type]}`} onPress={() => router.push({ pathname: "/records", params: { type: it.type } })} scale={0.96} style={[...CARD, { width: "31.6%", padding: 12, borderRadius: 22 }]}>
                <Icon3D name={TYPE_3D[it.type] ?? "folder"} size={34} />
                <Text style={{ fontFamily: font.semibold, fontSize: 22, letterSpacing: -0.6, color: ink[900], marginTop: 8 }}>{it.count}</Text>
                <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>{TYPE_SHORT[it.type] ?? DOC_TYPE_LABEL[it.type]}</Text>
              </Tap>
            ))}
          </View>
        </>
      ) : null}

      {recent.length ? (
        <>
          <SectionHead title="Recent records" />
          <View style={[...CARD, { overflow: "hidden" }]}>
            {recent.slice(0, 4).map((r, i) => (
              <Tap scale={0.98} key={r.id} accessibilityRole="button" onPress={() => router.push(`/records/${r.id}`)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}>
                <Plate name={TYPE_3D[r.docType] ?? "folder"} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{r.title}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>
                    {[r.eventDate ? shortDate(r.eventDate) : null, r.status === "needs_review" ? "Waiting for a check" : r.summary].filter(Boolean).join(" · ")}
                  </Text>
                </View>
                <ChevronRight size={16} color={ink[300]} />
              </Tap>
            ))}
          </View>
        </>
      ) : null}

      <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[300], textAlign: "center", marginTop: 26 }}>
        Everything here is what the records say. <Brand /> reads it back; it does not interpret it.
      </Text>
    </View>
  );
}

function Vital({ label, value, unit, icon }: { label: string; value: string | null; unit?: string; icon?: Icon3DName }) {
  return (
    <View style={{ flex: 1, padding: 12, borderRadius: 18, backgroundColor: surface.tint }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[500] }}>{label}</Text>
        {icon ? <Icon3D name={icon} size={18} /> : null}
      </View>
      <Text numberOfLines={1} style={{ marginTop: 6 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: value ? 22 : 14, letterSpacing: value ? -0.6 : 0, color: value ? ink[900] : ink[300] }}>{value ?? "Not added"}</Text>
        {value && unit ? <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>{` ${unit}`}</Text> : null}
      </Text>
    </View>
  );
}

function TagRow({ label, items, empty, bg, fg }: { label: string; items: string[]; empty: string; bg: string; fg: string }) {
  /*
   * Packed into rows by length rather than three at a time, so a long
   * condition sits alone and wraps instead of running off the screen (and
   * without flexWrap, which stretched wrapped rows on iOS; see PROGRESS.md).
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
      <Text style={{ width: 82, fontFamily: font.medium, fontSize: 13, color: ink[500], marginTop: 6 }}>{label}</Text>
      <View style={{ flex: 1, gap: 6 }}>
        {items.length === 0 ? (
          <Text style={{ fontFamily: font.regular, fontSize: 14, color: ink[300], marginTop: 5 }}>{empty}</Text>
        ) : (
          rows.map((row, r) => (
            <View key={r} style={{ flexDirection: "row", gap: 6 }}>
              {row.map((t) => (
                <View key={t} style={{ flexShrink: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: bg }}>
                  <Text style={{ flexShrink: 1, fontFamily: font.semibold, fontSize: 13, color: fg }}>{t}</Text>
                </View>
              ))}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function Stat({ icon, n, label }: { icon: Icon3DName; n: string; label: string }) {
  return (
    <View style={[...CARD, { flex: 1, padding: 14, borderRadius: 22 }]}>
      <Icon3D name={icon} size={28} />
      <Text style={{ fontFamily: font.semibold, fontSize: 24, letterSpacing: -0.6, color: ink[900], marginTop: 8 }}>{n}</Text>
      <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>{label}</Text>
    </View>
  );
}

/** A flagged value as a tile: the number big, the flag in one word, the history drawn. */
function FlagTile({ t }: { t: Tracked }) {
  const router = useRouter();
  const flag = t.latest.flag;
  const tone = flag === "low" ? LOW : NEEDS;
  return (
    <Tap
      scale={0.97}
      accessibilityRole="button"
      accessibilityLabel={`${t.name}, ${t.latest.value} ${t.unit ?? ""}, ${flag ? FLAG_LABEL[flag] : ""}`}
      disabled={!t.latest.documentId}
      onPress={() => t.latest.documentId && router.push(`/records/${t.latest.documentId}`)}
      style={[...CARD, { width: "48.8%", padding: 14, borderRadius: 22 }]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.medium, fontSize: 13, color: ink[500] }}>{t.name}</Text>
        {flag && flag !== "normal" ? (
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: tone.bg }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 11, color: tone.deep }}>{FLAG_LABEL[flag]}</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={{ marginTop: 6 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 28, letterSpacing: -0.8, color: ink[900] }}>{t.latest.value}</Text>
        {t.unit ? <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>{` ${t.unit}`}</Text> : null}
      </Text>
      <View style={{ marginTop: 8, height: 30, justifyContent: "center" }}>
        {t.points.length > 1 ? <Sparkline values={t.points.map((x) => x.value)} refRange={t.refRange} flag={flag} width={130} height={30} /> : <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[300] }}>One reading</Text>}
      </View>
      <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 11, color: ink[500], marginTop: 6 }}>
        {[t.refRange ? `Range ${t.refRange}` : null, t.direction && t.direction !== "same" && t.previous ? `was ${t.previous.value}` : null].filter(Boolean).join(" · ")}
      </Text>
    </Tap>
  );
}

function ValueRow({ t, first }: { t: Tracked; first: boolean }) {
  const router = useRouter();
  const flag = t.latest.flag;
  return (
    <Tap
      scale={0.98}
      accessibilityRole="button"
      disabled={!t.latest.documentId}
      onPress={() => t.latest.documentId && router.push(`/records/${t.latest.documentId}`)}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: first ? 0 : 1, borderTopColor: surface.line }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>{t.name}</Text>
        <Text numberOfLines={1} style={{ marginTop: 2 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: ink[900] }}>{t.latest.value}</Text>
          {t.unit ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>{` ${t.unit}`}</Text> : null}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: ink[300], marginTop: 2 }}>
          {[t.refRange ? `Range ${t.refRange}` : null, t.latest.date ? shortDate(t.latest.date) : null].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        {t.points.length > 1 ? (
          <Sparkline values={t.points.map((x) => x.value)} refRange={t.refRange} flag={flag} />
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
