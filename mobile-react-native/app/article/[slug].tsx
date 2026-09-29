import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Clock3, ExternalLink, ShieldCheck } from "lucide-react-native";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { articleBySlug, type ArticleBlock, type ArticleTint } from "@/lib/knowledge/queries";
import { glass, glassShadow } from "@/components/ui/glass";
import { brand, ink, surface } from "@/theme/tokens";

/*
 * The same washes as the rail, so opening a panel feels like entering it.
 *
 * Deliberately NOT the saturated version this started as. A full-bleed
 * masthead in deep rose with translucent white body copy was the least legible
 * surface in the app, and on a light product it read as a different app's
 * screen. Pale field, ink on light, accent reserved for the one element that
 * should lead.
 */
const TINTS: Record<ArticleTint, { field: string; accent: string; title: string; body: string }> = {
  violet: { field: "#eeecff", accent: "#4a2ade", title: "#231a52", body: "#5b5580" },
  teal: { field: "#e4f5f2", accent: "#0e8478", title: "#123f3a", body: "#4a6f69" },
  amber: { field: "#fdf0dc", accent: "#a9631a", title: "#4a2f0d", body: "#77603f" },
  rose: { field: "#fdeaf0", accent: "#c4396c", title: "#4d1730", body: "#7d5566" },
  indigo: { field: "#e9eaf7", accent: "#3835a0", title: "#1d1c4d", body: "#575682" },
};

/**
 * The reader.
 *
 * Long-form health writing, so the typography does the work: a measure that
 * does not run the full width, generous leading, and headings that separate by
 * weight and space rather than by rules and boxes.
 *
 * THE SOURCES ARE PART OF THE ARTICLE, not a footer nobody reads. They sit in
 * their own block, each one tappable through to the publisher, because a claim
 * about anaemia in pregnancy that cannot be checked is worth less than no claim
 * at all — and because the database will not let an article exist without them.
 */
export default function ArticleReader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const article = useQuery({
    queryKey: ["article", slug],
    queryFn: () => articleBySlug(String(slug)),
    enabled: Boolean(slug),
  });

  if (article.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={brand[600]} />
      </View>
    );
  }

  const data = article.data;
  if (!data) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-10">
        <Text className="text-center text-[15px] text-ink-500">
          That article isn&apos;t available. It may have been unpublished while it is updated.
        </Text>
        <Pressable onPress={() => router.back()} className="mt-5" hitSlop={8}>
          <Text className="text-[14px] font-semibold text-brand-600">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const tint = TINTS[data.tint] ?? TINTS.violet;

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* The masthead carries the article's own colour through from the rail,
            so opening one feels like entering the panel rather than leaving it. */}
        <View style={{ backgroundColor: tint.field, paddingTop: insets.top + 8, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: "hidden" }}>
          <View className="px-5 pb-6">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))}
              hitSlop={10}
              className="h-12 w-12 items-center justify-center rounded-pill"
              style={[glassShadow, { backgroundColor: glass.fillStrong, borderWidth: 1, borderColor: glass.rim }]}
            >
              <ChevronLeft size={21} color={ink[900]} />
            </Pressable>

            {/* Semibold at 26 rather than bold at 27: a headline this long
                gains nothing from the extra weight and loses the calm. */}
            <Text
              className="mt-5 text-[26px] font-semibold leading-[31px]"
              style={{ color: tint.title, letterSpacing: -0.4 }}
            >
              {data.title}
            </Text>
            <Text className="mt-2 text-[13.5px] leading-[20px]" style={{ color: tint.body }}>
              {data.standfirst}
            </Text>

            <View className="mt-3.5 flex-row items-center gap-1.5">
              <Clock3 size={13} color={tint.body} />
              <Text className="text-[12px]" style={{ color: tint.body }}>
                {data.readMinutes} min read
              </Text>
            </View>
          </View>
        </View>

        <View className="px-5 pt-5">
          {data.body.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </View>

        {/* ------------------------------------------------------- sources -- */}
        <View className="mx-5 mt-7">
          <Text className="text-[12px] font-bold uppercase tracking-wide text-ink-300">
            Sources
          </Text>
          <View className="mt-2 overflow-hidden rounded-[26px]" style={[glassShadow, { backgroundColor: glass.fillStrong, borderWidth: 1, borderColor: glass.rim }]}>
            {data.sources.map((source, i) => {
              const openable = Boolean(source.url);
              return (
                <Pressable
                  key={`${source.publisher}-${i}`}
                  accessibilityRole={openable ? "link" : "text"}
                  accessibilityLabel={
                    openable
                      ? `${source.title}, ${source.publisher}. Opens in your browser`
                      : `${source.title}, ${source.publisher}`
                  }
                  onPress={openable ? () => void Linking.openURL(source.url as string) : undefined}
                  className="flex-row items-start gap-3 px-3.5 py-3"
                  style={i > 0 ? { borderTopWidth: 1, borderTopColor: surface.line } : undefined}
                >
                  <View className="min-w-0 flex-1">
                    <Text className="text-[13px] font-semibold leading-[18px] text-ink-900">
                      {source.title}
                    </Text>
                    <Text className="mt-0.5 text-[11.5px] text-ink-500">
                      {source.publisher}
                      {source.year ? ` · ${source.year}` : ""}
                    </Text>
                  </View>
                  {openable ? <ExternalLink size={15} color={ink[300]} /> : null}
                </Pressable>
              );
            })}
          </View>

          <View className="mt-3 flex-row items-start gap-2">
            <ShieldCheck size={14} color={ink[300]} style={{ marginTop: 1 }} />
            <Text className="flex-1 text-[11.5px] leading-[17px] text-ink-300">
              Checked against these sources on{" "}
              {new Date(data.reviewedOn).toLocaleDateString(undefined, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              . This explains, it does not advise. Anything about your own treatment is a
              conversation for your doctor.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Block({ block }: { block: ArticleBlock }) {
  if (block.type === "h") {
    return (
      <Text className="mb-2 mt-6 text-[17px] font-semibold leading-[23px] text-ink-900">
        {block.text}
      </Text>
    );
  }

  if (block.type === "callout") {
    /*
     * The one place an article raises its voice. Brand, not amber: amber is
     * caution about the reader's own health, and a callout here is emphasis
     * about the subject, not a warning about them.
     */
    return (
      <View className="my-3 flex-row gap-3 rounded-card bg-brand-50 px-4 py-3.5">
        <View style={{ width: 3, borderRadius: 999, backgroundColor: brand[500] }} />
        <Text className="flex-1 text-[13.5px] font-medium leading-[20px] text-ink-900">
          {block.text}
        </Text>
      </View>
    );
  }

  if (block.type === "list") {
    return (
      <View className="mb-1 mt-2 gap-2">
        {block.items.map((item, i) => (
          <View key={i} className="flex-row gap-2.5">
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 999,
                backgroundColor: brand[400],
                marginTop: 8,
              }}
            />
            <Text className="flex-1 text-[14.5px] leading-[23px] text-ink-700">{item}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <Text className="mb-3 text-[14.5px] leading-[23px] text-ink-700">{block.text}</Text>
  );
}
