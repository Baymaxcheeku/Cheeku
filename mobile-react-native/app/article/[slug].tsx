import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Bookmark, BookmarkCheck, ChevronLeft, ExternalLink, MessageCircle, MessageCircleQuestion, Share2, ShieldCheck } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Linking, ScrollView, Share, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { Pressable } from "@/components/ui/pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ArticleRow, CATEGORY_STYLE, Emblem, Eyebrow, type CategoryStyle } from "@/components/learn/parts";
import { GlassCircle, glass, glassShadow } from "@/components/ui/glass";
import { PillButton } from "@/components/ui/screen";
import { relatedTo, type ArticleBlock } from "@/lib/knowledge/catalog";
import { allArticles, articleBySlug, recordRead, setSaved } from "@/lib/knowledge/queries";
import { runOptimistic } from "@/lib/optimistic";
import { useFamily } from "@/lib/profiles/family";
import { shortDate } from "@/lib/records/details";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { Tap } from "@/components/ui/tap";
import { DetailSkeleton, ScreenSkeleton } from "@/components/ui/skeleton";
import { goBack } from "@/lib/nav/go-back";

/*
 * THE READER.
 *
 * Built like a good health explainer on paper: a masthead in the category's
 * colour with the article's emblem, a byline that says who wrote it and when
 * it was last checked, "In short" before the body for the reader who has
 * thirty seconds, then the body with a comfortable measure and leading.
 *
 * Questions to take to an appointment get their own card, because that is
 * the most useful thing a health article can leave someone holding. Related
 * reads come next, then the sources, which are part of the article: the
 * database will not publish one without them.
 *
 * Progress is remembered (migration 0029), so the rail on Home can say
 * "2 min left" and "Read", and the library can offer "Continue reading".
 */
