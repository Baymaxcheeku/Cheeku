import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  Check,
  ChevronLeft,
  Cpu,
  FileText,
  Images,
  Lock,
  Camera as CameraIcon,
  Search,
  ShieldCheck,
  Upload,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { activeProfile, selectableProfiles } from "@/lib/profiles/context";
import { uploadDocument, type PickedFile } from "@/lib/records/upload";
import { stripImageMetadata } from "@/lib/upload/strip-exif";
import { brand, ink, semantic, shadow, surface } from "@/theme/tokens";

type Phase = "pick" | "working" | "error";

/*
 * The five steps the frame shows. They are labels over one real request, and
 * the code does not pretend otherwise: `settleStep` is where the upload
 * actually is, and the display never runs ahead of it.
 *
 * A progress bar that animates to 100% while the request is still in flight is
 * a lie that costs the reader their trust at exactly the moment the app is
 * handling their medical records.
 */
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
  "Take a breath, Baymax is doing the careful reading for you.",
  "This is the fiddly part. Baymax has got it from here.",
  "A second look, just to be sure it's right.",
  "Almost time to see everything, laid out clearly.",
] as const;

export default function Scan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<Phase>("pick");
  const [profileId, setProfileId] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [settleStep, setSettleStep] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [stripFailed, setStripFailed] = useState(false);

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
  useEffect(() => {
    if (!profileId && context.data?.active) setProfileId(context.data.active.id);
  }, [context.data, profileId]);

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

    const result = await uploadDocument(
      stripped ? { ...picked, uri, mimeType: "image/jpeg" } : picked,
      profileId,
    );

    if (!result.ok) {
      setMessage(result.message);
      setPhase("error");
      return;
    }

    setSettleStep(STEPS.length);
    // Let the last steps land before the screen changes, so the transition does
    // not read as a flicker.
    setTimeout(() => router.replace(`/records/${result.documentId}`), 900);
  }

  async function pickFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Photo access is off",
        "Baymax needs access to your photos to add a document from your library. You can turn it on in Settings.",
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
        "Baymax needs the camera to photograph a document. You can turn it on in Settings.",
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
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={brand[600]} />
      </View>
    );
  }

  if (phase === "working") {
    return (
      <View
        className="flex-1 bg-canvas px-5"
        style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
      >
        <Text className="text-[20px] font-bold text-ink-900">Working on it</Text>
        <Text className="mt-1 text-[13px] leading-[19px] text-ink-500">
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
                className="flex-row items-center gap-3 rounded-card bg-surface p-3.5"
                style={[shadow.e1, { opacity: done || current ? 1 : 0.45 }]}
              >
                <View
                  className="h-10 w-10 items-center justify-center rounded-pill"
                  style={{ backgroundColor: done ? semantic.safeBg : brand[50] }}
                >
                  {done ? (
                    <Check size={18} color={semantic.safe} />
                  ) : current ? (
                    <ActivityIndicator size="small" color={brand[600]} />
                  ) : (
                    <Icon size={18} color={brand[600]} />
                  )}
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[14px] font-semibold text-ink-900">{step.title}</Text>
                  <Text className="text-[12px] text-ink-500">{step.body}</Text>
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
          <Text className="mt-5 text-[12px] leading-[17px] text-caution-text">
            This photo could not be re-encoded, so its location data was left in place. The file is
            still private to your family.
          </Text>
        ) : null}
      </View>
    );
  }

  const profiles = context.data?.allowed ?? [];

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-tile bg-surface"
          style={shadow.e1}
        >
          <ChevronLeft size={20} color={brand[600]} />
        </Pressable>
        <Text className="text-[20px] font-bold text-ink-900">Add a document</Text>
      </View>

      <Text className="mt-2 text-[13px] leading-[19px] text-ink-500">
        Baymax will read it and pull out the key information. You review everything before it is
        saved.
      </Text>

      <Text className="mt-5 text-[13px] font-medium text-ink-700">Who is this for?</Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {profiles.map((p) => {
          const active = p.id === profileId;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              aria-checked={active}
              onPress={() => setProfileId(p.id)}
              className="flex-row items-center gap-2 rounded-pill py-1.5 pl-1.5 pr-3.5"
              style={{
                borderWidth: 1,
                borderColor: active ? brand[500] : surface.line,
                backgroundColor: active ? brand[50] : surface.base,
              }}
            >
              <View
                className="h-7 w-7 items-center justify-center rounded-pill"
                style={{ backgroundColor: active ? brand[600] : ink[300] }}
              >
                <Text className="text-[12px] font-bold text-white">
                  {p.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text
                className="text-[13px] font-semibold"
                style={{ color: active ? brand[700] : ink[700] }}
              >
                {p.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View
        className="mt-5 items-center rounded-card px-5 py-8"
        style={{
          borderWidth: 2,
          borderStyle: "dashed",
          borderColor: brand[200],
          backgroundColor: brand[50],
        }}
      >
        <View
          className="h-14 w-14 items-center justify-center rounded-pill bg-surface"
          style={shadow.e2}
        >
          <Upload size={22} color={brand[600]} />
        </View>
        <Text className="mt-3 text-[16px] font-semibold text-ink-900">Choose a document</Text>
        <Text className="mt-1 max-w-[280px] text-center text-[12px] leading-[17px] text-ink-500">
          Lab reports, prescriptions, discharge summaries and more.
        </Text>

        {/*
         * Two explicit buttons rather than the web build's single file input.
         *
         * A browser's <input type="file"> lets the OS offer camera and library
         * behind one control. Natively they are two different permissions and
         * two different pickers, and merging them into one button means asking
         * for camera access from someone who only wanted a photo they already
         * have — which is the request most likely to be denied outright.
         */}
        <View className="mt-4 w-full gap-2">
          <Button onPress={takePhoto} disabled={!profileId}>
            <CameraIcon size={16} color="#ffffff" />
            <Text className="text-[16px] font-bold text-white">Take a photo</Text>
          </Button>
          <Button variant="secondary" onPress={pickFromLibrary} disabled={!profileId}>
            <Images size={16} color={ink[700]} />
            <Text className="text-[16px] font-bold text-ink-700">Choose from library</Text>
          </Button>
        </View>
        <Text className="mt-1.5 text-[11px] text-ink-300">JPG, PNG or HEIC up to 10MB</Text>
      </View>

      {message ? (
        <Text accessibilityRole="alert" className="mt-3 text-[13px] font-medium text-danger-text">
          {message}
        </Text>
      ) : null}

      <View className="mt-4 flex-row items-start gap-2 rounded-tile bg-brand-50 px-3.5 py-2.5">
        <ShieldCheck size={13} color={brand[400]} style={{ marginTop: 2 }} />
        <Text className="flex-1 text-[11px] leading-[16px] text-ink-500">
          Photos are stripped of location data on your device before they are uploaded. Files are
          stored privately and only you and your family can open them.
        </Text>
      </View>
    </ScrollView>
  );
}
