import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  BookOpenCheck,
  CircleHelp,
  CreditCard,
  FileStack,
  Lock,
  Mail,
  MessageCircleHeart,
  MessageSquareWarning,
  PhoneCall,
  Search,
  Users,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";

import { Tap } from "@/components/ui/tap";
import { MascotFigure } from "@/components/illustrations/sprout";
import { SettingsScreen } from "@/components/settings/chrome";
import { Body, Eyebrow, Questions, Title, type QA } from "@/components/settings/editorial";
import { Brand, brandify } from "@/components/ui/brand";
import { ChipSelect, Field } from "@/components/ui/field";
import { Gradient, glassShadow } from "@/components/ui/glass";
import { Reveal } from "@/components/ui/reveal";
import { PillButton } from "@/components/ui/screen";
import { APP_VERSION, SUPPORT_EMAIL } from "@/lib/app-meta";
import { submitSupportTicket } from "@/lib/settings/actions";
import { SUPPORT_CATEGORIES } from "@/lib/settings/schemas";
import { brand, ink, lilac, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * HELP CENTRE. Rebuilt 2026-10 from a five-question list into somewhere you
 * can actually find an answer:
 *
 *   hero       "How can we help?" with a search that filters every answer
 *   emergency  first, before any help article, because the one person who
 *              opens Help in a panic should not have to scroll
 *   topics     six tiles; tapping one narrows the questions to it
 *   questions  answers written the way you'd explain it to a friend
 *   contact    write to us, or report a problem in the app
 *
 * The ticket form keeps its old contract (category, title, text, app version;
 * never records or chats) and now has its own button instead of a pinned
 * footer, which on a reading page looked like it was asking you to save.
 *
 * Emergency red is health meaning (PLAN.md rule 3), so it is allowed here and
 * nowhere else on the page.
 */

type Topic = "start" | "ask" | "records" | "family" | "billing" | "privacy";

const TOPICS: { id: Topic; icon: LucideIcon; title: string; note: string }[] = [
  { id: "start", icon: BookOpenCheck, title: "Getting started", note: "Set up in a few minutes" },
  { id: "ask", icon: MessageCircleHeart, title: "Asking Cheeku", note: "Symptoms, urgency, notes" },
  { id: "records", icon: FileStack, title: "Records & uploads", note: "Reports, scans, readings" },
  { id: "family", icon: Users, title: "Family", note: "Members and their files" },
  { id: "billing", icon: CreditCard, title: "Plans & billing", note: "Upgrade, cancel, refunds" },
  { id: "privacy", icon: Lock, title: "Privacy & security", note: "Your data, your call" },
];

const HELP: Record<Topic, QA[]> = {
  start: [
    {
      q: "What is Cheeku, in one line?",
      a: "A health memory for your family. It keeps every report, reading and medicine in one place, and when something feels off it reads that against your own history and tells you how urgent it looks.",
    },
    {
      q: "What should I add first?",
      a: "Your most recent blood test and any medicines you take every day. That alone lets Cheeku spot trends and medicine overlaps. Older reports can come later.",
    },
    {
      q: "Do I need to fill in everything?",
      a: "No. Name, date of birth and sex are the only details that really matter, because labs use them to set normal ranges. Everything else makes answers sharper but is optional.",
    },
  ],
  ask: [
    {
      q: "Does Cheeku diagnose?",
      a: "No. It uses general health knowledge to understand a symptom up to a point, reads it against your own reports, readings and medicines, and tells you how urgent it looks. When a doctor is needed it says so plainly and writes out what to tell them. It never names a diagnosis or changes a dose.",
    },
    {
      q: "What do the four urgency levels mean?",
      a: "Fits the usual pattern: nothing points to a problem. Keep an eye on it: watch for specific changes. Call your doctor today: worth a same-day call. Go now: get seen immediately or call 112.",
    },
    {
      q: "What is the note for my doctor?",
      a: "When a visit makes sense, Cheeku writes a short summary with the symptom, when it started, the relevant readings and current medicines, so you don't have to remember it all in the room.",
    },
    {
      q: "Cheeku got a reading wrong. How do I fix it?",
      a: "Open the Memory page from the chat, tap the reading and correct it or forget it. Cheeku will use the corrected value from then on and says so if it changes an earlier answer.",
    },
  ],
  records: [
    {
      q: "What can I upload?",
      a: "Lab reports, prescriptions, discharge summaries, scan reports, vaccination cards, insurance papers and bills. Photos and PDFs both work.",
    },
    {
      q: "The values came out wrong after an upload.",
      a: "Blurry photos and handwritten reports are the usual cause. Delete the record and upload a flat, well-lit photo of each page, which fixes most of it. If it still reads wrong, report it below and we'll look.",
    },
    {
      q: "Can I move a record to another family member?",
      a: "Yes. Open the record, tap the menu and choose Move to. It leaves the first person's file completely.",
    },
  ],
  family: [
    {
      q: "Can my family see each other's records?",
      a: "Everyone on a Family plan lives in one account, but each person's file is separate. Answers about one person only ever use that person's records.",
    },
    {
      q: "How do I add someone?",
      a: "Tap your face at the top of Home to open the family tray, then tap Add someone. You can add their health basics and upload past reports in the same step. Family covers up to 4 people.",
    },
    {
      q: "What happens to members if I change plan?",
      a: "Anyone beyond your plan's limit is paused, not deleted. Their files are kept and come back as soon as you're on Family again.",
    },
  ],
  billing: [
    {
      q: "How do I cancel?",
      a: "Profile, then Your plan, then Cancel plan at the bottom. You keep what you paid for until the period ends. Nothing is deleted.",
    },
    {
      q: "What does the Daily Pass include?",
      a: "Unlimited chats for 24 hours with one payment. It ends by itself and never renews.",
    },
    {
      q: "I was charged but my plan didn't change.",
      a: "Close and reopen the app first. If it still shows the old plan, report a billing problem below with the payment reference and we'll sort it, usually the same day.",
    },
  ],
  privacy: [
    {
      q: "Is my health data shared with anyone?",
      a: "No. It isn't sold and isn't used for advertising. Only you can see your family's information inside your account.",
    },
    {
      q: "Can I download everything?",
      a: "Yes. Tap Export my data near the bottom of your Profile screen. You get every record and reading in a file you can keep or share with a doctor.",
    },
    {
      q: "How do I delete my account?",
      a: "Tap Delete my account at the very bottom of your Profile screen. It removes every record, file and message for everyone in the account, then your sign-in, and cannot be undone.",
    },
  ],
};

const ALL: (QA & { topic: Topic })[] = (Object.keys(HELP) as Topic[]).flatMap((t) => HELP[t].map((qa) => ({ ...qa, topic: t })));

const POPULAR = [HELP.ask[0], HELP.ask[1], HELP.privacy[0], HELP.billing[0], HELP.family[0]].filter((x): x is QA => Boolean(x));

const CATEGORY_LABELS: Record<(typeof SUPPORT_CATEGORIES)[number], string> = {
  bug: "Something broke",
  not_working: "Not working right",
  billing: "Billing",
  account: "My account",
  feature: "Feature idea",
  other: "Something else",
};

const CATEGORY_OPTIONS = SUPPORT_CATEGORIES.map((c) => [c, CATEGORY_LABELS[c]] as const);

export default function Help() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<Topic | null>(null);
  const [category, setCategory] = useState<(typeof SUPPORT_CATEGORIES)[number] | "">("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const results = q ? ALL.filter((x) => `${x.q} ${x.a}`.toLowerCase().includes(q)) : topic ? HELP[topic] : POPULAR;
  const heading = q ? (results.length ? `${results.length} ${results.length === 1 ? "answer" : "answers"}` : "No answers yet") : topic ? TOPICS.find((t) => t.id === topic)?.title ?? "" : "Most asked";

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
      <SettingsScreen title="Help & support" eyebrow="Answers, guides and our team" icon={CircleHelp} bare>
        <Reveal style={{ alignItems: "center", paddingHorizontal: 32, marginTop: 40 }}>
          <MascotFigure size={120} moment="present" move="sway" hop />
          <Text style={{ fontFamily: font.semibold, fontSize: 24, letterSpacing: -0.6, color: ink[900], marginTop: 18 }}>Got it, thank you</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[700], textAlign: "center", marginTop: 8 }}>
            A real person on our team will read this and reply by email, usually within two working days.
          </Text>
          {/*
           * The reference is shown because a support conversation that starts
           * "I reported something last week" with nothing to point at wastes
           * the reader's time and ours.
           */}
          <View style={[glassShadow, { marginTop: 16, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "#fff" }]}>
            <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>Reference {ticketId.slice(0, 8).toUpperCase()}</Text>
          </View>
          <Tap accessibilityRole="button" onPress={() => setTicketId(null)} hitSlop={8} style={{ marginTop: 26 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[600] }}>Back to help</Text>
          </Tap>
        </Reveal>
      </SettingsScreen>
    );
  }

  return (
    <SettingsScreen title="Help & support" eyebrow="Answers, guides and our team" icon={CircleHelp} bare>
      {/* -------------------------------------------------------- hero -- */}
      <Reveal style={[glassShadow, { marginHorizontal: 20, marginTop: 4, borderRadius: 32, overflow: "hidden", padding: 20 }]}>
        <Gradient from={lilac.violet} to="#ffffff" glow="#ffffff" />
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Eyebrow>Help centre</Eyebrow>
            <Text style={{ fontFamily: font.semibold, fontSize: 28, lineHeight: 32, letterSpacing: -0.8, color: ink[900], marginTop: 6 }}>How can we help?</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: ink[700], marginTop: 6 }}>Quick answers first. A real person if you need one.</Text>
          </View>
          <MascotFigure size={96} moment="shrug" move="float" hop />
        </View>
        <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 10, height: 50, paddingHorizontal: 16, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: surface.line }}>
          <Search size={18} color={ink[500]} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search, e.g. cancel, upload, family"
            placeholderTextColor={ink[300]}
            accessibilityLabel="Search help"
            returnKeyType="search"
            style={{ flex: 1, fontFamily: font.regular, fontSize: 15, color: ink[900], paddingVertical: 0 }}
          />
          {query ? (
            <Tap accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery("")} hitSlop={8}>
              <X size={17} color={ink[500]} />
            </Tap>
          ) : null}
        </View>
      </Reveal>

      {/* --------------------------------------------------- emergency -- */}
      <Reveal style={{ marginHorizontal: 20, marginTop: 14 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Health emergency. Call 112"
          onPress={() => void Linking.openURL("tel:112").catch(() => undefined)}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 24, backgroundColor: semantic.dangerBg, opacity: pressed ? 0.85 : 1 })}
        >
          <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: semantic.dangerStrong, alignItems: "center", justifyContent: "center" }}>
            <PhoneCall size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: semantic.dangerText }}>Health emergency? Call 112</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: ink[700], marginTop: 1 }}>Don&apos;t wait on a help article or a reply from us.</Text>
          </View>
        </Pressable>
      </Reveal>

      {/* ------------------------------------------------------ topics -- */}
      {q ? null : (
        <>
          <Reveal style={{ paddingHorizontal: 20, marginTop: 30 }}>
            <Eyebrow>Browse</Eyebrow>
            <Title>Pick a topic</Title>
          </Reveal>
          <Reveal style={{ marginHorizontal: 20, marginTop: 14, gap: 10 }}>
            {[0, 2, 4].map((i) => (
              <View key={i} style={{ flexDirection: "row", gap: 10 }}>
                {TOPICS.slice(i, i + 2).map((t) => (
                  <TopicTile key={t.id} {...t} selected={topic === t.id} onPress={() => setTopic(topic === t.id ? null : t.id)} />
                ))}
              </View>
            ))}
          </Reveal>
        </>
      )}

      {/* --------------------------------------------------- questions -- */}
      <Reveal style={{ paddingHorizontal: 20, marginTop: 28, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3, color: ink[900] }}>{heading}</Text>
        {topic && !q ? (
          <Tap accessibilityRole="button" onPress={() => setTopic(null)} hitSlop={8}>
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[600] }}>Show most asked</Text>
          </Tap>
        ) : null}
      </Reveal>
      <Reveal style={{ marginHorizontal: 20, marginTop: 12 }}>
        {results.length ? (
          <Questions key={`${topic ?? ""}|${q}`} items={results} />
        ) : (
          <View style={[glassShadow, { borderRadius: 24, backgroundColor: "#fff", padding: 18 }]}>
            <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[700] }}>
              Nothing matches &ldquo;{query.trim()}&rdquo;. Try a simpler word, or write to us below and we&apos;ll answer it ourselves.
            </Text>
          </View>
        )}
      </Reveal>

      {/* ----------------------------------------------------- contact -- */}
      <Reveal style={{ paddingHorizontal: 20, marginTop: 34 }}>
        <Eyebrow>Still stuck?</Eyebrow>
        <Title>Talk to a person</Title>
        <Body>Our team reads every message. We reply by email, usually within two working days.</Body>
      </Reveal>
      <Reveal style={{ marginHorizontal: 20, marginTop: 14, flexDirection: "row", gap: 10 }}>
        <ContactTile icon={Mail} title="Email us" note={SUPPORT_EMAIL} onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => undefined)} />
        <ContactTile icon={MessageCircleHeart} title="Ask Cheeku" note="About your health" onPress={() => router.push("/ask")} />
      </Reveal>

      <Reveal style={{ marginHorizontal: 20, marginTop: 14 }}>
        <View style={[glassShadow, { borderRadius: 32, backgroundColor: "#fff", padding: 18 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
              <MessageSquareWarning size={18} color={brand[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>Report a problem</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>Something broken, confusing or missing</Text>
            </View>
          </View>
          {/*
           * Says what is NOT collected, because the natural worry when
           * describing a medical-app bug is that you are handing over your
           * records to whoever reads the ticket. Nothing here touches them:
           * this writes a category, a title, your text and the app version.
           */}
          <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700], marginTop: 12, padding: 12, borderRadius: 16, backgroundColor: surface.tint }}>
            We never attach your records, lab values or chats to a report. Only what you type here and the app version.
          </Text>

          <View style={{ marginTop: 16, gap: 16 }}>
            <ChipSelect label="What kind of problem?" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
            {errors.category ? (
              <Text accessibilityRole="alert" style={{ fontFamily: font.regular, fontSize: 13, color: semantic.dangerText }}>
                {errors.category}
              </Text>
            ) : null}
            <Field label="Short title" placeholder="e.g. Upload fails on large PDFs" value={subject} onChangeText={setSubject} error={errors.subject} />
            <Field
              label="What happened?"
              placeholder="What you did, what you expected, and what happened instead."
              value={body}
              onChangeText={setBody}
              error={errors.body}
              multiline
              style={{ minHeight: 120, textAlignVertical: "top" }}
              hint="A couple of sentences is plenty."
            />
          </View>

          {message ? (
            <Text accessibilityRole="alert" style={{ fontFamily: font.medium, fontSize: 13, color: semantic.dangerText, marginTop: 12 }}>
              {message}
            </Text>
          ) : null}

          <PillButton tone="brand" loading={pending} onPress={() => void send()} style={{ marginTop: 18 }}>
            Send to our team
          </PillButton>
        </View>
      </Reveal>

      <Reveal style={{ alignItems: "center", marginTop: 24, paddingHorizontal: 32, gap: 4 }}>
        <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 18, color: ink[500], textAlign: "center" }}>
          <Brand /> support can help with the app, not with medical advice. For anything urgent about your health, call a doctor or 112.
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[300] }}>Version {APP_VERSION}</Text>
      </Reveal>
    </SettingsScreen>
  );
}

