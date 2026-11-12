import { Info, ShieldAlert, ShieldCheck, ShieldX, type LucideIcon } from "lucide-react-native";
import { Text, View } from "react-native";

import type { ProductAssessment, SafetyLevel } from "@/lib/ai/mock/scenarios";
import { ink, semantic, surface } from "@/theme/tokens";

const VERDICT_COPY: Record<SafetyLevel, string> = {
  safe: "Safe",
  caution: "Use with care",
  avoid: "Avoid",
};

/*
 * SEMANTIC COLOUR IS CORRECT HERE. The rule says green/amber/red carry health
 * meaning only, never decoration — and an ingredient-safety verdict is exactly
 * that kind of judgement, the same class as a lab value's severity.
 */
const TONE: Record<SafetyLevel, { icon: LucideIcon; fg: string; bg: string }> = {
  safe: { icon: ShieldCheck, fg: semantic.safeText, bg: semantic.safeBg },
  caution: { icon: ShieldAlert, fg: semantic.cautionText, bg: semantic.cautionBg },
  avoid: { icon: ShieldX, fg: semantic.dangerText, bg: semantic.dangerBg },
};

const DOT: Record<SafetyLevel, string> = {
  safe: semantic.safe,
  caution: semantic.caution,
  avoid: semantic.danger,
};

/**
 * The rich reply to a product-scenario question — an ingredient-safety
 * verdict, NOT a diagnosis and not a recommendation about the reader's
 * treatment. The disclaimer is part of the card rather than a footnote for
 * that reason.
 */
export function ProductAssessmentCard({ assessment }: { assessment: ProductAssessment }) {
  const tone = TONE[assessment.verdict];
  const Icon = tone.icon;

  return (
    <View className="min-w-0 gap-3">
      <View className="rounded-card p-3.5" style={{ backgroundColor: tone.bg }}>
        <Text className="text-2xs font-bold text-ink-500">
          Overall safety
        </Text>
        <View className="mt-1.5 flex-row items-start gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-pill bg-surface">
            <Icon size={20} color={tone.fg} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-lg font-bold" style={{ color: tone.fg }}>
              {VERDICT_COPY[assessment.verdict]}
            </Text>
            <Text className="mt-0.5 text-sm leading-[18px] text-ink-700">
              {assessment.verdictNote}
            </Text>
          </View>
        </View>

        {assessment.personas.length > 0 ? (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {assessment.personas.map((persona) => (
              <View
                key={persona.key}
                className="flex-1 rounded-tile bg-surface p-2.5"
                style={{ minWidth: "45%" }}
              >
                <Text className="text-xs font-semibold text-ink-900">{persona.label}</Text>
                <Text
                  className="mt-0.5 text-2xs font-medium"
                  style={{ color: TONE[persona.status].fg }}
                >
                  {VERDICT_COPY[persona.status]}
                </Text>
                <Text className="mt-0.5 text-2xs leading-tight text-ink-500">
                  {persona.note}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {assessment.ingredients.length > 0 ? (
        <View className="rounded-card bg-surface p-3.5" style={{ borderWidth: 1, borderColor: surface.line }}>
          <Text className="text-2xs font-bold text-ink-500">
            Ingredients
          </Text>
          <View className="mt-2 gap-2">
            {assessment.ingredients.map((ingredient) => (
              <View key={ingredient.name} className="flex-row items-start gap-2.5">
                <View
                  className="mt-1.5 h-2 w-2 rounded-pill"
                  style={{ backgroundColor: DOT[ingredient.status] }}
                />
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-semibold text-ink-900">
                    {ingredient.name}
                  </Text>
                  <Text className="text-xs leading-[16px] text-ink-500">
                    {ingredient.note}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/*
       * Only present when the reader's OWN declared conditions changed the
       * verdict. Never an inference from a document — matching a declared
       * allergy is a lookup, inferring one would be a diagnosis.
       */}
      {assessment.personalNote ? (
        <View className="rounded-card bg-brand-50 p-3.5">
          <Text className="text-xs font-bold text-brand-700">Because of your profile</Text>
          <Text className="mt-1 text-xs leading-[17px] text-ink-700">
            {assessment.personalNote}
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-start gap-2">
        <Info size={12} color={ink[300]} style={{ marginTop: 2 }} />
        <Text className="flex-1 text-2xs leading-[16px] text-ink-300">
          {assessment.disclaimer}
        </Text>
      </View>
    </View>
  );
}