export default function ArticleReader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const family = useFamily();
  const profileId = family.data?.profile?.id;

  const article = useQuery({ queryKey: ["article", slug], queryFn: () => articleBySlug(String(slug)), enabled: Boolean(slug) });
  const library = useQuery({ queryKey: ["learn", profileId], queryFn: () => allArticles(profileId), enabled: Boolean(profileId), staleTime: 60_000 });

  const [progress, setProgress] = useState(0);
  // Past the masthead, the bar gets a backdrop so text never runs under it.
  const [scrolled, setScrolled] = useState(false);
  const [saved, setSavedState] = useState<boolean | null>(null);
  const best = useRef(0);
  const sent = useRef(0);
  const id = article.data?.id;

  // Opening counts as starting; leaving sends how far they got.
  useEffect(() => {
    if (!id) return;
    void recordRead(id, 0.05);
    return () => {
      if (best.current > sent.current) void recordRead(id, best.current);
      void qc.invalidateQueries({ queryKey: ["knowledge-feed"] });
      void qc.invalidateQueries({ queryKey: ["learn"] });
    };
  }, [id, qc]);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const scrollable = Math.max(1, contentSize.height - layoutMeasurement.height);
    const p = Math.min(1, Math.max(0, contentOffset.y / scrollable));
    setProgress(p);
    setScrolled(contentOffset.y > 40);
    if (p > best.current) best.current = p;
    // Save at each quarter rather than on every frame.
    if (id && best.current - sent.current >= 0.25) {
      sent.current = best.current;
      void recordRead(id, best.current);
    }
  }

  if (article.isPending) {
    return (
      <ScreenSkeleton>
        <DetailSkeleton hero={260} />
      </ScreenSkeleton>
    );
  }

  const data = article.data;
  if (!data) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-10">
        <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[500], textAlign: "center" }}>
          That article isn&apos;t available. It may have been unpublished while it is updated.
        </Text>
        <Tap onPress={() => goBack(router, "/home")} style={{ marginTop: 18 }} hitSlop={8}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[600] }}>Go back</Text>
        </Tap>
      </View>
    );
  }

  const s = CATEGORY_STYLE[data.category];
  const isSaved = saved ?? data.read?.saved ?? false;
  const related = relatedTo(data, library.data ?? [], 3);

  function toggleSave() {
    if (!data) return;
    const id = data.id;
    const next = !isSaved;
    void runOptimistic({
      apply: () => setSavedState(next),
      revert: () => setSavedState(!next),
      write: () => setSaved(id, next),
      message: next ? "Couldn't save this article. Check your connection." : "Couldn't remove it from saved. Check your connection.",
      onSaved: () => void qc.invalidateQueries({ queryKey: ["learn"] }),
    });
  }

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView onScroll={onScroll} scrollEventThrottle={64} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* Masthead. */}
        <View style={{ backgroundColor: s.field, paddingTop: insets.top + 70, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: "hidden" }}>
          <View style={{ position: "absolute", top: insets.top + 40, right: -30, width: 180, height: 180, borderRadius: 999, backgroundColor: s.soft, opacity: 0.55 }} />
          <View style={{ paddingHorizontal: 20, paddingBottom: 26 }}>
            <Emblem icon={data.icon} category={data.category} size={68} />
            <View style={{ marginTop: 16 }}>
              <Eyebrow category={data.category} />
            </View>
            <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 28, lineHeight: 33, letterSpacing: -0.6, color: s.deep, marginTop: 6 }}>
              {data.title}
            </Text>
            {data.standfirst ? <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: s.body, marginTop: 8 }}>{data.standfirst}</Text> : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 }}>
              <View style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                <ShieldCheck size={14} color={s.accent} />
              </View>
              <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 13, color: s.body }}>
                {data.author}
                {data.reviewedOn ? ` · checked ${shortDate(data.reviewedOn)}` : ""} · {data.readMinutes} min read
              </Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          {data.keyPoints.length ? <InShort points={data.keyPoints} s={s} /> : null}
          {data.body.map((block, i) => (
            <Block key={i} block={block} s={s} title={data.title} />
          ))}

          <PillButton icon={<MessageCircle size={18} color="#fff" />} style={{ marginTop: 22 }} onPress={() => router.push({ pathname: "/ask", params: { q: `Help me understand this using my own reports: ${data.title}` } })}>
            Ask Cheeku about this
          </PillButton>
        </View>

        {related.length ? (
          <View style={{ marginTop: 30, paddingHorizontal: 20 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3, color: ink[900] }}>Read next</Text>
            <View style={{ marginTop: 4 }}>
              {related.map((c, i) => (
                <View key={c.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}>
                  <ArticleRow card={c} />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Sources are part of the article. */}
        <View style={{ marginHorizontal: 20, marginTop: 26 }}>
          <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[300] }}>Sources</Text>
          <View style={[glassShadow, { marginTop: 8, borderRadius: 24, overflow: "hidden", backgroundColor: glass.fillStrong, borderWidth: 1, borderColor: glass.rim }]}>
            {data.sources.map((source, i) => {
              const openable = Boolean(source.url);
              return (
                <Tap
                  key={`${source.publisher}-${i}`}
                  accessibilityRole={openable ? "link" : "text"}
                  accessibilityLabel={openable ? `${source.title}, ${source.publisher}. Opens in your browser` : `${source.title}, ${source.publisher}`}
                  onPress={openable ? () => void Linking.openURL(source.url as string) : undefined}
                  style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: font.semibold, fontSize: 13, lineHeight: 18, color: ink[900] }}>{source.title}</Text>
                    <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 2 }}>
                      {source.publisher}
                      {source.year ? ` · ${source.year}` : ""}
                    </Text>
                  </View>
                  {openable ? <ExternalLink size={15} color={ink[300]} /> : null}
                </Tap>
              );
            })}
          </View>
          <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[300], marginTop: 10 }}>
            {data.reviewedOn ? `Checked against these sources on ${shortDate(data.reviewedOn)}. ` : ""}This explains; it does not advise. Anything about your own treatment is a conversation for your doctor.
          </Text>
        </View>
      </ScrollView>

      {/* The bar: back, progress, save, share. Over the masthead, glass. */}
      <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: insets.top + 6, paddingBottom: 6, backgroundColor: scrolled ? surface.canvas : "transparent", borderBottomWidth: scrolled ? 1 : 0, borderBottomColor: surface.line }}>
        <View pointerEvents="box-none" style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 }}>
          <GlassCircle label="Go back" onPress={() => goBack(router, "/home")}>
            <ChevronLeft size={21} color={ink[900]} />
          </GlassCircle>
          <View style={{ flex: 1 }} />
          <GlassCircle label={isSaved ? "Saved. Tap to remove" : "Save for later"} onPress={toggleSave}>
            {isSaved ? <BookmarkCheck size={19} color={s.accent} /> : <Bookmark size={19} color={ink[900]} />}
          </GlassCircle>
          <GlassCircle label="Share" onPress={() => void Share.share({ title: data.title, message: `${data.title}\n\n${data.standfirst}\n\nFrom the Cheeku health desk.` }).catch(() => undefined)}>
            <Share2 size={18} color={ink[900]} />
          </GlassCircle>
        </View>
        <View style={{ height: 3, marginHorizontal: 20, marginTop: 10, borderRadius: 2, backgroundColor: progress > 0.01 ? "rgba(15,16,48,0.06)" : "transparent", overflow: "hidden" }}>
          <View style={{ width: `${Math.round(progress * 100)}%`, height: 3, backgroundColor: s.accent }} />
        </View>
      </View>
    </View>
  );
}