function TopicTile({ icon: Icon, title, note, selected, onPress }: { icon: LucideIcon; title: string; note: string; selected: boolean; onPress: () => void }) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[glassShadow, {
        flex: 1,
        padding: 14,
        borderRadius: 24,
        backgroundColor: selected ? brand[600] : "#fff",
      }]}
    >
      <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: selected ? "rgba(255,255,255,0.18)" : brand[50] }}>
        <Icon size={18} color={selected ? "#fff" : brand[600]} />
      </View>
      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: selected ? "#fff" : ink[900], marginTop: 10 }}>{brandify(title, { onDark: selected })}</Text>
      <Text style={{ fontFamily: font.regular, fontSize: 12, color: selected ? "rgba(255,255,255,0.8)" : ink[500], marginTop: 2 }}>{note}</Text>
    </Tap>
  );
}

function ContactTile({ icon: Icon, title, note, onPress }: { icon: LucideIcon; title: string; note: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [glassShadow, { flex: 1, padding: 14, borderRadius: 24, backgroundColor: pressed ? brand[50] : "#fff", gap: 8 }]}
    >
      <Icon size={19} color={brand[600]} />
      <View>
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{brandify(title)}</Text>
        <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 2 }}>{note}</Text>
      </View>
    </Pressable>
  );
}
