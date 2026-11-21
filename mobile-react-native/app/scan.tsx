import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  Camera as CameraIcon,
  Check,
  ChevronDown,
  ChevronRight,
  Cpu,
  FileText,
  FileUp,
  FlaskConical,
  Images,
  Lock,
  Pill,
  ScanSearch,
  Search,
  Share2,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Tap } from "@/components/ui/tap";
import { MascotFigure } from "@/components/illustrations/sprout";
import { Avatar } from "@/components/ui/avatar";
import { Glass, Gradient, glass, glassShadow } from "@/components/ui/glass";
import { PillButton, ScreenHeader } from "@/components/ui/screen";
import { FamilyRow, SkyWash } from "@/components/home/front";
import { TYPE_3D } from "@/components/records/type-3d";
import { glassCard } from "@/components/today/palette";
import { Icon3D } from "@/components/ui/icon3d";
import { font } from "@/theme/type";
import { activeProfile, selectableProfiles } from "@/lib/profiles/context";
import { TYPE_STYLE } from "@/components/records/record-card";
import { ScanConfirm } from "@/components/scan/confirm";
import { discardUpload, fileUpload, prepareUpload, type PickedFile, type Prepared } from "@/lib/records/upload";
import { applyReview, type ReviewState } from "@/lib/scan/review";
import { clearShared, useSharedFile } from "@/lib/scan/shared";
import { DOC_TYPE_LABEL, DOC_TYPES, type DocType } from "@/lib/records/types";
import type { SharedFile } from "@/lib/scan/shared";
import { stripImageMetadata } from "@/lib/upload/strip-exif";
import { brand, hue, ink, semantic, surface } from "@/theme/tokens";
import { useFamily } from "@/lib/profiles/family";
import { feel } from "@/lib/feel";
import { LinesSkeleton, ListSkeleton, ScreenSkeleton } from "@/components/ui/skeleton";
import { ensureMediaAccess } from "@/lib/upload/media-access";
import { recordBooking, threadKey } from "@/lib/memory/store";
import { addDailyLog } from "@/lib/home/logs";
import { MEALS } from "@/lib/home/catalog";
import { mealSlotNow, plateTagsFrom } from "@/lib/records/reader";

type Phase = "pick" | "working" | "confirm" | "error" | "notRecord";

/*
 * The five steps the frame shows. They are labels over one real request, and
 * the code does not pretend otherwise: `settleStep` is where the upload
 * actually is, and the display never runs ahead of it.
 *
 * A progress bar that animates to 100% while the request is still in flight is
 * a lie that costs the reader their trust at exactly the moment the app is
 * handling their medical records.
 */
// The two everyone has, as big cards; the rest behind "Something else". The
// app files its own booking invoices, but a clinic's paper receipt is still
// worth keeping.
const MAIN: readonly { type: DocType; title: string; line: string; Icon: LucideIcon }[] = [
  { type: "lab_report", title: "Report", line: "Blood tests, lab results", Icon: FlaskConical },
  { type: "prescription", title: "Prescription", line: "From a doctor's visit", Icon: Pill },
];
const OTHER = DOC_TYPES.filter((t) => t !== "other" && t !== "lab_report" && t !== "prescription");

const CARD = [glassCard("#ffffff", "#0f1030"), { shadowOpacity: 0.05 }] as const;

/** Short names for the kind chips. */
const SHORT: Partial<Record<DocType, string>> = {
  lab_report: "Lab report",
  prescription: "Prescription",
  consultation_invoice: "Consult invoice",
  booking_invoice: "Booking invoice",
  discharge: "Discharge",
  vaccination: "Vaccine",
  medication: "Medicine",
};

const STEPS: readonly { key: string; icon: LucideIcon; title: string; body: string }[] = [
  {
    key: "upload",
    icon: FileText,
    title: "Document received",
    body: "Sent over an encrypted connection",
  },
  { key: "read", icon: Search, title: "Reading your document", body: "Scanning text and structure" },
  {
    key: "extract",
    icon: Cpu,
    title: "Pulling out the key details",
    body: "Identifying important data",
  },
  {
    key: "validate",
    icon: ShieldCheck,
    title: "Double-checking everything",
    body: "Checking accuracy and consistency",
  },
  { key: "finalise", icon: Lock, title: "Almost there", body: "Preparing your record" },
];

