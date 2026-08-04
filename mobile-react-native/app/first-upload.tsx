import { useRouter } from "expo-router";
import { Camera, FolderUp, Mail, ShieldCheck, Sparkles, Upload } from "lucide-react-native";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { UploadScene } from "@/components/illustrations/scenes";
import { Headline, OnboardingHeader } from "@/components/onboarding/chrome";
import { Button } from "@/components/ui/button";
import { brand, ink, shadow, surface } from "@/theme/tokens";

const ALTERNATES = [
  { icon: Camera, title: "Take a photo" },
  { icon: Mail, title: "Email to Baymax" },
  { icon: FolderUp, title: "Import from device" },
] as const;

/**
 * A6 — the first-upload hook. Skipping is a first-class outcome, not a
 * consolation: a nag screen at the end of onboarding costs more accounts than
 * one extra document is worth.
 */
export default function FirstUpload() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-canvas">
      <OnboardingHeader back="/profile" action={{ label: "Skip", href: "/plan" }} />

      <View className="flex-1 px-5" style={{ paddingBottom: insets.bottom + 12 }}>
        {/* The art is absolutely positioned, so the text needs its own gutter
            or the second headline line runs underneath it. */}
        <View className="relative pr-[35%]">
          <Headline lead="Let's add your" accent="first health record" />
          <Text className="mt-2 text-[13px] leading-[19px] text-ink-500">
            Upload a document and Baymax will organize it and extract key information for you.
          </Text>
          <View className="mt-2.5 flex-row items-center gap-1.5 self-start rounded-pill bg-brand-50 px-3 py-1.5">
            <ShieldCheck size={12} color={brand[700]} />
            <Text className="text-[11px] font-medium text-brand-700">Secure · Private · Encrypted</Text>
          </View>
          <View className="absolute -right-2 top-0" pointerEvents="none">
            <UploadScene size={128} />
          </View>
        </View>

        <View
          className="mt-4 items-center rounded-card px-5 py-4"
          style={{
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: brand[200],
            backgroundColor: brand[50],
          }}
        >
          <View
            className="h-10 w-10 items-center justify-center rounded-pill bg-surface"
            style={shadow.e1}
          >
            <Upload size={18} color={brand[600]} />
          </View>
          <Text className="mt-2 text-[15px] font-semibold text-ink-900">
            Upload your first document
          </Text>
          <Text className="mt-1 max-w-[280px] text-center text-[12px] leading-[16px] text-ink-500">
            Lab reports, prescriptions, discharge summaries and more.
          </Text>

          {/*
           * The frame shows a live upload here. The pipeline lands in Phase 4,
           * and a button that opens a file picker leading nowhere would be a
           * worse first impression than one that says it is not ready.
           */}
          <View className="mt-3 w-full">
            <Button disabled>
              <Upload size={16} color="#ffffff" />
              <Text className="text-[16px] font-bold text-white">Upload document</Text>
            </Button>
          </View>
          <Text className="mt-1.5 text-[11px] text-ink-300">PDF, JPG, PNG up to 10MB</Text>
        </View>

        <Text className="mt-4 text-[13px] font-semibold text-ink-700">Or try these</Text>
        {/* Title only. The frame gives each tile a description line, but these
            three are Phase 4 placeholders — spending 30px of a fold on captions
            for controls that do nothing pushes the real CTA off screen. */}
        <View className="mt-2 flex-row gap-2">
          {ALTERNATES.map(({ icon: Icon, title }) => (
            <View
              key={title}
              className="flex-1 items-center gap-1.5 rounded-tile bg-surface px-2 py-2.5"
              style={{ borderWidth: 1, borderColor: surface.line, opacity: 0.6 }}
            >
              <Icon size={17} color={brand[500]} />
              <Text className="text-center text-[11px] font-semibold leading-tight text-ink-900">
                {title}
              </Text>
            </View>
          ))}
        </View>

        <View className="mt-3 flex-row items-start gap-2 rounded-tile bg-brand-50 px-3.5 py-2.5">
          <Sparkles size={13} color={brand[400]} style={{ marginTop: 2 }} />
          <Text className="flex-1 text-[11px] leading-[16px] text-ink-500">
            Baymax reads and organizes your documents to answer your questions. It never diagnoses,
            prescribes, or shares anything outside your family.
          </Text>
        </View>

        <View className="mt-auto pt-4">
          <Button onPress={() => router.push("/plan")}>
            <Text className="text-[16px] font-bold text-white">I&apos;ll upload later</Text>
          </Button>
          <Text className="mt-1.5 text-center text-[12px]" style={{ color: ink[300] }}>
            You can add documents anytime from the app.
          </Text>
        </View>
      </View>
    </View>
  );
}
