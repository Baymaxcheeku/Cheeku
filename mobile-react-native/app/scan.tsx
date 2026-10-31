import { useQuery } from "@tanstack/react-query";
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
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
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
import { brand, hue, ink, lilac, semantic } from "@/theme/tokens";
import { useFamily } from "@/lib/profiles/family";
import { feel } from "@/lib/feel";
import { LinesSkeleton, ListSkeleton, ScreenSkeleton } from "@/components/ui/skeleton";

type Phase = "pick" | "working" | "confirm" | "error";

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
    if (source === "photo") void takePhoto();
    else if (source === "library") void pickFromLibrary();
    else if (source === "file") void pickFile();
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
    setTimeout(() => {
      setPrepared(result.prepared);
      setPhase("confirm");
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
    router.replace(`/records/${result.documentId}`);
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
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Photo access is off",
        "Cheeku needs access to your photos to add a document from your library. You can turn it on in Settings.",
      );
      return;
    }

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
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Camera access is off",
        "Cheeku needs the camera to photograph a document. You can turn it on in Settings.",
      );
      return;
    }

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

  if (phase === "confirm" && prepared) {
    const member = (context.data?.allowed ?? []).find((p) => p.id === prepared.profileId) ?? null;
    return <ScanConfirm extraction={prepared.extraction} member={member} busy={saving} error={saveError} onSave={(r, left) => void save(r, left)} onDiscard={() => void discard()} />;
  }

  if (phase === "working") {
    return (
      <View
        className="flex-1 bg-canvas px-5"
        style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
      >
        <Backdrop />
        <View className="items-center">
          <MascotFigure size={132} moment="working" move="float" hop />
        </View>
        <Text style={{ fontFamily: font.semibold, fontSize: 24, letterSpacing: -0.7, color: ink[900], textAlign: "center", marginTop: 6 }}>
          Reading it now
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: ink[500], textAlign: "center", marginTop: 4 }}>
          {STEP_NARRATIVE[Math.min(stepIndex, STEP_NARRATIVE.length - 1)]}
        </Text>

        <View className="mt-6 gap-3">
          {STEPS.map((step, i) => {
            const done = i < stepIndex;
            const current = i === stepIndex;
            const Icon = step.icon;
            return (
              <View
                key={step.key}
                className="flex-row items-center gap-3 rounded-xl p-3.5"
                style={[glassShadow, { backgroundColor: glass.fillStrong, borderWidth: 1, borderColor: glass.rim, opacity: done || current ? 1 : 0.45 }]}
              >
                <View
                  className="h-10 w-10 items-center justify-center rounded-pill"
                  // Brand, not green: a finished upload step is not a health result.
                  style={{ backgroundColor: done ? brand[600] : brand[50] }}
                >
                  {done ? (
                    <Check size={18} color="#ffffff" strokeWidth={3} />
                  ) : current ? (
                    <ActivityIndicator size="small" color={brand[600]} />
                  ) : (
                    <Icon size={18} color={brand[600]} />
                  )}
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-semibold text-ink-900">{step.title}</Text>
                  <Text className="text-xs text-ink-500">{step.body}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {stripFailed ? (
          /*
           * Said out loud rather than swallowed. The strip is a promise this
           * screen makes two paragraphs earlier, and quietly uploading a photo
           * with its GPS intact after promising otherwise is worse than the
           * metadata itself.
           */
          <Text className="mt-5 text-xs leading-[17px] text-caution-text">
            This photo could not be re-encoded, so its location data was left in place. The file is
            still private to your family.
          </Text>
        ) : null}
      </View>
    );
  }

  const profiles = context.data?.allowed ?? [];

  /*
   * REDESIGNED 2026-09-29. Three sources as three pastel cards, the same shape
   * as the Book care list on Home: one tap each, no dashed drop zone (nothing
   * is ever dragged on a phone). Camera and library stay separate because they
   * are two permissions natively, and asking for the camera from someone who
   * only wanted a photo they already have is the request most often denied.
   */
  const sources = [
    { key: "camera", title: "Take a photo", line: "Snap a report or prescription, page by page", Icon: CameraIcon, from: lilac.base, fg: brand[600], onPress: takePhoto },
    { key: "library", title: "Choose from photos", line: "Screenshots and pictures you already have", Icon: Images, from: hue.blue.bg, fg: hue.blue.fg, onPress: pickFromLibrary },
    { key: "file", title: "Upload a PDF or file", line: "A full lab report, a discharge summary", Icon: FileUp, from: hue.orange.bg, fg: hue.orange.fg, onPress: pickFile },
  ] as const;

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader title="Add a record" />
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <Text accessibilityRole="header" style={{ flex: 1, fontFamily: font.medium, fontSize: 28, lineHeight: 36, letterSpacing: -1, color: ink[900] }}>
          What are we{"\n"}
          <Text style={{ fontFamily: font.italic, color: brand[600] }}>filing today?</Text>
        </Text>
        {/* Open arms: "hand it over". Worried at his desk if the last try failed. */}
        <MascotFigure size={92} moment={phase === "error" ? "worried" : "present"} move={phase === "error" ? undefined : "sway"} hop />
      </View>
      <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: ink[500], marginTop: 8 }}>
        I&apos;ll read it and pull out the key details. You check everything before it&apos;s saved.
      </Text>

      {/*
       * What kind of record: the two everyone has, as big cards, and the rest
       * behind "Something else". Optional: unpicked, the reader decides from
       * the page, and it can be changed on the record later.
       */}
      {shared ? <SharedCard file={shared} onDrop={() => clearShared()} /> : null}

      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[700], marginTop: 22 }}>What is it?</Text>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        {MAIN.map((m) => {
          const on = docType === m.type;
          const st = TYPE_STYLE[m.type];
          return (
            <Tap
              key={m.type}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${m.title}. ${m.line}`}
              onPress={() => {
                feel.tick();
                setDocType(on ? null : m.type);
              }}
              style={[glassShadow, { flex: 1, borderRadius: 24, padding: 14, gap: 10, backgroundColor: on ? st.wash : "#fff", borderWidth: 2, borderColor: on ? st.tint : glass.rim }]}
              scale={0.97}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: on ? "#fff" : st.wash, alignItems: "center", justifyContent: "center" }}>
                  <m.Icon size={24} color={st.tint} />
                </View>
                <View style={{ width: 24, height: 24, borderRadius: 999, borderWidth: 2, borderColor: on ? st.tint : ink[300], backgroundColor: on ? st.tint : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {on ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
                </View>
              </View>
              <View>
                <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{m.title}</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 2 }}>{m.line}</Text>
              </View>
            </Tap>
          );
        })}
      </View>
      <Tap
        accessibilityRole="button"
        accessibilityState={{ expanded: moreTypes }}
        onPress={() => setMoreTypes((v) => !v)}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", height: 40, marginTop: 6 }}
      >
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[600] }}>
          {docType && !MAIN.some((m) => m.type === docType) ? `Something else: ${DOC_TYPE_LABEL[docType]}` : "Something else"}
        </Text>
        <ChevronDown size={15} color={brand[600]} style={{ transform: [{ rotate: moreTypes ? "180deg" : "0deg" }] }} />
      </Tap>
      {moreTypes ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          {([null, ...OTHER] as (DocType | null)[]).map((t) => {
            const on = t === docType;
            const st = t ? TYPE_STYLE[t] : null;
            const Icon = st?.icon ?? ScanSearch;
            return (
              <Tap
                key={t ?? "auto"}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  feel.tick();
                  setDocType(t);
                }}
                style={[
                  on ? null : glassShadow,
                  { flexDirection: "row", alignItems: "center", gap: 7, height: 40, paddingLeft: 12, paddingRight: 14, borderRadius: 999, backgroundColor: on ? ink[900] : glass.fillStrong, borderWidth: on ? 0 : 1, borderColor: glass.rim },
                ]}
              >
                <Icon size={15} color={on ? "#fff" : (st?.tint ?? brand[600])} />
                <Text style={{ fontFamily: font.semibold, fontSize: 13, color: on ? "#fff" : ink[900] }}>{t ? DOC_TYPE_LABEL[t] : "Not sure, let Cheeku tell"}</Text>
              </Tap>
            );
          })}
        </ScrollView>
      ) : null}

      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[700], marginTop: 16 }}>Whose is it?</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10, paddingBottom: 4 }}>
        {profiles.map((p) => {
          const active = p.id === profileId;
          return (
            <Tap
              key={p.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              aria-checked={active}
              onPress={() => setProfileId(p.id)}
              style={[
                active ? null : glassShadow,
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  height: 48,
                  paddingLeft: 5,
                  paddingRight: 16,
                  borderRadius: 999,
                  backgroundColor: active ? ink[900] : glass.fillStrong,
                  borderWidth: active ? 0 : 1,
                  borderColor: glass.rim,
                },
              ]}
            >
              <Avatar svg={p.avatar} photo={p.photo} image={p.avatarImage} background={p.avatarBackground ?? undefined} size={38} />
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: active ? "#ffffff" : ink[900] }}>{p.name.split(" ")[0]}</Text>
            </Tap>
          );
        })}
      </ScrollView>

      {shared ? (
        <PillButton
          style={{ marginTop: 20 }}
          disabled={!profileId || !shared.accepted}
          icon={<ScanSearch size={18} color="#fff" />}
          onPress={() => void handle({ uri: shared.uri, mimeType: shared.mimeType, name: shared.name })}
        >
          Read it
        </PillButton>
      ) : (
      <View className="mt-5 gap-2.5">
        {sources.map((src) => (
          <Tap
            key={src.key}
            accessibilityRole="button"
            accessibilityLabel={`${src.title}. ${src.line}`}
            accessibilityState={{ disabled: !profileId }}
            disabled={!profileId}
            onPress={() => void src.onPress()}
            style={{ opacity: profileId ? 1 : 0.5 }} scale={0.98}
          >
            <View className="flex-row items-center gap-3.5 overflow-hidden rounded-xl p-2.5 pr-3" style={glassShadow}>
              <Gradient from={src.from} to="#ffffff" />
              <View
                className="h-[68px] w-[68px] items-center justify-center rounded-xl"
                style={{ backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: glass.rim }}
              >
                <src.Icon size={26} color={src.fg} strokeWidth={1.7} />
              </View>
              <View className="min-w-0 flex-1">
                <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{src.title}</Text>
                <Text numberOfLines={2} style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 2 }}>
                  {src.line}
                </Text>
              </View>
              <View className="h-10 w-10 items-center justify-center rounded-pill" style={{ backgroundColor: "rgba(255,255,255,0.75)", borderWidth: 1, borderColor: glass.rim }}>
                <ChevronRight size={18} color={ink[700]} />
              </View>
            </View>
          </Tap>
        ))}
      </View>
      )}
      <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[300], textAlign: "center", marginTop: 10 }}>
        PDF, JPG, PNG or HEIC, up to 10MB
      </Text>

      {message ? (
        <Text accessibilityRole="alert" style={{ fontFamily: font.medium, fontSize: 13, color: semantic.dangerText, marginTop: 12 }}>
          {message}
        </Text>
      ) : null}

      <Glass className="mt-5 flex-row items-start gap-2.5 rounded-xl px-4 py-3">
        <ShieldCheck size={15} color={brand[500]} style={{ marginTop: 1 }} />
        <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700] }}>
          Photos lose their location data on your phone before upload. Files stay private to you and
          your family.
        </Text>
      </Glass>
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
        <Share2 size={13} color={brand[600]} />
        <Text style={{ fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.9, textTransform: "uppercase", color: brand[600] }}>Shared with Cheeku</Text>
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
