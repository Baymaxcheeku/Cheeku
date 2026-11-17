import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronRight, Search, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OfflineBanner } from "@/components/app/offline-banner";
import { FamilyRow, SkyWash } from "@/components/home/front";
import { EmptyRecords } from "@/components/records/chrome";
import { PILLAR_TONE, glassCard } from "@/components/today/palette";
import { Icon3D, type Icon3DName } from "@/components/ui/icon3d";
import { CardListSkeleton } from "@/components/ui/skeleton";
import { Tap } from "@/components/ui/tap";
import { feel } from "@/lib/feel";
import { useFamily, useSwitchMember } from "@/lib/profiles/family";
import { formatEventDate, groupByRecency } from "@/lib/records/grouping";
import { listRecords } from "@/lib/records/queries";
import { DOC_TYPES, SEVERITY_LABEL, type DocType, type RecordSummary } from "@/lib/records/types";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * RECORDS (redesign, 17 Nov 2026; owner: "adapt to the Home page style,
 * clean, clutter free, new icons, designed like a senior designer of large
 * consumer apps").
 *
 *   sky, title, family  the same row of faces as Home; a tap switches person
 *   search              titles, doctors, clinics and summaries, as you type
 *   folders             the file by kind, as 3D objects with counts; a tap
 *                       filters the list (replaces three dropdowns)
 *   attention           one coral line, only when the labs flagged something
 *   the list            by day, rows inside calm white cards, one 3D object
 *                       per row so the kind reads before the words
 *
 * The list follows the member selected on Home (rule 3: no cross-member
 * bleed); switching here switches the app, exactly like Home.
 */

type Folder = { key: string; label: string; icon: Icon3DName; types: DocType[] };

const FOLDERS: Folder[] = [
  { key: "labs", label: "Lab tests", icon: "test-tube", types: ["lab_report"] },
  { key: "rx", label: "Prescriptions", icon: "blister", types: ["prescription", "medication"] },
  { key: "scans", label: "Scans", icon: "monitor", types: ["scan"] },
  { key: "visits", label: "Hospital", icon: "hospital", types: ["discharge"] },
  { key: "vaccines", label: "Vaccines", icon: "syringe", types: ["vaccination"] },
  { key: "bills", label: "Bills", icon: "report", types: ["bill", "consultation_invoice", "booking_invoice"] },
  { key: "cover", label: "Insurance", icon: "shield", types: ["insurance"] },
  { key: "other", label: "Other", icon: "folder", types: ["other"] },
];

const TYPE_3D: Record<DocType, Icon3DName> = {
  lab_report: "test-tube",
  prescription: "blister",
  medication: "capsule",
  scan: "monitor",
  discharge: "hospital",
  vaccination: "syringe",
  bill: "report",
  consultation_invoice: "doctor",
  booking_invoice: "calendar-check",
  insurance: "shield",
  other: "folder",
};

const NEEDS = PILLAR_TONE.eat; // coral
const CARD = [glassCard("#ffffff", "#0f1030"), { borderRadius: 24, shadowOpacity: 0.05 }] as const;

export default function Records() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const family = useFamily();
  const switchMember = useSwitchMember();
  const member = family.data?.profile ?? null;
  const members = family.data?.access.selectable ?? [];
  const activeId = member?.id;

  const [folder, setFolder] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [onlyFlagged, setOnlyFlagged] = useState(false);

  // "/records?type=prescription" (from the health file's tiles) opens on that folder.
  const { type } = useLocalSearchParams<{ type?: string }>();
  useEffect(() => {
    if (type && (DOC_TYPES as readonly string[]).includes(type)) setFolder(FOLDERS.find((f) => f.types.includes(type as DocType))?.key ?? null);
  }, [type]);

  // A new person means a fresh view: last person's search or folder must not carry over.
  useEffect(() => {
    setFolder(null);
    setQ("");
    setOnlyFlagged(false);
  }, [activeId]);

  const records = useQuery({
    queryKey: ["records-list", { profileId: activeId, sort: "newest" }],
    enabled: Boolean(activeId),
    queryFn: () => listRecords({ profileId: activeId, sort: "newest" }),
  });
  const list = useMemo(() => records.data ?? [], [records.data]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of FOLDERS) m.set(f.key, list.filter((r) => f.types.includes(r.docType)).length);
    return m;
  }, [list]);
  const flagged = list.filter((r) => r.severity !== "normal");

  const shown = useMemo(() => {
    const f = FOLDERS.find((x) => x.key === folder);
    const needle = q.trim().toLowerCase();
    return list.filter(
      (r) =>
        (!f || f.types.includes(r.docType)) &&
        (!onlyFlagged || r.severity !== "normal") &&
        (!needle || [r.title, r.doctor, r.facility, r.summary].some((s) => s && s.toLowerCase().includes(needle))),
    );
  }, [list, folder, q, onlyFlagged]);
  // With no folder or search, bills and receipts fold into one row so the
  // health documents lead; the Bills folder still lists every one.
  const BILL_TYPES = FOLDERS.find((f) => f.key === "bills")?.types ?? [];
  const folding = !folder && !q.trim() && !onlyFlagged;
  const bills = folding ? shown.filter((r) => BILL_TYPES.includes(r.docType)) : [];
  const groups = groupByRecency(folding ? shown.filter((r) => !BILL_TYPES.includes(r.docType)) : shown);
  const filtered = Boolean(folder || q.trim() || onlyFlagged);
  const first = member ? (member.isPrimary ? "you" : member.name.split(/\s+/)[0]) : "you";

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{ paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={records.isFetching && !records.isPending} onRefresh={() => void queryClient.invalidateQueries({ queryKey: ["records-list"] })} tintColor={brand[600]} />
      }
    >
      <SkyWash top={-40} />
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
        <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 34, lineHeight: 40, letterSpacing: -1, color: ink[900] }}>
          Records
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 15, color: ink[500], marginTop: 2 }}>
          {list.length ? `${list.length} filed for ${first}` : `Everything Cheeku files for ${first}`}
        </Text>
      </View>

      {members.length > 1 ? (
        <View style={{ marginTop: 14 }}>
          <FamilyRow members={members} activeId={activeId ?? ""} locked={false} onSelect={(id) => id !== activeId && void switchMember(id)} onAdd={() => undefined} hideAdd />
        </View>
      ) : null}

      <OfflineBanner updatedAt={records.dataUpdatedAt} />

      {records.isSuccess && list.length === 0 ? (
        <View className="px-5">
          <EmptyRecords filtered={false} />
        </View>
      ) : (
        <>
          {/* Search */}
          <View style={[...CARD, { marginHorizontal: 20, marginTop: 16, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, height: 52, borderRadius: 999 }]}>
            <Search size={18} color={ink[500]} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search reports, doctors, clinics"
              placeholderTextColor={ink[300]}
              accessibilityLabel="Search records"
              returnKeyType="search"
              style={{ flex: 1, minWidth: 0, fontFamily: font.regular, fontSize: 16, color: ink[900], paddingVertical: 12 }}
            />
            {q ? (
              <Tap accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQ("")} hitSlop={8} style={{ width: 26, height: 26, borderRadius: 999, backgroundColor: surface.tint, alignItems: "center", justifyContent: "center" }}>
                <X size={14} color={ink[700]} />
              </Tap>
            ) : null}
          </View>

          {/* Folders: the file by kind. Only the ones with something in them. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 4, gap: 10 }}>
            <FolderTile label="All" count={list.length} icon="folder" on={folder === null} onPress={() => setFolder(null)} />
            {FOLDERS.filter((f) => (counts.get(f.key) ?? 0) > 0).map((f) => (
              <FolderTile key={f.key} label={f.label} count={counts.get(f.key) ?? 0} icon={f.icon} on={folder === f.key} onPress={() => setFolder(folder === f.key ? null : f.key)} />
            ))}
          </ScrollView>

          {/* One line when the labs flagged something; a tap shows only those. */}
          {flagged.length ? (
            <Tap
              accessibilityRole="button"
              accessibilityState={{ selected: onlyFlagged }}
              onPress={() => {
                feel.tick();
                setOnlyFlagged((v) => !v);
              }}
              scale={0.98}
              style={{ marginHorizontal: 20, marginTop: 14, flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 20, backgroundColor: NEEDS.bg, borderWidth: 1.5, borderColor: onlyFlagged ? NEEDS.accent : "transparent" }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 999, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                <Icon3D name="clipboard" size={24} />
              </View>
              <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 14, color: NEEDS.deep }}>
                {`${flagged.length} to ask your doctor about`}
              </Text>
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: NEEDS.deep }}>{onlyFlagged ? "Show all" : "Show"}</Text>
            </Tap>
          ) : null}

          {records.isPending || !activeId ? (
            <View className="mt-5 px-5">
              <CardListSkeleton />
            </View>
          ) : records.isError ? (
            <View className="mx-5 mt-8 items-center">
              <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>Could not load your records</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 14, color: ink[500], marginTop: 4, textAlign: "center" }}>Pull down to try again. Nothing has been changed.</Text>
            </View>
          ) : shown.length === 0 ? (
            <View className="px-5">
              <EmptyRecords filtered={filtered} />
            </View>
          ) : (
            groups.map((g) => (
              <View key={g.key} style={{ marginTop: 26, paddingHorizontal: 20 }}>
                <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
                  <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: ink[900] }}>{g.label}</Text>
                  <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>{g.records.length}</Text>
                </View>
                <View style={[...CARD, { overflow: "hidden" }]}>
                  {g.records.map((r, i) => (
                    <RecordRow key={r.id} r={r} first={i === 0} />
                  ))}
                </View>
              </View>
            ))
          )}
          {bills.length && !records.isPending ? (
            <Tap
              accessibilityRole="button"
              accessibilityLabel={`${bills.length} bills and receipts. Show`}
              onPress={() => {
                feel.tick();
                setFolder("bills");
              }}
              scale={0.98}
              style={[...CARD, { marginHorizontal: 20, marginTop: 26, flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }]}
            >
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: surface.tint, alignItems: "center", justifyContent: "center" }}>
                <Icon3D name="report" size={32} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{`${bills.length} bills and receipts`}</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 2 }}>Consultations, bookings and pharmacy</Text>
              </View>
              <ChevronRight size={16} color={ink[300]} />
            </Tap>
          ) : null}
        </>
      )}
      <View style={{ height: insets.bottom + 70 }} />
    </ScrollView>
  );
}

