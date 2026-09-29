import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  MessageSquareWarning,
  ShieldCheck,
} from "lucide-react-native";
import { useState } from "react";
import { LayoutAnimation, Platform, Pressable, Text, UIManager, View } from "react-native";

import { Panel, SaveButton, Section, SettingsScreen } from "@/components/settings/chrome";
import { ChipSelect, Field } from "@/components/ui/field";
import { submitSupportTicket } from "@/lib/settings/actions";
import { SUPPORT_CATEGORIES } from "@/lib/settings/schemas";
import { brand, ink, shadow, surface } from "@/theme/tokens";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQS = [
  {
    q: "Is my health data shared with anyone?",
    a: "No. Cheeku never sells your data and never shares it outside your family. Only you can access your family's health information.",
  },
  {
    q: "Can Cheeku diagnose or prescribe anything?",
    a: "No. Cheeku explains what's in your own records and never invents a diagnosis, a dosage or a treatment. For medical decisions, always talk to a doctor.",
  },
  {
    q: "What happens if I switch to a paid plan?",
    a: "Solo unlocks unlimited Ask Cheeku chats for one profile. Family adds up to four members and shared insights. You can cancel anytime from your Profile screen.",
  },
  {
    q: "How do I delete my account?",
    a: "Open Profile, then Security & privacy, or scroll to the bottom of your Profile screen. Deleting removes every record, file and message. It cannot be undone.",
  },
] as const;

const CATEGORY_LABELS: Record<(typeof SUPPORT_CATEGORIES)[number], string> = {
  bug: "Something broke",
  not_working: "Not working right",
  billing: "Billing",
  account: "My account",
  feature: "Feature idea",
  other: "Something else",
};

const CATEGORY_OPTIONS = SUPPORT_CATEGORIES.map(
  (c) => [c, CATEGORY_LABELS[c]] as const,
);

export default function Help() {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState<number | null>(null);
  const [category, setCategory] = useState<(typeof SUPPORT_CATEGORIES)[number] | "">("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  function expand(index: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(open === index ? null : index);
  }

  async function send() {
    setPending(true);
    setErrors({});
    setMessage(null);
    try {
      const result = await submitSupportTicket({
        category: category as (typeof SUPPORT_CATEGORIES)[number],
        subject,
        body,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage(result.message);
        return;
      }
      setTicketId(result.ticketId ?? null);
      setSubject("");
      setBody("");
      setCategory("");
      await queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    } finally {
      setPending(false);
    }
  }

  if (ticketId) {
    return (
      <SettingsScreen
        title="Help & support"
        eyebrow="Guides, FAQs and reporting an issue"
        icon={CircleHelp}
      >
        <View className="mt-8 items-center px-8">
          <View
            className="h-16 w-16 items-center justify-center rounded-pill"
            style={{ backgroundColor: "#e7f7ee" }}
          >
            <CheckCircle2 size={32} color="#23af5f" />
          </View>
          <Text className="mt-4 text-[20px] font-bold text-ink-900">We&apos;ve got it</Text>
          <Text className="mt-2 text-center text-[13px] leading-[19px] text-ink-500">
            Your report is with our team. We reply by email, usually within two working days.
          </Text>
          {/*
           * The reference is shown because a support conversation that starts
           * "I reported something last week" with nothing to point at wastes
           * the reader's time and ours.
           */}
          <View className="mt-3 rounded-pill bg-surface px-3 py-1.5" style={shadow.e1}>
            <Text className="text-[11.5px] text-ink-500">
              Reference {ticketId.slice(0, 8).toUpperCase()}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => setTicketId(null)}
            className="mt-6"
            hitSlop={8}
          >
            <Text className="text-[13.5px] font-semibold text-brand-600">Report something else</Text>
          </Pressable>
        </View>
      </SettingsScreen>
    );
  }

  return (
    <SettingsScreen
      title="Help & support"
      eyebrow="Guides, FAQs and reporting an issue"
      icon={CircleHelp}
      footer={
        <SaveButton
          onPress={() => void send()}
          pending={pending}
          saved={false}
          label="Send report"
        />
      }
    >
      <Section label="FAQs">
        <View className="mx-5 overflow-hidden rounded-card bg-surface" style={shadow.e1}>
          {FAQS.map((faq, i) => {
            const expanded = open === i;
            return (
              <View
                key={faq.q}
                style={i > 0 ? { borderTopWidth: 1, borderTopColor: surface.line } : undefined}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  onPress={() => expand(i)}
                  className="flex-row items-center gap-3 p-3.5"
                >
                  <Text className="min-w-0 flex-1 text-[13.5px] font-semibold text-ink-900">
                    {faq.q}
                  </Text>
                  <View style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}>
                    <ChevronDown size={16} color={ink[300]} />
                  </View>
                </Pressable>
                {expanded ? (
                  <Text className="px-3.5 pb-3.5 text-[12.5px] leading-[19px] text-ink-500">
                    {faq.a}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </Section>

      <Section label="Report an issue">
        <View className="mt-1">
          <Panel>
            <View className="flex-row items-start gap-2">
              <MessageSquareWarning size={16} color={brand[500]} style={{ marginTop: 1 }} />
              <Text className="flex-1 text-[12px] leading-[17px] text-ink-500">
                {/*
                 * Says what is NOT collected, because the natural worry when
                 * describing a medical-app bug is that you are handing over
                 * your records to whoever reads the ticket. Nothing here
                 * touches them: this writes a category, a title, your text and
                 * the app version.
                 */}
                Goes straight to our team. We never attach your records, lab values or chats to a
                report.
              </Text>
            </View>
          </Panel>
        </View>

        <View className="mx-5 mt-4 gap-4">
          <ChipSelect
            label="What kind of problem?"
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={setCategory}
          />
          {errors.category ? (
            <Text accessibilityRole="alert" className="text-[12.5px] text-danger-text">
              {errors.category}
            </Text>
          ) : null}

          <Field
            label="Short title"
            placeholder="e.g. Upload fails on large PDFs"
            value={subject}
            onChangeText={setSubject}
            error={errors.subject}
          />

          <Field
            label="What happened?"
            placeholder="What you did, what you expected, and what happened instead."
            value={body}
            onChangeText={setBody}
            error={errors.body}
            multiline
            style={{ minHeight: 120, textAlignVertical: "top" }}
            hint="At least 20 characters, so we have something to work from."
          />
        </View>

        {message ? (
          <Text
            accessibilityRole="alert"
            className="mx-5 mt-3 text-[13px] font-medium text-danger-text"
          >
            {message}
          </Text>
        ) : null}
      </Section>

      <View className="mx-5 mt-6 flex-row items-start gap-2">
        <ShieldCheck size={14} color={ink[300]} style={{ marginTop: 2 }} />
        <Text className="flex-1 text-[11.5px] leading-[17px] text-ink-300">
          For anything urgent about your health, contact a doctor or your local emergency number.
          Cheeku support cannot give medical advice.
        </Text>
      </View>
    </SettingsScreen>
  );
}