/** One line of calm reassurance per step — never clinical, never rushed. */
const STEP_NARRATIVE = [
  "Nice and safe. Nothing leaves your device unprotected.",
  "Take a breath, Cheeku is doing the careful reading for you.",
  "This is the fiddly part. Cheeku has got it from here.",
  "A second look, just to be sure it's right.",
  "Almost time to see everything, laid out clearly.",
] as const;

export default function Scan() {
  const router = useRouter();
  /*
   * `source` opens one picker straight away, so a person who has already
   * chosen "Take a photo" on the screen before does not arrive at a screen
   * asking them to choose again. Absent on the normal route in from Home.
   */
  const { source } = useLocalSearchParams<{ source?: string; shared?: string }>();
  const shared = useSharedFile((st) => st.file);
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<Phase>("pick");
  const [profileId, setProfileId] = useState("");
  // Null lets the reader decide from the document itself.
  const [docType, setDocType] = useState<DocType | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [settleStep, setSettleStep] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [stripFailed, setStripFailed] = useState(false);
  const [moreTypes, setMoreTypes] = useState(false);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // The picked photo, for logging it as a meal when it turns out to be one.
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [mealBusy, setMealBusy] = useState(false);
  const qc = useQueryClient();

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const context = useQuery({
    queryKey: ["scan-context"],
    queryFn: async () => {
      const [allowed, active] = await Promise.all([selectableProfiles(), activeProfile()]);
      return { allowed, active };
    },
  });

  // Defaults to whoever is selected on Home rather than to the first profile:
  // filing a document against the wrong family member is a correction that
  // needs a support request, not a tap.
  //
  // Read from the shared family cache, NOT from `scan-context`. That query can
  // still hold the previous member for a moment after a switch (it refetches
  // on mount), and seeding from it filed a report under the person you had
  // just switched away from. The family cache moves in the same frame as the
  // switch (lib/profiles/family.ts).
  const family = useFamily();
  const viewing = family.data?.profile?.id ?? context.data?.active?.id;
  useEffect(() => {
    if (!profileId && viewing) setProfileId(viewing);
  }, [viewing, profileId]);

  /*
   * Fire the requested picker once, and only from the idle state. Keyed on
   * a ref rather than on `source` so a re-render — or coming back from the
   * picker having cancelled — cannot reopen it in a loop.
   */
  const autoOpened = useRef(false);
  useEffect(() => {
    if (autoOpened.current || !source || !profileId || phase !== "pick") return;
    autoOpened.current = true;
    /*
     * Wait for the screen to finish sliding in. iOS won't present the
     * permission sheet or the camera over a screen still in its transition,
     * and then nothing answers: the upload froze right after "Allow"
     * (owner, 21 Nov).
     */
    const t = setTimeout(() => {
      if (source === "photo") void takePhoto();
      else if (source === "library") void pickFromLibrary();
      else if (source === "file") void pickFile();
    }, 450);
    return () => clearTimeout(t);
    // takePhoto/pickFromLibrary/pickFile are stable for this screen's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, profileId, phase]);

  useEffect(() => {
    if (phase !== "working") return;
    timer.current = setInterval(() => {
      setStepIndex((i) => (i < settleStep ? i + 1 : i));
    }, 420);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [phase, settleStep]);

  async function handle(picked: PickedFile) {
    setPickedUri(picked.mimeType.startsWith("image/") ? picked.uri : null);
    setPhase("working");
    setStepIndex(0);
    setSettleStep(1);
    setMessage(null);
    setStripFailed(false);

    // Metadata comes off before anything leaves the device.
    const { uri, stripped } = await stripImageMetadata(picked.uri, picked.mimeType);
    if (picked.mimeType.startsWith("image/") && !stripped) setStripFailed(true);
    setSettleStep(2);

    const result = await prepareUpload(
      stripped ? { ...picked, uri, mimeType: "image/jpeg" } : picked,
      profileId,
      docType ?? undefined,
    );

    if (!result.ok) {
      setMessage(result.message);
      setPhase("error");
      feel.warn();
      return;
    }

    setSettleStep(STEPS.length);
    feel.tap();
    // Let the last steps land before the check screen, so it does not flicker.
    // A meal, or a picture that isn't health paperwork, isn't filed as a record by default.
    const kind = result.prepared.read?.kind;
    setTimeout(() => {
      setPrepared(result.prepared);
      setPhase(kind === "meal" || kind === "not_health" ? "notRecord" : "confirm");
    }, 700);
  }

  async function save(review: ReviewState, left: number) {
    if (!prepared) return;
    setSaving(true);
    setSaveError(null);
    const confirmed = applyReview(prepared.extraction, review);
    const result = await fileUpload(prepared, confirmed, left ? "needs_review" : "filed");
    setSaving(false);
    if (!result.ok) {
      feel.warn();
      setSaveError(result.message);
      return;
    }
    feel.success();
    clearShared();
    // Cheeku says it in the chat too, with the next questions ready to tap.
    void tellChat(prepared, confirmed, result.documentId);
    router.replace(`/records/${result.documentId}`);
  }

  async function tellChat(p: Prepared, e: typeof p.extraction, documentId: string) {
    const who = (context.data?.allowed ?? []).find((m) => m.id === p.profileId);
    const first = who?.name.split(" ")[0] ?? "them";
    const flagged = e.values.filter((v) => v.flag === "high" || v.flag === "low");
    const meds = Array.isArray((e.details as { medicines?: unknown[] }).medicines) ? ((e.details as { medicines: { name: string }[] }).medicines) : [];
    const date = e.eventDate ? new Date(`${e.eventDate}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "No date on it";
    const lines: string[] = [`Filed ${e.title} in ${who?.isPrimary === false ? `${first}'s` : "your"} health file.`];
    if (e.values.length) {
      lines.push(
        flagged.length
          ? `I read ${e.values.length} values. ${flagged.length} ${flagged.length === 1 ? "is" : "are"} outside the range the lab printed: ${flagged.slice(0, 3).map((v) => v.label).join(", ")}${flagged.length > 3 ? " and more" : ""}.`
          : `I read ${e.values.length} values, all within the range the lab printed.`,
      );
    }
    if (meds.length) lines.push(`${meds.length} ${meds.length === 1 ? "medicine" : "medicines"} on it: ${meds.slice(0, 3).map((m) => m.name).join(", ")}${meds.length > 3 ? " and more" : ""}.`);
    const followUps =
      e.docType === "lab_report"
        ? ["Explain this report simply", flagged.length ? `What should I do about ${flagged[0]!.label}?` : "What changed since last time?"]
        : e.docType === "prescription"
          ? ["How do I take these medicines?", "Do any of these clash with what I take?"]
          : ["What does this mean for me?"];
    await recordBooking(
      p.profileId,
      { kind: "record", title: e.title, when: date, where: e.facility ?? DOC_TYPE_LABEL[e.docType], route: `/records/${documentId}` },
      lines.join(" "),
      followUps,
    );
    void qc.invalidateQueries({ queryKey: threadKey(p.profileId) });
  }

  /** A meal photo: log it on Today's plan for the meal of the day, and tell the chat. */
  async function logAsMeal() {
    if (!prepared) return;
    const read = prepared.read;
    setMealBusy(true);
    const slot = mealSlotNow();
    const task = MEALS.find((m) => m.key === `meal:${slot}`) ?? MEALS[0]!;
    const tags = plateTagsFrom(read?.foods ?? []);
    const r = await addDailyLog(qc, { profileId: prepared.profileId, task, tags, photoUri: pickedUri, complete: true });
    setMealBusy(false);
    if (!r.ok) {
      setSaveError(r.message);
      return;
    }
    await discardUpload(prepared);
    feel.success();
    void recordBooking(
      prepared.profileId,
      { kind: "meal", title: read?.title ?? task.title, when: "Today", where: task.title, route: "/today" },
      `Logged ${task.title.toLowerCase()} on today's plan${read?.foods.length ? `: ${read.foods.slice(0, 5).join(", ")}` : ""}.`,
      ["How was this meal for my sugar?", "What could I add for more protein?"],
    ).then(() => qc.invalidateQueries({ queryKey: threadKey(prepared.profileId) }));
    clearShared();
    router.replace("/today");
  }

  /** Not a record: ask Cheeku about it instead, with what the reader saw. */
  async function askInstead() {
    const read = prepared?.read;
    if (prepared) await discardUpload(prepared);
    clearShared();
    const q = read?.kind === "meal" ? `I just ate this: ${read.foods.join(", ") || read.title}. Is it a good choice for me?` : `I uploaded a photo: ${read?.summary || "it isn't a health record"}. Can you help with it?`;
    router.replace({ pathname: "/ask", params: { q, t: String(Date.now()) } });
  }

  async function discard() {
    if (prepared) await discardUpload(prepared);
    setPrepared(null);
    setPhase("pick");
    setStepIndex(0);
    setSettleStep(0);
  }

  /*
   * PDFs, and everything else the OS calls a file.
   *
   * The two pickers above are photographs, which is the common case for a
   * single report. A year of history is not a photograph — people export it
   * from a portal or scan it to one combined PDF, and there was no way to hand
   * that to Cheeku at all. `expo-document-picker` is a third permissionless
   * surface: the OS shows its own file browser and returns only what was
   * chosen, so nothing here has to ask for access to anything.
   *
   * No EXIF strip on this path. That step rewrites image bytes; a PDF has no
   * EXIF, and running it would corrupt the file. `stripImageMetadata` already
   * no-ops on a non-image, and `handle` only flags a failed strip for images.
   */
  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png", "image/heic"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset) return;
    void handle({
      uri: asset.uri,
      mimeType: asset.mimeType ?? "application/pdf",
      name: asset.name ?? "document.pdf",
    });
  }

  async function pickFromLibrary() {
    // Cheeku's own sheet first; it offers Settings itself when access was refused before.
    if (!(await ensureMediaAccess("photos"))) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      // The picker's own EXIF payload is not requested. The bytes are what get
      // stripped; asking for the tags here would only put them in memory.
      exif: false,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset) return;
    void handle({
      uri: asset.uri,
      mimeType: asset.mimeType ?? "image/jpeg",
      name: asset.fileName ?? "upload.jpg",
    });
  }

  async function takePhoto() {
    if (!(await ensureMediaAccess("camera"))) return;

    const result = await ImagePicker.launchCameraAsync({ quality: 1, exif: false });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset) return;
    void handle({
      uri: asset.uri,
      mimeType: asset.mimeType ?? "image/jpeg",
      name: asset.fileName ?? "photo.jpg",
    });
  }

  if (context.isPending) {
    return (
      <ScreenSkeleton>
        <ListSkeleton rows={3} />
        <LinesSkeleton lines={3} style={{ marginTop: 18 }} />
      </ScreenSkeleton>
    );
  }

  if (phase === "notRecord" && prepared) {
    const read = prepared.read;
    const meal = read?.kind === "meal";
    return (
      <View className="flex-1 bg-canvas px-5" style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
        <SkyWash top={-40} />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <View style={{ alignSelf: "center", width: 120, height: 120, borderRadius: 38, backgroundColor: meal ? "#ffebe5" : surface.tint, alignItems: "center", justifyContent: "center" }}>
            <Icon3D name={meal ? "food" : "chat"} size={88} />
          </View>
          <Text style={{ fontFamily: font.semibold, fontSize: 28, lineHeight: 33, letterSpacing: -0.8, color: ink[900], textAlign: "center", marginTop: 18 }}>
            {meal ? "Looks like a meal" : "This isn't a health record"}
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 16, lineHeight: 22, color: ink[500], textAlign: "center", marginTop: 8, paddingHorizontal: 12 }}>
            {meal
              ? read?.foods.length ? `I can see ${read.foods.slice(0, 5).join(", ")}. Log it on today's plan?` : "Log it on today's plan instead of the health file?"
              : read?.summary || "Records are reports, prescriptions, bills and scans. You can still ask me about it."}
          </Text>
          {saveError ? <Text style={{ fontFamily: font.medium, fontSize: 14, color: semantic.dangerText, textAlign: "center", marginTop: 12 }}>{saveError}</Text> : null}
        </View>
        <View style={{ gap: 10 }}>
          {meal ? (
            <PillButton tone="brand" loading={mealBusy} onPress={() => void logAsMeal()}>
              {`Log as ${MEALS.find((m) => m.key === `meal:${mealSlotNow()}`)?.title.toLowerCase() ?? "a meal"}`}
            </PillButton>
          ) : null}
          <PillButton tone={meal ? "light" : "brand"} onPress={() => void askInstead()}>
            Ask Cheeku about it
          </PillButton>
          <Tap accessibilityRole="button" onPress={() => setPhase("confirm")} hitSlop={8} style={{ alignSelf: "center", paddingVertical: 8 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 14, color: ink[500] }}>File it as a record anyway</Text>
          </Tap>
        </View>
      </View>
    );
  }

  if (phase === "confirm" && prepared) {
    const member = (context.data?.allowed ?? []).find((p) => p.id === prepared.profileId) ?? null;
    return <ScanConfirm extraction={prepared.extraction} member={member} busy={saving} error={saveError} onSave={(r, left) => void save(r, left)} onDiscard={() => void discard()} />;
  }

  if (phase === "working") {
    return (
      <View className="flex-1 bg-canvas px-5" style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
        <SkyWash top={-40} />
        <View className="items-center">
          <MascotFigure size={132} moment="working" move="float" hop />
        </View>
        <Text style={{ fontFamily: font.semibold, fontSize: 28, letterSpacing: -0.8, color: ink[900], textAlign: "center", marginTop: 6 }}>Reading it now</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[500], textAlign: "center", marginTop: 6, paddingHorizontal: 12 }}>
          {STEP_NARRATIVE[Math.min(stepIndex, STEP_NARRATIVE.length - 1)]}
        </Text>

        {/* One calm card: a bar for how far, and the steps as quiet rows. */}
        <View style={[...CARD, { marginTop: 24, padding: 18 }]}>
          <View style={{ height: 8, borderRadius: 999, backgroundColor: surface.tint, overflow: "hidden" }}>
            <View style={{ height: 8, borderRadius: 999, width: `${Math.max(6, (Math.min(stepIndex, STEPS.length) / STEPS.length) * 100)}%`, backgroundColor: brand[500] }} />
          </View>
          <View style={{ marginTop: 10 }}>
            {STEPS.map((step, i) => {
              const done = i < stepIndex;
              const current = i === stepIndex;
              return (
                <View key={step.key} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, opacity: done || current ? 1 : 0.4 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: done ? brand[600] : surface.tint }}>
                    {done ? <Check size={14} color="#fff" strokeWidth={3} /> : current ? <ActivityIndicator size="small" color={brand[600]} /> : null}
                  </View>
                  <Text style={{ flex: 1, fontFamily: current ? font.semibold : font.medium, fontSize: 15, color: ink[900] }}>{step.title}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {stripFailed ? (
          // Said out loud rather than swallowed: the screen before promised the strip.
          <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[700], marginTop: 16 }}>
            This photo could not be re-encoded, so its location data was left in place. The file is still private to your family.
          </Text>
        ) : null}
      </View>
    );
  }

  const profiles = context.data?.allowed ?? [];

  /*
   * REDESIGNED 17 Nov 2026 in Home's language. Whose (faces), what (optional
   * chips with 3D objects, "let Cheeku tell" by default), then three big
   * source tiles. Camera and library stay separate: they are two permissions
   * natively, and both now go through Cheeku's own sheet first
   * (lib/upload/media-access).
   */
  const sources = [
    { key: "camera", title: "Camera", line: "Snap it now", Icon: CameraIcon, onPress: takePhoto },
    { key: "library", title: "Photos", line: "From your gallery", Icon: Images, onPress: pickFromLibrary },
    { key: "file", title: "PDF or file", line: "Lab portals, emails", Icon: FileUp, onPress: pickFile },
  ] as const;
  const kinds: (DocType | null)[] = [null, ...MAIN.map((m) => m.type), ...OTHER];

  return (
    <View className="flex-1 bg-canvas">
      <SkyWash top={-40} />
      <ScreenHeader title="Add a record" />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20 }}>
          <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 30, lineHeight: 36, letterSpacing: -0.9, color: ink[900] }}>
            Snap it. Cheeku files it.
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[500], marginTop: 6 }}>
            Reports, prescriptions, bills. You check what I read before it&apos;s saved.
          </Text>
          {shared ? <SharedCard file={shared} onDrop={() => clearShared()} /> : null}
        </View>

        {/* Whose is it: the family as faces, like Home. */}
        <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginTop: 24, marginHorizontal: 20 }}>Whose is it?</Text>
        <View style={{ marginTop: 10 }}>
          <FamilyRow members={profiles as never} activeId={profileId} locked={false} onSelect={(id) => setProfileId(id)} onAdd={() => undefined} hideAdd />
        </View>

        {/* What is it: optional. Unpicked, Cheeku decides from the page. */}
        <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginTop: 20, marginHorizontal: 20 }}>What is it?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 }}>
          {kinds.map((t) => {
            const on = t === docType;
            return (
              <Tap
                key={t ?? "auto"}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  feel.tick();
                  setDocType(t);
                }}
                scale={0.96}
                style={[...CARD, { flexDirection: "row", alignItems: "center", gap: 8, height: 46, paddingLeft: 8, paddingRight: 16, borderRadius: 999, borderWidth: 1.5, borderColor: on ? brand[500] : "rgba(255,255,255,0.9)" }]}
              >
                <Icon3D name={t ? TYPE_3D[t] : "star"} size={26} />
                <Text style={{ fontFamily: font.semibold, fontSize: 14, color: on ? brand[700] : ink[900] }}>{t ? (SHORT[t] ?? DOC_TYPE_LABEL[t]) : "Let Cheeku tell"}</Text>
              </Tap>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: 20 }}>
          {shared ? (
            <PillButton style={{ marginTop: 24 }} disabled={!profileId || !shared.accepted} icon={<ScanSearch size={18} color="#fff" />} onPress={() => void handle({ uri: shared.uri, mimeType: shared.mimeType, name: shared.name })}>
              Read it
            </PillButton>
          ) : (
            <>
              {/* Where it comes from: three big tiles. Camera leads, filled violet. */}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 24 }}>
                {sources.map((src, i) => {
                  const lead = i === 0;
                  return (
                    <Tap
                      key={src.key}
                      accessibilityRole="button"
                      accessibilityLabel={`${src.title}. ${src.line}`}
                      accessibilityState={{ disabled: !profileId }}
                      disabled={!profileId}
                      onPress={() => void src.onPress()}
                      scale={0.96}
                      style={[...CARD, { flex: 1, padding: 14, borderRadius: 24, opacity: profileId ? 1 : 0.5 }, lead ? { backgroundColor: brand[600], borderColor: brand[600], shadowColor: brand[600], shadowOpacity: 0.25 } : null]}
                    >
                      <View style={{ width: 48, height: 48, borderRadius: 999, backgroundColor: lead ? "rgba(255,255,255,0.18)" : surface.tint, alignItems: "center", justifyContent: "center" }}>
                        <src.Icon size={22} color={lead ? "#fff" : brand[600]} strokeWidth={2} />
                      </View>
                      <Text style={{ fontFamily: font.semibold, fontSize: 16, color: lead ? "#fff" : ink[900], marginTop: 14 }}>{src.title}</Text>
                      <Text numberOfLines={2} style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: lead ? "rgba(255,255,255,0.8)" : ink[500], marginTop: 2 }}>{src.line}</Text>
                    </Tap>
                  );
                })}
              </View>
              <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[300], textAlign: "center", marginTop: 10 }}>PDF, JPG, PNG or HEIC, up to 10MB</Text>
            </>
          )}

          {message ? (
            <Text accessibilityRole="alert" style={{ fontFamily: font.medium, fontSize: 13, color: semantic.dangerText, marginTop: 12 }}>
              {message}
            </Text>
          ) : null}

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 24, padding: 14, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.7)" }}>
            <Icon3D name="shield" size={28} />
            <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700] }}>
              Location data comes off photos on your phone, before upload. Files stay private to your family.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/** The file shared from WhatsApp, Files or Photos, waiting for "whose is it". */
function SharedCard({ file, onDrop }: { file: SharedFile; onDrop: () => void }) {
  const pdf = file.mimeType === "application/pdf";
  const kb = file.size ? Math.max(1, Math.round(file.size / 1024)) : null;
  return (
    <View style={[glassShadow, { marginTop: 18, borderRadius: 24, padding: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: glass.rim, gap: 8 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Share2 size={13} color={ink[900]} />
        <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[500] }}>Shared with Cheeku</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: pdf ? hue.orange.bg : hue.blue.bg, alignItems: "center", justifyContent: "center" }}>
          {pdf ? <FileText size={22} color={hue.orange.fg} /> : <Images size={22} color={hue.blue.fg} />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{file.name}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>{pdf ? "PDF" : "Photo"}{kb ? ` · ${kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`}` : ""}</Text>
        </View>
        <Tap accessibilityRole="button" accessibilityLabel="Not this file" onPress={onDrop} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <X size={18} color={ink[500]} />
        </Tap>
      </View>
      {!file.accepted ? (
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: hue.rose.fg }}>Cheeku can read a PDF or a photo (JPG, PNG, HEIC). Share one of those instead.</Text>
      ) : null}
    </View>
  );
}