function InShort({ points, s }: { points: string[]; s: CategoryStyle }) {
  return (
    <View style={{ padding: 16, borderRadius: 24, backgroundColor: s.field, marginBottom: 18 }}>
      <Text style={{ fontFamily: font.medium, fontSize: 12, color: s.accent }}>In short</Text>
      <View style={{ gap: 10, marginTop: 10 }}>
        {points.map((p, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ width: 22, height: 22, borderRadius: 999, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: font.bold, fontSize: 12, color: s.accent }}>{i + 1}</Text>
            </View>
            <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 15, lineHeight: 20.5, color: s.deep }}>{p}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Block({ block, s, title }: { block: ArticleBlock; s: CategoryStyle; title: string }) {
  const router = useRouter();
  switch (block.type) {
    case "h":
      return <Text style={{ fontFamily: font.semibold, fontSize: 20, lineHeight: 25, letterSpacing: -0.3, color: ink[900], marginTop: 22, marginBottom: 8 }}>{block.text}</Text>;
    case "callout":
      // Emphasis about the subject, never a warning about the reader: the
      // category's accent, not amber.
      return (
        <View style={{ flexDirection: "row", gap: 12, marginVertical: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 24, backgroundColor: s.field }}>
          <View style={{ width: 3, borderRadius: 2, backgroundColor: s.accent }} />
          <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 15, lineHeight: 21.5, color: s.deep }}>{block.text}</Text>
        </View>
      );
    case "list":
      return (
        <View style={{ gap: 9, marginTop: 4, marginBottom: 10 }}>
          {block.items.map((item, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 11 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s.accent, marginTop: 9 }} />
              <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 24, color: ink[700] }}>{item}</Text>
            </View>
          ))}
        </View>
      );
    case "steps":
      return (
        <View style={{ gap: 12, marginVertical: 10 }}>
          {block.items.map((item, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ width: 26, height: 26, borderRadius: 999, backgroundColor: s.accent, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: "#fff" }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 24, color: ink[700] }}>{item}</Text>
            </View>
          ))}
        </View>
      );
    case "stat":
      return (
        <View style={{ marginVertical: 12, paddingVertical: 16, paddingHorizontal: 18, borderRadius: 24, borderWidth: 1, borderColor: s.soft }}>
          <Text style={{ fontFamily: font.bold, fontSize: 28, letterSpacing: -0.8, color: s.accent }}>{block.value}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: ink[700], marginTop: 2 }}>{block.label}</Text>
        </View>
      );
    case "questions":
      return (
        <View style={[glassShadow, { marginTop: 18, marginBottom: 6, padding: 16, borderRadius: 24, backgroundColor: "#fff" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: s.field, alignItems: "center", justifyContent: "center" }}>
              <MessageCircleQuestion size={18} color={s.accent} />
            </View>
            <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>Questions to take to your appointment</Text>
          </View>
          <View style={{ gap: 10, marginTop: 14 }}>
            {block.items.map((q, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 10, paddingTop: i ? 10 : 0, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}>
                <Text style={{ fontFamily: font.bold, fontSize: 15, color: s.accent }}>Q</Text>
                <Text selectable style={{ flex: 1, fontFamily: font.medium, fontSize: 15, lineHeight: 21, color: ink[900] }}>{q}</Text>
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/ask", params: { q: `Help me get ready for my appointment about: ${title}` } })}
            style={({ pressed }) => ({ marginTop: 14, height: 44, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? s.soft : s.field })}
          >
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: s.accent }}>Get ready with Cheeku</Text>
          </Pressable>
        </View>
      );
    case "p":
      return <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 25, color: ink[700], marginBottom: 12 }}>{block.text}</Text>;
  }
}
