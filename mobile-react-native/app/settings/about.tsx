import { useRouter } from "expo-router";
import {
  Brain,
  Check,
  ChevronDown,
  FileText,
  Heart,
  Info,
  Lock,
  MessageCircle,
  Moon,
  Quote,
  ScanSearch,
  ShieldCheck,
  Sliders,
  Sparkles,
  Stethoscope,
  Users,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";

import { SettingsScreen } from "@/components/settings/chrome";
import { MascotBust } from "@/components/illustrations/sprout";
import { PopIn, StaggerItem, TapToWiggle } from "@/components/ui/motion";
import { APP_VERSION } from "@/lib/app-meta";
import { FREE_CHAT_LIMIT, PLANS } from "@/lib/billing/plans";
import { JOURNEYS } from "@/lib/onboarding/journeys";
import { castFaces } from "@/lib/profiles/avatar";
import { brand, ink, semantic, shadow, surface } from "@/theme/tokens";
import { Brand } from "@/components/ui/brand";

/**
 * About Cheeku AI — the product's own case for itself.
 *
 * ┌─ THE STRATEGY, AND WHY IT IS NOT THE OBVIOUS ONE ────────────────────────┐
 * │                                                                          │
 * │ The category's playbook is visible on any competitor's site: lead with a │
 * │ benchmark score, follow with a user count, then testimonials, then       │
 * │ features. It works because it borrows authority — a number on an exam, a │
 * │ crowd, four happy strangers.                                             │
 * │                                                                          │
 * │ We cannot run that play honestly. There is no benchmark result, no user  │
 * │ count worth printing, and no testimonial that was not written by us.     │
 * │ Inventing any of them is exactly the behaviour this app exists to be the │
 * │ opposite of, and a reader who later discovers a fabricated stat does not │
 * │ revise the stat — they revise everything.                                │
 * │                                                                          │
 * │ So this page trades BORROWED authority for VERIFIABLE authority. Every   │
 * │ claim on it can be checked inside the app within a minute: the answer    │
 * │ that names its source, the record that shows which member it belongs to, │
 * │ the export button, the delete button, the refusal. That is a stronger    │
 * │ position than a leaderboard, because it survives being checked.          │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * The order answers the questions a wary reader actually asks, in the order
 * they ask them: what is it, how does it know, who is it for, why not just
 * search, what happens to my data, what will it refuse, and then the specific
 * awkward questions nobody puts on a marketing page.
 *
 * TWO RULES THIS PAGE MAY NOT BREAK. It may not promise interpretation — no
 * "insights", no "what your results mean", because rule 1 says Cheeku does not
 * do that. And it may not end on a sell: a page that only sells has
 * overpromised by the end, and this one is read by people deciding whether to
 * trust it with a family's medical history.
 */
export default function About() {
  const router = useRouter();

  // One face per journey. Generated here so the same cast appears each render
  // rather than reshuffling on every scroll.
  const faces = castFaces(JOURNEYS.length);

  return (
    <SettingsScreen title="About Cheeku AI" eyebrow="Your AI health companion" icon={Info} bare>
      {/* ------------------------------------------------------------ hero */}
      {/*
       * ┌─ WHY THE HEADER WAS REBUILT ─────────────────────────────────────┐
       * │                                                                  │
       * │ Two headers ran back to back: the settings chrome's "About        │
       * │ Cheeku / Your AI health companion" beside an info glyph, and      │
       * │ immediately under it a card saying the same thing in larger type. │
       * │ The reader met the title twice before meeting a single idea.      │
       * │                                                                  │
       * │ And the mascot was drawn at -right-3 -top-3 inside an             │
       * │ overflow-hidden card, so it was clipped on two edges — and its    │
       * │ shell gradient starts near-white, which on a brand-50 card left   │
       * │ an outline with a face in it. The friendliest thing on the page   │
       * │ rendered as a ghost, again.                                      │
       * │                                                                  │
       * │ One header now. The mascot sits whole and centred on its own disc │
       * │ — the treatment used on Home, Ask and the paywall — and the       │
       * │ screen's name is the small line above the headline rather than a  │
       * │ heading competing with it.                                        │
       * │                                                                  │
       * └──────────────────────────────────────────────────────────────────┘
       */}
      <View
        className="mx-5 items-center overflow-hidden rounded-card px-5 pb-6 pt-7"
        style={{ backgroundColor: brand[50], borderWidth: 1, borderColor: brand[100] }}
      >
        {/*
         * A HALO, NOT A DISC.
         *
         * The obvious fix for the mascot dissolving into a pale card is to put
         * it in a filled circle — which is what the header avatars do, and
         * there it is right. At hero size it is not: the bust includes a
         * raised waving arm, and a circle clips it, so the one moment the
         * character is shown at full size is the one where its arm is cut off.
         *
         * The halo sits BEHIND and smaller than the mascot. It gives the body
         * the contrast it needs against brand-50, and the arm and the heart
         * carry on past it onto the card, whole.
         */}
        <TapToWiggle>
          <View className="items-center justify-center">
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                width: 92,
                height: 92,
                borderRadius: 999,
                backgroundColor: brand[100],
                marginTop: 10,
              }}
            />
            {/*
             * The mascot is positioned too, with a zIndex above the halo.
             *
             * Without it the halo covered the face: CSS paints positioned
             * elements above static siblings regardless of source order, so
             * the "behind" circle rendered in front on web while looking
             * correct on native. Giving both a stacking context makes the
             * order mean the same thing in both renderers.
             */}
            <View style={{ zIndex: 1 }}>
              <MascotBust size={124} />
            </View>
          </View>
        </TapToWiggle>

        <Text
          className="mt-4 text-[11px] font-bold uppercase text-ink-300"
          style={{ letterSpacing: 1.4 }}
        >
          About <Brand ai />
        </Text>

        {/*
         * "It doesn't guess" is the whole positioning in three words, and it
         * is a claim about MECHANISM rather than quality. Everyone in this
         * category says accurate, personal, trusted. Almost none of them can
         * tell you where a given sentence came from.
         */}
        <Text
          className="mt-2 text-center text-[24px] font-bold leading-[29px] text-ink-900"
          style={{ letterSpacing: -0.6 }}
        >
          It doesn&apos;t guess.{"\n"}
          <Text className="text-brand-600">It reads your records.</Text>
        </Text>
        <Text className="mt-2.5 max-w-[300px] text-center text-[13px] leading-[19px] text-ink-700">
          Your family&apos;s health documents in one place, remembered, and read back in plain
          language — naming the record every answer came from.
        </Text>
      </View>

      {/*
       * Four traits as one strip, divided by hairlines.
       *
       * As four separate cards this was the page's structure rather than its
       * content; as one strip with no dividers the labels drifted into each
       * other. The rules are what make four equal columns read as a set.
       *
       * The colours are deliberately all brand: green and amber carry health
       * meaning everywhere else in this app, and spending them on words like
       * "Personal" teaches the reader that the palette means nothing.
       */}
      <View
        className="mx-5 mt-3 flex-row overflow-hidden rounded-card bg-surface py-3.5"
        style={{ borderWidth: 1, borderColor: surface.line }}
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
            <View
              className="items-center gap-2 px-1"
              style={i > 0 ? { borderLeftWidth: 1, borderLeftColor: surface.line } : undefined}
            >
              <Icon size={17} color={brand[600]} />
              <Text className="text-[10.5px] font-semibold text-ink-700">{label}</Text>
            </View>
          </PopIn>
        ))}
      </View>

      {/* ------------------------------------------- how an answer is built */}
      {/*
       * THE SECTION THAT DOES THE WORK.
       *
       * A competitor can claim to know you. What it cannot do is show the
       * chain. Three steps, each one a thing the reader can watch happen in
       * the app, ending at the citation — which is the single feature that
       * separates this from a confident stranger with a search engine.
       */}
      <View className="mt-6">
        <View className="px-5">
          <Text className="text-[17px] font-bold leading-[21px] tracking-tight text-ink-900">
            Where every answer{"\n"}
            <Text className="text-brand-600">actually comes from.</Text>
          </Text>
          <Text className="mt-1.5 text-[12.5px] leading-[18px] text-ink-500">
            Not the internet. Not a guess about people like you. Your own documents, quoted back.
          </Text>
        </View>

        <View className="mx-5 mt-3 overflow-hidden rounded-card bg-surface" style={shadow.e1}>
          {(
            [
              [
                "1",
                "You add a document",
                "A photo, a scan or a PDF. Photos are stripped of location data on your device before anything is uploaded.",
              ],
              [
                "2",
                "Cheeku reads it, you confirm it",
                "Values, dates, doctors and medicines are pulled out. Anything it is unsure of is flagged for you to check against the original page.",
              ],
              [
                "3",
                "Answers name their source",
                "Ask a question and the reply points at the exact record it came from, so you can open it and see for yourself.",
              ],
            ] as const
          ).map(([step, title, body], i) => (
            <StaggerItem key={step} index={i}>
              <View
                className="flex-row items-start gap-3 p-3.5"
                style={i > 0 ? { borderTopWidth: 1, borderTopColor: surface.line } : undefined}
              >
                <View
                  className="h-7 w-7 items-center justify-center rounded-pill"
                  style={{ backgroundColor: brand[600] }}
                >
                  <Text className="text-[12px] font-bold text-white">{step}</Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[13.5px] font-semibold text-ink-900">{title}</Text>
                  <Text className="mt-0.5 text-[11.5px] leading-[16px] text-ink-500">{body}</Text>
                </View>
              </View>
            </StaggerItem>
          ))}
        </View>

        <View className="mx-5 mt-2 flex-row items-start gap-2">
          <Quote size={13} color={ink[300]} style={{ marginTop: 2 }} />
          <Text className="flex-1 text-[11.5px] leading-[16px] text-ink-500">
            If <Brand /> cannot point at a record, it says so rather than filling the gap.
          </Text>
        </View>
      </View>

      {/* ------------------------------------------------- what you can ask */}
      {/*
       * The four things people actually open this app to do.
       *
       * Everything above explains the mechanism; this is the only section that
       * says what a Tuesday night with Cheeku looks like, and it is the one a
       * reader recognises themselves in.
       *
       * ┌─ THE LINE, DRAWN EXACTLY ────────────────────────────────────────┐
       * │                                                                  │
       * │ "Understand what is happening" is inside it. "Here is what you   │
       * │ have" and "here is what to take for it" are outside it, and no   │
       * │ wording on this page may imply otherwise, however much softer it │
       * │ would make the pitch. What Cheeku genuinely removes at 2am is    │
       * │ not the diagnosis — it is the not-knowing-what-the-words-mean    │
       * │ and the not-knowing-whether-this-is-worth-a-call.                │
       * │                                                                  │
       * └──────────────────────────────────────────────────────────────────┘
       */}
      <View className="mt-6">
        <View className="px-5">
          <Text className="text-[17px] font-bold leading-[21px] tracking-tight text-ink-900">
            Bring it anything{"\n"}
            <Text className="text-brand-600">that&apos;s worrying you.</Text>
          </Text>
          <Text className="mt-1.5 text-[12.5px] leading-[18px] text-ink-500">
            At 2am, in a pharmacy aisle, or in the ten minutes before an appointment.
          </Text>
        </View>

        <View className="mx-5 mt-3 gap-2">
          {(
            [
              [
                Moon,
                "A symptom, at midnight",
                "\u201cMy ears have been blocked since I caught a cold.\u201d Cheeku explains what that usually involves in plain words, reads it next to what your own records already say, and tells you honestly when it is worth seeing someone rather than waiting.",
              ],
              [
                FileText,
                "A report you can\u2019t read",
                "Photograph it and ask what a line means. Cheeku explains the term and the range the laboratory printed, and shows you the page it is reading from.",
              ],
              [
                ScanSearch,
                "A product, before you buy it",
                "A lotion, a supplement, a snack. Cheeku checks its ingredients against the conditions and allergies recorded in your own profile, and says plainly when something is worth avoiding.",
              ],
              [
                Stethoscope,
                "An appointment, both ends of it",
                "What to ask before you go, and what was actually said afterwards \u2014 kept with the documents rather than in your head.",
              ],
            ] as const
          ).map(([Icon, title, body], i) => (
            <StaggerItem key={title} index={i}>
              <View className="flex-row items-start gap-3 rounded-card bg-surface p-3.5" style={shadow.e1}>
                <View className="h-10 w-10 items-center justify-center rounded-tile bg-brand-50">
                  <Icon size={18} color={brand[600]} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[13.5px] font-semibold text-ink-900">{title}</Text>
                  <Text className="mt-1 text-[12px] leading-[17px] text-ink-500">{body}</Text>
                </View>
              </View>
            </StaggerItem>
          ))}
        </View>

        <View className="mx-5 mt-2.5 flex-row items-start gap-2 rounded-tile bg-brand-50 px-3.5 py-3">
          <Info size={14} color={brand[500]} style={{ marginTop: 1 }} />
          <Text className="flex-1 text-[11.5px] leading-[16px] text-ink-700">
            <Brand /> will not tell you what you have or what to take for it. It explains what things
            mean, keeps the history straight, and is candid about when a person should look at this
            instead.
          </Text>
        </View>
      </View>

      {/* ------------------------------------------------------ the family */}
      {/*
       * "You first, your family too" — not "family, not user".
       *
       * The first version of this section led with "Built for a family, not a
       * user", which reads as though somebody managing only their own health
       * has the wrong app. Most people arrive alone, and many stay alone; the
       * family capability is what they grow into, not the entry requirement.
       * The offer is one file for you, and room for whoever you look after.
       */}
      <View
        className="mx-5 mt-6 overflow-hidden rounded-card bg-brand-50 p-4"
        style={{ borderWidth: 1, borderColor: brand[100] }}
      >
        <View className="flex-row items-start gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-tile bg-surface">
            <Users size={19} color={brand[600]} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[16px] font-bold leading-[20px] text-ink-900">
              Yours first. Your family&apos;s when you need it.
            </Text>
            <Text className="mt-1 text-[12.5px] leading-[18px] text-ink-700">
              Start with just your own file — that is the whole app for most people. When you begin
              carrying somebody else&apos;s paperwork too, add them, and their history stays theirs
              rather than blurring into yours.
            </Text>
          </View>
        </View>
        <View className="mt-3 gap-2">
          {[
            "A complete file for you alone, with nothing extra to set up",
            "Add a parent, a partner or a child whenever that day comes",
            "Separate records, timeline and health file per person",
            `Up to ${PLANS.family.seats} people on the Family plan`,
          ].map((line) => (
            <View key={line} className="flex-row items-start gap-2.5">
              <View className="mt-px h-5 w-5 items-center justify-center rounded-pill bg-brand-600">
                <Check size={12} color="#fff" strokeWidth={3} />
              </View>
              <Text className="flex-1 text-[12.5px] leading-[18px] text-ink-700">{line}</Text>
            </View>
          ))}
        </View>
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
            <Text className="font-bold text-brand-700"><Brand /> breaks the loop.</Text> It reads what
            your own report says, names the document it came from, and leaves what it means to your
            doctor.
          </Text>
        </View>
      </View>

      {/* ------------------------------------------------------- remembers */}
      <View
        className="mx-5 mt-4 overflow-hidden rounded-card bg-surface p-4"
        style={shadow.e1}
      >
        <Text className="text-[16px] font-bold leading-[20px] text-ink-900">
          It remembers, so you don&apos;t have to hold it all.
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
        <View className="mt-3 flex-row items-start gap-2.5 rounded-tile bg-brand-50 px-3.5 py-3">
          <Brain size={15} color={brand[500]} style={{ marginTop: 1 }} />
          <Text className="flex-1 text-[12px] leading-[17px] text-ink-500">
            The more you add, the more it can answer — and every answer still points back at the
            document it came from.
          </Text>
        </View>
      </View>

      {/* ------------------------------------------------------ comparison */}
      {/*
       * Compared against a general AI assistant, not a search engine.
       *
       * Search was the honest comparison two years ago. It is not the thing a
       * reader is weighing this against today, and a comparison aimed at the
       * wrong rival reads as evasion. Every line here is a factual difference
       * in what the two systems have access to — not a claim that one is
       * cleverer than the other.
       */}
      <View className="mx-5 mt-4">
        <Text className="text-[16px] font-bold leading-[20px] text-ink-900">
          Why not just ask{"\n"}
          <Text className="text-brand-600">a general AI assistant?</Text>
        </Text>

        <View className="mt-3 flex-row gap-2">
          <View
            className="flex-1 overflow-hidden rounded-card bg-surface"
            style={{ borderWidth: 1, borderColor: surface.line }}
          >
            <View className="flex-row items-center gap-1.5 bg-canvas px-3 py-2">
              <X size={13} color={ink[500]} />
              <Text className="text-[11.5px] font-semibold text-ink-500">A general assistant</Text>
            </View>
            <View className="gap-1.5 p-3">
              {[
                "Has never seen your reports",
                "Answers about people in general",
                "Cannot show you a source",
                "Forgets between conversations",
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
              <Text className="text-[11.5px] font-semibold text-white"><Brand /></Text>
            </View>
            <View className="gap-1.5 p-3">
              {[
                "Reads your own documents",
                "Answers from your history",
                "Names the exact record",
                "Remembers across years",
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
            Your health. Your story. Your call.
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
        <Text className="text-[14px] font-bold text-ink-900">What <Brand /> will never do</Text>
        <View className="mt-2 gap-1.5">
          {[
            "Name a diagnosis, or decide what a result means for treatment",
            "Suggest a medicine, change a dose, or tell anyone to stop one",
            "Show one family member's records under another's name",
            "Answer an emergency with analysis instead of sending you to help",
            "Sell your data, or share it outside your family",
          ].map((line) => (
            <View key={line} className="flex-row items-start gap-2">
              <X size={12} color={ink[300]} style={{ marginTop: 2 }} />
              <Text className="flex-1 text-[12px] leading-[17px] text-ink-500">{line}</Text>
            </View>
          ))}
        </View>
        <Text className="mt-2.5 text-[11.5px] leading-[16px] text-ink-500">
          What it does instead: reads what you describe against everything it remembers, tells you how urgent it looks, and hands the doctor the whole story.
        </Text>
      </View>

      {/* -------------------------------------------------------------- FAQ */}
      <Faq />

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
            Chat with <Brand />
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
          <Brand /> is not a replacement for professional medical advice. For emergencies, contact your
          doctor or local emergency services.
        </Text>
      </View>
    </SettingsScreen>
  );
}

/*
 * The questions nobody puts on a marketing page.
 *
 * The strongest thing this section can do is answer the awkward ones plainly
 * and FIRST — can it replace my doctor, what happens when I stop paying, what
 * do you do with my documents. A reader who finds the uncomfortable question
 * already answered stops looking for the catch; a reader who finds only
 * flattering questions starts hunting for it.
 *
 * The first answer is "No, and it is not built to." That is the most important
 * sentence on the page, and it is deliberately not softened.
 */
const FAQ: readonly { q: string; a: string }[] = [
  {
    q: "Can Cheeku replace my doctor?",
    a: "No, and it is not built to. It is a memory: every report, reading and conversation, kept in order and read against each other. That lets it say how urgent something looks and what to tell the doctor, with the numbers. Examining, diagnosing and treating stay with your doctor.",
  },
  {
    q: "Where do the answers come from?",
    a: "Your own memory first: the documents you added, the readings you mentioned, and what you talked about before, each with its date. Symptoms are read using general health knowledge, against limits that fit the person's age or stage (a newborn's day of life, a pregnancy's trimester). Every answer shows what it read, and when there is nothing to go on it says so instead of guessing.",
  },
  {
    q: "Does it use my results to decide what to show me?",
    a: "In the chat, yes, because that is the point of a memory: a starter might be a result that is still pending or a number that changed. It never suggests you have a condition. Articles are still chosen only from what you told us about yourself, the journey you picked and the conditions you typed in.",
  },
  {
    q: "Who can see my records?",
    a: "You, and only within your own account. Records are private to the family account they were added to, they are never sold, and they are not used to advertise to you. Every read is checked on the server, not just hidden in the app.",
  },
  {
    q: "What if I ask about something urgent?",
    a: "Cheeku checks every message before it goes anywhere. If what you describe could be an emergency, it stops and points you to emergency services rather than answering. It will also flag when something sounds worth seeing someone about sooner rather than later.",
  },
  {
    q: "What does it cost?",
    a: `Free includes ${FREE_CHAT_LIMIT} chats a day and unlimited storage of your own records. Paid plans raise the chat allowance and add family seats. Your documents are yours either way.`,
  },
  {
    q: "What happens to my records if I stop paying?",
    a: "Nothing is deleted. Chat allowance and the number of members you can open return to the free plan's, but every document stays exactly where it is, and any family member's file is preserved rather than removed.",
  },
  {
    q: "Can I take my data out, or delete it?",
    a: "Both, from Settings, without asking anyone. Export gives you your records and their extracted details; delete removes your account data. Neither is buried behind a support request.",
  },
];

function Faq() {
  const [open, setOpen] = useState<string | null>(FAQ[0]?.q ?? null);

  return (
    <View className="mt-6">
      <View className="px-5">
        <Text className="text-[17px] font-bold leading-[21px] tracking-tight text-ink-900">
          The questions worth{"\n"}
          <Text className="text-brand-600">asking us first.</Text>
        </Text>
      </View>

      <View className="mx-5 mt-3 overflow-hidden rounded-card bg-surface" style={shadow.e1}>
        {FAQ.map((item, i) => {
          const expanded = open === item.q;
          return (
            <View
              key={item.q}
              style={i > 0 ? { borderTopWidth: 1, borderTopColor: surface.line } : undefined}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={item.q}
                onPress={() => setOpen(expanded ? null : item.q)}
                className="flex-row items-center gap-3 px-3.5 py-3.5"
              >
                <Text className="min-w-0 flex-1 text-[13px] font-semibold leading-[18px] text-ink-900">
                  {item.q}
                </Text>
                {/*
                 * The chevron rotates rather than swapping to a minus: one
                 * shape moving reads as the same control in two states, two
                 * shapes read as two controls.
                 */}
                <ChevronDown
                  size={16}
                  color={expanded ? brand[600] : ink[300]}
                  style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
                />
              </Pressable>
              {expanded ? (
                <View className="px-3.5 pb-3.5">
                  <Text className="text-[12.5px] leading-[18px] text-ink-500">{item.a}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <View className="mx-5 mt-2 flex-row items-start gap-2">
        <FileText size={13} color={ink[300]} style={{ marginTop: 2 }} />
        <Text className="flex-1 text-[11.5px] leading-[16px] text-ink-500">
          Articles in <Brand ai /> cite the guidance they draw on. Nothing here is written to persuade you
          out of seeing someone.
        </Text>
      </View>
    </View>
  );
}
