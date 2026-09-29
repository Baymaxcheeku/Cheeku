import { useRouter } from "expo-router";
import { ArrowRight, ChevronLeft, Lock } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MascotBust } from "@/components/illustrations/sprout";
import { BubblePop, Bob, FillBar } from "@/components/onboarding/motion";
import { brand, ink, shadow, surface } from "@/theme/tokens";
import { font, type } from "@/theme/type";

/*
 * The pieces every onboarding screen shares.
 *
 * The header owns the top inset, because it is the topmost element on every
 * screen that uses it and keeping it in one component means the next screen
 * cannot forget it.
 */

/**
 * The four steps after sign-up, as one short quest.
 *
 * Numbered and named, because "Step 2 of 4" answers the only question a person
 * has halfway through a setup flow — how much is left — and a named step says
 * what this one is for before they read a word of it.
 *
 * `/plan` is not a step. It only appears for family accounts, and a bar that
 * sometimes has five segments and sometimes four is a bar that lies to half
 * the people reading it.
 */
export const SETUP_STEPS = ["Who it's for", "About you", "Your season", "Your first report"] as const;

export function OnboardingHeader({
  back,
  action,
  step,
}: {
  /** Where the chevron goes when there is nothing to pop. Omit for no chevron. */
  back?: string;
  action?: { label: string; href: string };
  /** 1-based position in SETUP_STEPS. Omit on screens outside the quest. */
  step?: number;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  /*
   * `back()` throws GO_BACK when this screen is the first history entry, which
   * it is on a cold launch or a deep link. Falling back to the route the flow
   * came from keeps the control honest instead of surfacing an error.
   */
  function goBack() {
    if (router.canGoBack()) router.back();
    else if (back) router.replace(back as never);
  }

  const total = SETUP_STEPS.length;

  return (
    <View style={{ marginTop: insets.top }} className="px-5 pt-1">
      <View className="h-11 flex-row items-center gap-3">
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={goBack}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-pill bg-surface"
            style={shadow.e1}
          >
            <ChevronLeft size={20} color={ink[700]} />
          </Pressable>
        ) : (
          <View className="h-10 w-10" />
        )}

        {step ? (
          <View
            className="flex-1"
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`Step ${step} of ${total}, ${SETUP_STEPS[step - 1]}`}
            accessibilityValue={{ min: 0, max: total, now: step }}
          >
            <FillBar value={step / total} color={brand[600]} track={brand[100]} height={8} />
          </View>
        ) : (
          <View className="flex-1" />
        )}

        {action ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => router.push(action.href as never)}
            className="h-10 min-w-10 items-end justify-center"
          >
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[500] }}>
              {action.label}
            </Text>
          </Pressable>
        ) : (
          <View className="h-10 w-10" />
        )}
      </View>

    </View>
  );
}

/**
 * "Step 2 of 4 · About you", above the headline.
 *
 * Lives in the scrolling content rather than the fixed header: pinned, it sat
 * directly on top of whatever scrolled beneath it. The bar in the header
 * already carries the same information for screen readers, so this is hidden
 * from them to avoid announcing it twice.
 */
export function StepLabel({ step }: { step: number }) {
  return (
    <Text
      style={[type.eyebrow, { color: brand[600], marginBottom: 8 }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      Step {step} of {SETUP_STEPS.length} · {SETUP_STEPS[step - 1]}
    </Text>
  );
}

/**
 * The lock line. Trust is a recurring element in this flow, not a one-off, so
 * it sits in the same place on every screen that asks for something.
 */
export function ReassuranceStrip({ children }: { children?: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-center gap-2 px-2">
      <Lock size={12} color={ink[300]} />
      <Text style={[type.caption, { color: ink[300], textAlign: "center", flexShrink: 1 }]}>
        {children ?? "Encrypted. Only you and your family can see it."}
      </Text>
    </View>
  );
}

/** Kept for `/plan`, which sits outside the numbered quest. */
export function Dots({ current, total }: { current: number; total: number }) {
  return (
    <View className="flex-row items-center justify-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            height: 6,
            width: i === current ? 20 : 6,
            borderRadius: 999,
            backgroundColor: i === current ? brand[600] : brand[200],
          }}
        />
      ))}
    </View>
  );
}

/**
 * The onboarding headline. Inter SemiBold, with the second half in brand violet.
 *
 * The accent carries the emotional half of the sentence ("the awkward ones",
 * "that one report"), so the eye lands on what the screen is actually offering.
 */
export function Headline({
  lead,
  accent,
  size = "title",
  breakLine = true,
}: {
  lead: string;
  accent: string;
  size?: "hero" | "title";
  /** Force the accent onto its own line. On by default for setup screens. */
  breakLine?: boolean;
}) {
  return (
    <Text accessibilityRole="header" style={type[size]}>
      {lead}
      {breakLine ? "\n" : " "}
      <Text style={{ color: brand[600] }}>{accent}</Text>
    </Text>
  );
}

/** Body copy under a headline. */
export function Lede({ children }: { children: React.ReactNode }) {
  return <Text style={[type.body, { marginTop: 10 }]}>{children}</Text>;
}

/** The primary button's label: text plus the forward arrow, in one place. */
export function CtaLabel({ children, arrow = true }: { children: string; arrow?: boolean }) {
  return (
    <>
      <Text style={type.button}>{children}</Text>
      {arrow ? <ArrowRight size={18} color="#ffffff" /> : null}
    </>
  );
}

/**
 * Cheeku, reacting.
 *
 * The companion's voice runs through the whole setup: every choice gets a
 * small reply, so answering feels like talking to someone rather than filling
 * in a form. Keyed on the text, so a new reaction pops in as a new message.
 *
 * WHAT A REACTION MAY SAY. Warmth, encouragement, what happens next. Never an
 * opinion about the reader's health — a reply to "Caring for a parent" can say
 * the files will be kept safe; it cannot say anything about the parent.
 *
 * Announced politely to screen readers, because it is a response to their
 * action and they would otherwise never know it happened.
 */
export function CheekuSays({ children, size = 46 }: { children: string; size?: number }) {
  return (
    <View className="flex-row items-end gap-2">
      <Bob>
        <MascotBust size={size} />
      </Bob>
      <BubblePop key={children} from="left" style={{ flexShrink: 1 }}>
        <View
          accessibilityLiveRegion="polite"
          className="rounded-[18px] bg-surface px-3.5 py-2.5"
          style={[shadow.e1, { borderBottomLeftRadius: 6, borderWidth: 1, borderColor: surface.line }]}
        >
          <Text style={{ fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: ink[700] }}>
            {children}
          </Text>
        </View>
      </BubblePop>
    </View>
  );
}