/** A folder: the 3D object, how many, and what kind. Selected gets a violet edge. */
function FolderTile({ label, count, icon, on, onPress }: { label: string; count: number; icon: Icon3DName; on: boolean; onPress: () => void }) {
  return (
    <Tap
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      accessibilityLabel={`${label}, ${count}`}
      onPress={() => {
        feel.tick();
        onPress();
      }}
      scale={0.95}
      style={[...CARD, { width: 112, padding: 14, borderRadius: 22, borderWidth: 1.5, borderColor: on ? brand[500] : "rgba(255,255,255,0.9)" }]}
    >
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: on ? brand[50] : surface.tint, alignItems: "center", justifyContent: "center" }}>
        <Icon3D name={icon} size={30} />
      </View>
      <Text style={{ fontFamily: font.semibold, fontSize: 22, letterSpacing: -0.6, color: ink[900], marginTop: 10 }}>{count}</Text>
      <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 12, color: on ? brand[700] : ink[500], marginTop: 1 }}>{label}</Text>
    </Tap>
  );
}

/** One record: its object, its title, when and the one useful line; a tag only when the lab flagged it. */
function RecordRow({ r, first }: { r: RecordSummary; first: boolean }) {
  const router = useRouter();
  const flagged = r.severity !== "normal";
  const meta = [formatEventDate(r.eventDate), r.summary ?? r.facility ?? r.doctor].filter(Boolean).join(" · ");
  return (
    <Tap
      scale={0.985}
      accessibilityRole="button"
      accessibilityLabel={`${r.title}. ${meta}${flagged ? `. ${SEVERITY_LABEL[r.severity]}` : ""}`}
      onPress={() => router.push(`/records/${r.id}`)}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: first ? 0 : 1, borderTopColor: surface.line }}
    >
      <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: surface.tint, alignItems: "center", justifyContent: "center" }}>
        <Icon3D name={TYPE_3D[r.docType] ?? "folder"} size={32} />
        {r.status === "needs_review" ? (
          <View style={{ position: "absolute", right: -3, top: -3, width: 12, height: 12, borderRadius: 999, backgroundColor: brand[500], borderWidth: 2, borderColor: "#fff" }} />
        ) : null}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{r.title}</Text>
        <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 2 }}>{meta}</Text>
        {flagged || r.status === "needs_review" ? (
          <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
            {flagged ? (
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: NEEDS.bg }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 11, color: NEEDS.deep }}>{SEVERITY_LABEL[r.severity]}</Text>
              </View>
            ) : null}
            {r.status === "needs_review" ? (
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: brand[50] }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 11, color: brand[700] }}>Needs a quick check</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      <ChevronRight size={16} color={ink[300]} />
    </Tap>
  );
}
