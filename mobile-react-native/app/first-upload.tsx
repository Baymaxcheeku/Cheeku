import { useRouter } from "expo-router";
import {
  ArrowRight,
  Camera,
  CalendarClock,
  FileText,
  Images,
  Lock,
  MessageCircleQuestion,
  Sparkles,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Headline, StepLabel, Lede, OnboardingHeader } from "@/components/onboarding/chrome";
import { BubblePop } from "@/components/onboarding/motion";
import { Button } from "@/components/ui/button";
import { brand, ink, shadow, surface } from "@/theme/tokens";
import { font, type } from "@/theme/type";

/*
 * What the first report makes possible, stated as things the app does today.
 * Gamified as "unlocks" because that is honestly what happens: with no
 * documents, Ask can only answer in general terms.
 */
const UNLOCKS: readonly { icon: LucideIcon; text: string }[] = [
  { icon: MessageCircleQuestion, text: "Questions answered from your own reports" },
  { icon: CalendarClock, text: "Every value with its date and source" },
  { icon: Sparkles, text: "Your whole history in one timeline" },
];

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
      <OnboardingHeader back="/journey" action={{ label: "Skip", href: "/plan" }} step={4} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <StepLabel step={4} />
        <Headline lead="Let's fill your" accent="health file" />
        <Lede>
          Lab reports, prescriptions, discharge summaries. The last 12 months is perfect. The more
          I&apos;ve read, the more my answers are about{" "}
          <Text style={{ fontFamily: font.semibold, color: ink[700] }}>you</Text>, not people in
          general.
        </Lede>

        {/*
         * THE PRIMARY SURFACE, and the only loud thing on the screen. Not a
         * dashed drop zone: dragging is a desktop metaphor, and nothing is ever
         * dragged on a phone.
         */}
        <BubblePop delay={0.1} style={{ marginTop: 22 }}>
          <View className="overflow-hidden rounded-[26px]" style={[shadow.e2, { backgroundColor: brand[600] }]}>
            <View className="p-5">
              <View className="flex-row items-start gap-3.5">
                <View
                  className="h-12 w-12 items-center justify-center rounded-[16px]"
                  style={{ backgroundColor: "rgba(255,255,255,0.16)" }}
                >
                  <FileText size={22} color="#ffffff" />
                </View>
                <View className="min-w-0 flex-1">
                  <Text style={[type.heading, { color: "#ffffff" }]}>Upload a PDF</Text>
                  <Text style={[type.bodySmall, { marginTop: 3, color: "rgba(255,255,255,0.82)" }]}>
                    Most labs and hospital portals let you download a whole year in one file.
                  </Text>
                </View>
              </View>

              <View className="mt-4 gap-2">
                {UNLOCKS.map(({ icon: Icon, text }, i) => (
                  <BubblePop key={text} delay={0.35 + i * 0.12}>
                    <View className="flex-row items-center gap-2.5">
                      <View
                        className="h-6 w-6 items-center justify-center rounded-pill"
                        style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
                      >
                        <Icon size={13} color="#ffffff" />
                      </View>
                      <Text style={{ fontFamily: font.medium, fontSize: 13, color: "#ffffff" }}>{text}</Text>
                    </View>
                  </BubblePop>
                ))}
              </View>

              <View className="mt-5">
                <Button variant="secondary" onPress={() => open("file")}>
                  <Text style={[type.button, { color: brand[700] }]}>Choose a file</Text>
                  <ArrowRight size={18} color={brand[700]} />
                </Button>
              </View>

              <Text
                style={{ marginTop: 10, textAlign: "center", fontFamily: font.regular, fontSize: 11.5, color: "rgba(255,255,255,0.7)" }}
              >
                PDF, JPG, PNG or HEIC · up to 10MB each
              </Text>
            </View>
          </View>
        </BubblePop>

        {/* Alternatives: real controls, deliberately lower billing. */}
        <Text style={[type.eyebrow, { color: ink[300], marginTop: 26 }]}>Or add them one at a time</Text>
        <View className="mt-3 overflow-hidden rounded-[22px] bg-surface" style={shadow.e1}>
          {ROUTES.map((route, i) => {
            const Icon = route.icon;
            return (
              <Pressable
                key={route.source}
                accessibilityRole="button"
                accessibilityLabel={`${route.title}. ${route.body}`}
                onPress={() => open(route.source)}
                className="flex-row items-center gap-3.5 px-4 py-4"
                style={i > 0 ? { borderTopWidth: 1, borderTopColor: surface.line } : undefined}
              >
                <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-brand-50">
                  <Icon size={19} color={brand[600]} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text style={type.label}>{route.title}</Text>
                  <Text style={[type.caption, { marginTop: 2 }]}>{route.body}</Text>
                </View>
                <ArrowRight size={17} color={ink[300]} />
              </Pressable>
            );
          })}
        </View>

        {/*
         * The promise and its limit, in the same box — beside the moment
         * somebody decides whether to hand over a year of medical history, not
         * three screens away in a settings page nobody opens.
         */}
        <View className="mt-5 flex-row items-start gap-2.5 rounded-[18px] px-4 py-3.5" style={{ backgroundColor: brand[50] }}>
          <Lock size={15} color={brand[500]} style={{ marginTop: 2 }} />
          <Text style={[type.bodySmall, { flex: 1, color: ink[700] }]}>
            Encrypted and private to your family. I read it, remember it, and check everything you tell me
            against it. I won&apos;t diagnose or prescribe, and nothing leaves your account.
          </Text>
        </View>
      </ScrollView>

      <View className="px-6 pt-2" style={{ paddingBottom: insets.bottom + 10 }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/plan")}
          hitSlop={8}
          className="items-center py-2.5"
        >
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[500] }}>I&apos;ll do this later</Text>
          <Text style={[type.caption, { marginTop: 2, color: ink[300] }]}>You can add documents any time</Text>
        </Pressable>
      </View>
    </View>
  );
}
