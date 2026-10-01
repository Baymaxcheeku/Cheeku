import { supabase } from "@/lib/supabase/client";

import { matchesReader, rankFeed, toArticle, toCard, toReadState, type Article, type ArticleCard, type ReadState } from "./catalog";

export type { Article, ArticleBlock, ArticleCard, ArticleCategory, ArticleIcon, ArticleSource, ReadState } from "./catalog";

/*
 * The knowledge feed: what the team publishes, ranked for one reader.
 *
 * ┌─ HOW AN ARTICLE IS CHOSEN, AND WHAT IS NEVER USED TO CHOOSE IT ──────────┐
 * │                                                                          │
 * │ USED: the conditions the reader typed into their OWN health profile, and │
 * │ the journey they picked during onboarding.                               │
 * │                                                                          │
 * │ NEVER USED: anything read out of their documents. Showing somebody       │
 * │ diabetes articles because a lab value came back high is a diagnosis      │
 * │ delivered as a content recommendation. Same line as profileConditions    │
 * │ holds for the chat.                                                      │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Every read tolerates a database that hasn't had migration 0029 yet: the new
 * columns are asked for first, and on "column does not exist" the old set is
 * used, so the rail and the reader keep working through the upgrade.
 */

const CARD_COLUMNS: string = "id, slug, title, standfirst, tint, read_minutes, journeys, conditions, published_at";
const CARD_COLUMNS_V2: string = `${CARD_COLUMNS}, category, icon, featured`;
const ARTICLE_COLUMNS: string = "id, slug, title, standfirst, tint, read_minutes, body, sources, reviewed_on, published_at";
const ARTICLE_COLUMNS_V2: string = `${ARTICLE_COLUMNS}, category, icon, featured, key_points, author`;

const missingColumn = (message: string | undefined) => Boolean(message && /column .* does not exist|could not find .* column/i.test(message));

/** This account's reading history, by article id. Empty before 0029. */
export async function readingHistory(): Promise<Map<string, ReadState>> {
  const out = new Map<string, ReadState>();
  const { data, error } = await supabase.from("article_reads").select("article_id, progress, saved, finished_at, opened_at").order("opened_at", { ascending: false });
  if (error || !data) return out;
  for (const row of data) out.set(String(row.article_id), toReadState(row));
  return out;
}

/** Every published article as a card, marked for this member and this reader. */
export async function allArticles(profileId: string | undefined): Promise<ArticleCard[]> {
  const [signals, history] = await Promise.all([profileSignalsFor(profileId), readingHistory()]);

  let res = await supabase.from("articles").select(CARD_COLUMNS_V2).not("published_at", "is", null).order("published_at", { ascending: false }).limit(60);
  if (res.error && missingColumn(res.error.message)) {
    res = await supabase.from("articles").select(CARD_COLUMNS).not("published_at", "is", null).order("published_at", { ascending: false }).limit(60);
  }
  if (res.error || !res.data) return [];

  return (res.data as unknown as Record<string, unknown>[]).map((row) =>
    toCard(row, matchesReader(row, signals.conditions, signals.journey), history.get(String(row.id)) ?? null),
  );
}

/** Up to `limit` for the rail on Home: for-you and unread first. */
export async function knowledgeFeed(profileId: string | undefined, limit = 6): Promise<ArticleCard[]> {
  return rankFeed(await allArticles(profileId)).slice(0, limit);
}

/** One article, with its body, sources and this reader's progress. */
export async function articleBySlug(slug: string): Promise<Article | null> {
  let res = await supabase.from("articles").select(ARTICLE_COLUMNS_V2).eq("slug", slug).not("published_at", "is", null).maybeSingle();
  if (res.error && missingColumn(res.error.message)) {
    res = await supabase.from("articles").select(ARTICLE_COLUMNS).eq("slug", slug).not("published_at", "is", null).maybeSingle();
  }
  if (res.error || !res.data) return null;
  const row = res.data as unknown as Record<string, unknown>;
  const { data: read } = await supabase.from("article_reads").select("progress, saved, finished_at").eq("article_id", String(row.id)).maybeSingle();
  return toArticle(row, read ? toReadState(read) : null);
}

/** How far down the reader got. Only ever moves forward (migration 0029). */
export async function recordRead(articleId: string, progress: number): Promise<void> {
  await supabase.rpc("record_article_read", { p_article: articleId, p_progress: Math.round(progress * 100) / 100 });
}

export async function setSaved(articleId: string, saved: boolean): Promise<boolean> {
  const { error } = await supabase.rpc("set_article_saved", { p_article: articleId, p_saved: saved });
  return !error;
}

/**
 * The two signals, both of them the reader's own words: the conditions they
 * typed into their profile and the journey tile they tapped. Neither is ever
 * inferred from a document.
 */
export async function profileSignalsFor(profileId: string | undefined): Promise<{ conditions: string[]; journey: string | null }> {
  if (!profileId) return { conditions: [], journey: null };
  const { data } = await supabase.from("profiles").select("conditions, journey").eq("id", profileId).maybeSingle();
  const conditions = data?.conditions;
  return {
    conditions: Array.isArray(conditions) ? (conditions as string[]).map((c) => c.toLowerCase()) : [],
    journey: (data?.journey as string | null) ?? null,
  };
}
