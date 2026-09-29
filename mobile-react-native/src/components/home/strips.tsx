import { useRouter } from "expo-router";
import { BookOpen, ChevronRight, FileText, FolderHeart, HeartPulse, ShieldCheck } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

import { PressRow } from "@/components/ui/motion";
import type { ArticleCard } from "@/lib/knowledge/queries";
import type { HealthOverview } from "@/lib/records/overview";
import { brand, ink, semantic, shadow, surface } from "@/theme/tokens";
import { font, type } from "@/theme/type";

/*
 * The small blocks on Home. Each is ONE line tall on purpose: they are pointers
 * to other screens, and the screen's height belongs to Ask Cheeku.
 */

/**
 * The priority pill. One sentence about the active member's file, in the
 * colour of what it says.
 *
 * Semantic colour is correct here and only here on Home: this pill states how
 * the records read (all in range, or some to review), which is exactly what
 * green and red are reserved for.
 *
 * It never invents a due date or a reminder. Scheduling does not exist, and a
 * made-up "time for your thyroid test" is a fabricated clinical prompt.
 */
export function PriorityPill({
  total,
  needsReview,
  topRecordId,
  latest,
}: {
  total: number;
  needsReview: number;
  topRecordId?: string;
  latest?: string;
}) {
  const router = useRouter();

  const c =
    total === 0
      ? { title: "Add your first report", meta: "Takes a minute", href: "/scan", Icon: FileText, fg: brand[700], bg: brand[50], dot: brand[600] }
      : needsReview === 0
        ? { title: "Everything is in range", meta: `${total} ${total === 1 ? "record" : "records"}`, href: "/records", Icon: ShieldCheck, fg: semantic.safeText, bg: semantic.safeBg, dot: semantic.safe }
        : {
            title: `${needsReview} ${needsReview === 1 ? "record" : "records"} worth a look`,
            meta: latest ?? "Tap to see",
            href: topRecordId ? `/records/${topRecordId}` : "/records",
            Icon: HeartPulse,
            fg: semantic.dangerText,
            bg: semantic.dangerBg,
            dot: semantic.danger,
          };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${c.title}. ${c.meta}`}
      onPress={() => router.push(c.href as never)}
      className="mx-5 mt-4 flex-row items-center gap-2.5 self-start rounded-pill py-2 pl-2 pr-3.5"
      style={{ backgroundColor: c.bg }}
    >
      <View className="h-7 w-7 items-center justify-center rounded-pill bg-surface">
        <c.Icon size={14} color={c.dot} />
      </View>
      <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: c.fg }}>{c.title}</Text>
      <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: c.fg, opacity: 0.75 }} numberOfLines={1}>
        · {c.meta}
      </Text>
      <ChevronRight size={15} color={c.fg} />
    </Pressable>
  );
}

/**
 * Worth knowing, as thin pills.
 *
 * It was a rail of full colour-blocked cards that took a third of the screen
 * for something most people read once a week. A pill with the title and the
 * minutes is enough to decide whether to tap, which is the only decision this
 * block exists to prompt.
 */
export function ReadsStrip({ articles }: { articles: readonly ArticleCard[] }) {
  const router = useRouter();
  if (articles.length === 0) return null;

  return (
    <View className="mt-5">
      <Text style={[type.eyebrow, { color: ink[300], paddingHorizontal: 20 }]}>Worth knowing</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 10, gap: 8 }}
      >
        {articles.map((a, i) => (
          <PressRow key={a.id} index={i} onPress={() => router.push(`/article/${a.slug}`)}>
            <View
              accessibilityRole="button"
              accessibilityLabel={`${a.title}. ${a.readMinutes} minute read`}
              className="max-w-[270px] flex-row items-center gap-2 rounded-pill bg-surface py-2.5 pl-3 pr-3.5"
              style={{ borderWidth: 1, borderColor: surface.line }}
            >
              <BookOpen size={14} color={brand[500]} />
              <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: font.medium, fontSize: 13, color: ink[700] }}>
                {a.title}
              </Text>
              <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[300] }}>{a.readMinutes}m</Text>
            </View>
          </PressRow>
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * The health file, as one row.
 *
 * The full summary lives at /health-file. On Home it only needs to say that
 * the file exists and how big it is.
 */
export function FileStrip({ overview }: { overview: HealthOverview }) {
  const router = useRouter();
  const docs = overview.totalDocuments;
  const meds = overview.medications.length;
  const meta =
    docs === 0
      ? "Nothing filed yet"
      : `${docs} ${docs === 1 ? "document" : "documents"} · ${overview.dataPoints} values · ${meds} ${meds === 1 ? "medicine" : "medicines"}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Health file. ${meta}`}
      onPress={() => router.push("/health-file")}
      className="mx-5 mt-3 flex-row items-center gap-3 rounded-[20px] bg-surface px-4 py-3.5"
      style={shadow.e1}
    >
      <View className="h-10 w-10 items-center justify-center rounded-[13px]" style={{ backgroundColor: brand[50] }}>
        <FolderHeart size={19} color={brand[600]} />
      </View>
      <View className="min-w-0 flex-1">
        <Text style={type.label}>Health file</Text>
        <Text numberOfLines={1} style={[type.caption, { marginTop: 1 }]}>
          {meta}
        </Text>
      </View>
      <ChevronRight size={17} color={ink[300]} />
    </Pressable>
  );
}
