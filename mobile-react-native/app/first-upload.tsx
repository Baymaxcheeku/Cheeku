import { useRouter } from "expo-router";
import {
  ArrowRight,
  Camera,
  FileText,
  Images,
  Lock,
  Sparkles,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Headline, OnboardingHeader } from "@/components/onboarding/chrome";
import { Button } from "@/components/ui/button";
import { Drift, Settle } from "@/components/ui/motion";
import { brand, ink, shadow, surface } from "@/theme/tokens";

/*
 * A6 — the first upload.
 *
 * ┌─ WHAT WAS WRONG WITH IT ─────────────────────────────────────────────────┐
 * │                                                                          │
 * │ The primary button did nothing. Literally `disabled`, with a comment     │
 * │ saying the upload pipeline landed in Phase 4 — which it did, weeks ago,  │
 * │ at /scan. So the screen's entire purpose was decorative, and beneath it  │
 * │ sat three more dead tiles at 60% opacity.                                │
 * │                                                                          │
 * │ Worse, the loudest control on the page was a solid violet "I'll upload   │
 * │ later". The one button that worked was the one for not doing the thing.  │
 * │                                                                          │
 * │ It also asked for "a document". One document at the end of onboarding is │
 * │ a demo. What makes an answer personal is having enough history to quote  │
 * │ from, so it now asks for the last twelve months and says why that ask    │
 * │ makes the answers better.                                                │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ONE PRIMARY ACTION. Upload is the brand card; the alternatives are quiet
 * rows beneath it; skipping is a link. Skipping is still a first-class outcome
 * — a nag at the end of onboarding costs more accounts than one document is
 * worth — but it no longer outranks the thing being asked for.
 *
 * WHAT THE COPY MAY NOT SAY. That Cheeku will interpret, assess or understand
 * anything. It reads, remembers, and quotes back with a source. "Understands
 * your health" is what turns a filing cabinet into a diagnosis nobody asked
 * for, and it is a promise this app is built specifically not to make.
 */

type Route = { icon: LucideIcon; title: string; body: string; source: string };

const ROUTES: readonly Route[] = [
  {
    icon: Camera,
    title: "Photograph a report",
    body: "One page at a time, straight from the camera",
    source: "photo",
  },
  {
    icon: Images,
    title: "Choose from your photos",
    body: "Screenshots and pictures you already have",
    source: "library",
  },
];

export default function FirstUpload() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  /*
   * Every route lands on /scan, which already owns picking, metadata
   * stripping, upload, extraction and the review step. `source` tells it which
   * picker to open so nobody is asked to choose twice.
   */
  function open(source: string) {
    router.push({ pathname: "/scan", params: { source } });
  }

  return (
    <View className="flex-1 bg-canvas">
      <OnboardingHeader back="/journey" action={{ label: "Skip", href: "/plan" }} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Headline lead="Bring me the last" accent="twelve months" />
        <Text className="mt-2.5 text-[13.5px] leading-[20px] text-ink-500">
          Lab reports, prescriptions, scans, discharge summaries — a year of them, ideally as one
          combined PDF. The more of your history I can read, the more my answers are about{" "}
          <Text className="font-semibold text-ink-700">you</Text> and not about people in general.
        </Text>

        {/*
         * THE PRIMARY SURFACE, and the only loud thing on the screen.
         *
         * Not a dashed drop-zone: dragging is a desktop metaphor and nothing is
         * ever dragged on a phone. A card that states the ask, names the
         * format, and carries the action.
         */}
        <Settle delay={0.05} style={{ marginTop: 20 }}>
          <View
            className="overflow-hidden rounded-card"
            style={[shadow.e2, { backgroundColor: brand[600] }]}
          >
            <View className="px-4 pb-4 pt-[18px]">
              <View className="flex-row items-start gap-3">
                <View
                  className="h-11 w-11 items-center justify-center rounded-tile"
                  style={{ backgroundColor: "rgba(255,255,255,0.16)" }}
                >
                  <FileText size={20} color="#ffffff" />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[16px] font-semibold leading-[20px] text-white">
                    Upload a combined PDF
                  </Text>
                  <Text
                    className="mt-1 text-[12px] leading-[17px]"
                    style={{ color: "rgba(255,255,255,0.78)" }}
                  >
                    One file is easiest — most labs and hospital portals let you download a whole
                    year at once.
                  </Text>
                </View>
              </View>

              <View className="mt-4">
                <Button variant="secondary" onPress={() => open("file")}>
                  <Text className="text-[16px] font-bold text-brand-700">Choose a file</Text>
                  <ArrowRight size={17} color={brand[700]} />
                </Button>
              </View>

              <Text
                className="mt-2 text-center text-[11px]"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                PDF, JPG, PNG or HEIC · up to 10MB each
              </Text>
            </View>
          </View>
        </Settle>

        {/* Alternatives: real controls now, but deliberately lower billing. */}
        <Text className="mt-6 text-[12px] font-bold uppercase tracking-wide text-ink-300">
          Or add them one at a time
        </Text>
        <View className="mt-2.5 overflow-hidden rounded-card bg-surface" style={shadow.e1}>
          {ROUTES.map((route, i) => {
            const Icon = route.icon;
            return (
              <Pressable
                key={route.source}
                accessibilityRole="button"
                accessibilityLabel={`${route.title}. ${route.body}`}
                onPress={() => open(route.source)}
                className="flex-row items-center gap-3 px-3.5 py-3.5"
                style={i > 0 ? { borderTopWidth: 1, borderTopColor: surface.line } : undefined}
              >
                <View className="h-10 w-10 items-center justify-center rounded-tile bg-brand-50">
                  <Icon size={18} color={brand[600]} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[14px] font-semibold text-ink-900">{route.title}</Text>
                  <Text className="mt-0.5 text-[11.5px] leading-[16px] text-ink-500">
                    {route.body}
                  </Text>
                </View>
                <ArrowRight size={16} color={ink[300]} />
              </Pressable>
            );
          })}
        </View>

        {/*
         * The promise and its limit, in the same box.
         *
         * "It never diagnoses" belongs exactly here — beside the moment
         * somebody decides whether to hand over a year of their medical
         * history — and not three screens away in a settings page nobody opens.
         */}
        <Drift delay={0.18} style={{ marginTop: 20 }}>
          <View className="gap-2.5 rounded-card bg-brand-50 p-3.5">
            <View className="flex-row items-start gap-2.5">
              <Sparkles size={14} color={brand[500]} style={{ marginTop: 1 }} />
              <Text className="flex-1 text-[12px] leading-[17px] text-ink-700">
                I read what your documents say and remember it, so you never explain your history
                twice. Every answer names the record it came from.
              </Text>
            </View>
            <View className="flex-row items-start gap-2.5">
              <Lock size={14} color={brand[500]} style={{ marginTop: 1 }} />
              <Text className="flex-1 text-[12px] leading-[17px] text-ink-700">
                Encrypted, private to your family, never sold. I never diagnose, never prescribe,
                and never share anything outside your account.
              </Text>
            </View>
          </View>
        </Drift>
      </ScrollView>

      <View className="px-5 pt-2" style={{ paddingBottom: insets.bottom + 10 }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/plan")}
          hitSlop={8}
          className="items-center py-2.5"
        >
          <Text className="text-[14px] font-semibold text-ink-500">I&apos;ll do this later</Text>
          <Text className="mt-0.5 text-[11.5px]" style={{ color: ink[300] }}>
            You can add documents any time
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
