import { useRouter } from "expo-router";
import {
  Brain,
  Check,
  Heart,
  Info,
  Lock,
  MessageCircle,
  ShieldCheck,
  Sliders,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";

import { SettingsScreen } from "@/components/settings/chrome";
import { MascotBust } from "@/components/illustrations/sprout";
import { PopIn, StaggerItem, TapToWiggle } from "@/components/ui/motion";
import { APP_VERSION } from "@/lib/app-meta";
import { FREE_CHAT_LIMIT } from "@/lib/billing/plans";
import { JOURNEYS } from "@/lib/onboarding/journeys";
import { castFaces } from "@/lib/profiles/avatar";
import { brand, ink, semantic, shadow, surface } from "@/theme/tokens";

/**
 * About Baymax — the product's own case for itself.
 *
 * A long editorial page rather than a settings row: hero, four traits, who it
 * is for, the 2am spiral, what it remembers, search-versus-Baymax, the privacy
 * trio, what it will never do, and a chat CTA.
 *
 * Two departures from the reference frame, both for the same reason as
 * everywhere else in this app:
 *
 *   The frame's pillars promise "insights and next steps you can trust". Baymax
 *   does not give next steps on a health value — that is rule 1 — so the traits
 *   are about organising and finding, which is what it genuinely does.
 *
 *   A "what Baymax will never do" block is added. A page that only sells is a
 *   page that has overpromised by the end, and this one is read by people
 *   deciding whether to trust it with a family's medical history.
 */
export default function About() {
  const router = useRouter();

  // One face per journey. Generated here so the same cast appears each render
  // rather than reshuffling on every scroll.
  const faces = castFaces(JOURNEYS.length);

  return (
    <SettingsScreen title="About Baymax" eyebrow="Your AI health companion" icon={Info}>
      {/* ------------------------------------------------------------ hero */}
      <View
        className="mx-5 mt-4 overflow-hidden rounded-card bg-brand-50 p-4"
        style={{ borderWidth: 1, borderColor: brand[100] }}
      >
        <View className="absolute -right-3 -top-3">
          <TapToWiggle>
            <MascotBust size={124} />
          </TapToWiggle>
        </View>
        <View className="pr-[32%]">
          <Text className="text-[21px] font-bold leading-[24px] tracking-tight text-ink-900">
            More than answers.{"\n"}
            <Text className="text-brand-600">A companion for life.</Text>
          </Text>
          <Text className="mt-2 text-[12.5px] leading-[18px] text-ink-700">
            Baymax keeps your family&apos;s health records in one place, remembers what matters, and
            answers questions grounded in what you&apos;ve actually uploaded.
          </Text>
        </View>
      </View>

      {/*
       * Four traits as one strip, not four cards.
       *
       * As a 2x2 grid this was the page's structure rather than its content.
       * The colours are deliberately all brand: green and amber carry health
       * meaning everywhere else in this app, and spending them on words like
       * "Personal" teaches the reader that the palette means nothing.
       */}
      <View
        className="mx-5 mt-3 flex-row rounded-card bg-surface px-2 py-3"
        style={shadow.e1}
      >
        {(
          [
            [Lock, "Private"],
            [Sliders, "Personal"],
            [MessageCircle, "Grounded"],
            [Sparkles, "Organised"],
          ] as const
        ).map(([Icon, label], i) => (
          <PopIn key={label} index={i} style={{ flex: 1 }}>
            <View className="items-center gap-1.5">
              <View className="h-9 w-9 items-center justify-center rounded-pill bg-brand-50">
                <Icon size={16} color={brand[600]} />
              </View>
              <Text className="text-[10.5px] font-semibold text-ink-700">{label}</Text>
            </View>
          </PopIn>
        ))}
      </View>

      {/* -------------------------------------------------------- journeys */}
      {/*
       * Who it is for, said out loud and early. The same JOURNEYS the welcome
       * carousel offers, from one source, so the promise made before signup and
       * the promise repeated here cannot drift apart.
       */}
      <View className="mt-6">
        <View className="px-5">
          <Text className="text-[17px] font-bold leading-[21px] tracking-tight text-ink-900">
            Whatever you&apos;re carrying{"\n"}
            <Text className="text-brand-600">right now.</Text>
          </Text>
          <Text className="mt-1.5 text-[12.5px] leading-[18px] text-ink-500">
            The same memory underneath, shaped around the season you&apos;re in.
          </Text>
        </View>

        <View className="mx-5 mt-3 overflow-hidden rounded-card bg-surface" style={shadow.e1}>
          {JOURNEYS.map((journey, i) => (
            <StaggerItem key={journey.id} index={i}>
              <View
                className="flex-row items-center gap-3 p-3.5"
                style={i > 0 ? { borderTopWidth: 1, borderTopColor: surface.line } : undefined}
              >
                <View className="h-10 w-10 overflow-hidden rounded-pill bg-canvas">
                  <SvgXml xml={faces[i] ?? ""} width={40} height={40} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[13.5px] font-semibold text-ink-900">{journey.label}</Text>
                  <Text className="mt-0.5 text-[11.5px] leading-[16px] text-ink-500">
                    {journey.problem}
                  </Text>
                </View>
              </View>
            </StaggerItem>
          ))}
        </View>
      </View>

      {/* ---------------------------------------------------- 2am spiral -- */}
      <View className="mx-5 mt-6 overflow-hidden rounded-card bg-brand-50" style={shadow.e1}>
        <View className="p-4">
          <Text className="text-[17px] font-bold leading-[21px] tracking-tight text-ink-900">
            2am. Something feels off.{"\n"}
            <Text className="text-brand-600">You start searching.</Text>
          </Text>
          <Text className="mt-1.5 text-[12.5px] leading-[18px] text-ink-500">
            Ten tabs later you know less than when you started, and you are more frightened.
          </Text>
        </View>

        <View
          className="flex-row items-start gap-2.5 bg-surface px-4 py-3.5"
          style={{ borderTopWidth: 1, borderTopColor: surface.line }}
        >
          <ShieldCheck size={16} color={brand[600]} style={{ marginTop: 1 }} />
          <Text className="flex-1 text-[12.5px] leading-[18px] text-ink-700">
            <Text className="font-bold text-brand-700">Baymax breaks the loop.</Text> It reads what
            your own report says, names the document it came from, and leaves what it means to your
            doctor.
          </Text>
        </View>
      </View>

      {/* ------------------------------------------------------- remembers */}
      <View
        className="mx-5 mt-4 overflow-hidden rounded-card bg-brand-50 p-4"
        style={{ borderWidth: 1, borderColor: brand[100] }}
      >
        <Text className="text-[16px] font-bold leading-[20px] text-ink-900">
          Baymax remembers everything about your family, so you don&apos;t have to.
        </Text>
        <View className="mt-3 gap-2">
          {[
            "Reports, scans, prescriptions and doctor visits",
            "Conditions, allergies and current medications",
            "Which family member each record belongs to",
            "What changed since the last reading",
          ].map((line) => (
            <View key={line} className="flex-row items-start gap-2.5">
              <View className="mt-px h-5 w-5 items-center justify-center rounded-pill bg-brand-600">
                <Check size={12} color="#fff" strokeWidth={3} />
              </View>
              <Text className="flex-1 text-[12.5px] leading-[18px] text-ink-700">{line}</Text>
            </View>
          ))}
        </View>
        <View className="mt-3 flex-row items-start gap-2.5 rounded-tile bg-surface px-3.5 py-3">
          <Brain size={15} color={brand[500]} style={{ marginTop: 1 }} />
          <Text className="flex-1 text-[12px] leading-[17px] text-ink-500">
            The more you add, the more it can answer, and every answer points back at the document
            it came from.
          </Text>
        </View>
      </View>

      {/* ------------------------------------------------------ comparison */}
      <View className="mx-5 mt-4">
        <Text className="text-[16px] font-bold leading-[20px] text-ink-900">
          No more guessing.{"\n"}
          <Text style={{ color: semantic.safeText }}>No more endless searching.</Text>
        </Text>

        <View className="mt-3 flex-row gap-2">
          <View
            className="flex-1 overflow-hidden rounded-card bg-surface"
            style={{ borderWidth: 1, borderColor: surface.line }}
          >
            <View className="flex-row items-center gap-1.5 bg-canvas px-3 py-2">
              <X size={13} color={ink[500]} />
              <Text className="text-[11.5px] font-semibold text-ink-500">Generic search</Text>
            </View>
            <View className="gap-1.5 p-3">
              {[
                "Overwhelming results",
                "Written for nobody",
                "No idea of your history",
                "More worry, less clarity",
              ].map((line) => (
                <View key={line} className="flex-row items-start gap-1.5">
                  <X size={11} color={ink[300]} style={{ marginTop: 2 }} />
                  <Text className="flex-1 text-[11.5px] leading-[16px] text-ink-500">{line}</Text>
                </View>
              ))}
            </View>
          </View>

          <View
            className="flex-1 overflow-hidden rounded-card bg-surface"
            style={{ borderWidth: 2, borderColor: brand[500] }}
          >
            <View
              className="flex-row items-center gap-1.5 px-3 py-2"
              style={{ backgroundColor: brand[600] }}
            >
              <Check size={13} color="#fff" strokeWidth={3} />
              <Text className="text-[11.5px] font-semibold text-white">Baymax</Text>
            </View>
            <View className="gap-1.5 p-3">
              {[
                "Reads your own reports",
                "Cites the exact document",
                "Knows what changed",
                "More clarity, less worry",
              ].map((line) => (
                <View key={line} className="flex-row items-start gap-1.5">
                  <Check size={11} color={semantic.safe} strokeWidth={3} style={{ marginTop: 2 }} />
                  <Text className="flex-1 text-[11.5px] leading-[16px] text-ink-700">{line}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* ----------------------------------------------------- privacy trio */}
      <View className="mx-5 mt-4 rounded-card bg-surface p-4" style={shadow.e1}>
        <View className="flex-row items-center gap-2.5">
          <View className="h-9 w-9 items-center justify-center rounded-tile bg-brand-50">
            <ShieldCheck size={17} color={brand[600]} />
          </View>
          <Text className="flex-1 text-[15px] font-bold leading-[19px] text-ink-900">
            Your health. Your story. Our priority.
          </Text>
        </View>
        <View
          className="mt-3 flex-row gap-2 pt-3"
          style={{ borderTopWidth: 1, borderTopColor: surface.line }}
        >
          {(
            [
              [Lock, "Private by design", "Encrypted, never sold"],
              [Sliders, "You're in control", "Export or delete anytime"],
              [Heart, "Always by your side", "Judgement-free, 24/7"],
            ] as const
          ).map(([Icon, title, body]: readonly [LucideIcon, string, string]) => (
            <View key={title} className="flex-1 items-center">
              <View className="h-9 w-9 items-center justify-center rounded-pill bg-brand-50">
                <Icon size={16} color={brand[600]} />
              </View>
              <Text className="mt-1.5 text-center text-[11px] font-semibold leading-[14px] text-ink-900">
                {title}
              </Text>
              <Text className="mt-0.5 text-center text-[10px] leading-[13px] text-ink-500">
                {body}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ------------------------------------------------ what it never does */}
      <View
        className="mx-5 mt-4 rounded-card bg-surface p-4"
        style={{ borderWidth: 1, borderColor: surface.line }}
      >
        <Text className="text-[14px] font-bold text-ink-900">What Baymax will never do</Text>
        <View className="mt-2 gap-1.5">
          {[
            "Diagnose a condition, or say what a value might mean",
            "Suggest a medication, a dose, or a treatment",
            "Show one family member's records under another's name",
            "Sell your data, or share it outside your family",
          ].map((line) => (
            <View key={line} className="flex-row items-start gap-2">
              <X size={12} color={ink[300]} style={{ marginTop: 2 }} />
              <Text className="flex-1 text-[12px] leading-[17px] text-ink-500">{line}</Text>
            </View>
          ))}
        </View>
        <Text className="mt-2.5 text-[11.5px] leading-[16px] text-ink-500">
          Free includes {FREE_CHAT_LIMIT} chats a month. Anything a doctor should decide, Baymax
          hands to your doctor.
        </Text>
      </View>

      {/* -------------------------------------------------------------- CTA */}
      <View
        className="mx-5 mt-5 overflow-hidden rounded-card p-4"
        style={{ backgroundColor: brand[600] }}
      >
        <View className="flex-row items-start gap-3">
          <View
            className="h-10 w-10 items-center justify-center rounded-pill"
            style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
          >
            <MessageCircle size={19} color="#fff" />
          </View>
          <Text className="min-w-0 flex-1 text-[13px] leading-[18px] text-white">
            I&apos;m here to listen and help you keep track, every step of the way. Let&apos;s take
            better care of you, together.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/ask")}
          className="mt-3 h-12 flex-row items-center justify-center gap-2 rounded-pill bg-white"
        >
          <MessageCircle size={16} color={brand[700]} />
          <Text className="text-[14px] font-semibold" style={{ color: brand[700] }}>
            Chat with Baymax
          </Text>
        </Pressable>
      </View>

      <View className="mx-5 mt-4 overflow-hidden rounded-card bg-surface" style={shadow.e1}>
        <View
          className="flex-row items-center justify-between p-3.5"
          style={{ borderBottomWidth: 1, borderBottomColor: surface.line }}
        >
          <Text className="text-[13.5px] font-semibold text-ink-900">Version</Text>
          <Text className="text-[13px] text-ink-500">{APP_VERSION}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/settings/security")}
          className="flex-row items-center justify-between p-3.5"
        >
          <Text className="text-[13.5px] font-semibold text-ink-900">Security &amp; privacy</Text>
          <Text className="text-[12px] font-medium text-brand-600">View</Text>
        </Pressable>
      </View>

      <View className="mx-5 mt-4 flex-row items-start gap-2">
        <ShieldCheck size={14} color={ink[300]} style={{ marginTop: 1 }} />
        <Text className="flex-1 text-[11px] leading-[16px] text-ink-500">
          Baymax is not a replacement for professional medical advice. For emergencies, contact your
          doctor or local emergency services.
        </Text>
      </View>
    </SettingsScreen>
  );
}
