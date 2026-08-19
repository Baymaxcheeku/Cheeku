import { activeProfile } from "@/lib/profiles/context";
import { supabase } from "@/lib/supabase/client";

/*
 * The knowledge feed.
 *
 * ┌─ HOW AN ARTICLE IS CHOSEN, AND WHAT IS NEVER USED TO CHOOSE IT ──────────┐
 * │                                                                          │
 * │ USED: the conditions the reader typed into their OWN health profile, and │
 * │ the journey they picked during onboarding.                               │
 * │                                                                          │
 * │ NEVER USED: anything read out of their documents. Showing somebody       │
 * │ diabetes articles because a lab value came back high is a diagnosis      │
 * │ delivered as a content recommendation — the app would be telling them    │
 * │ what it thinks they have, while pretending to be a reading list. This is │
 * │ the same line `profileConditions` holds for the chat, and it holds here. │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

export type ArticleTint = "violet" | "teal" | "amber" | "rose" | "indigo";

export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "callout"; text: string }
  | { type: "list"; items: string[] };

export type ArticleSource = {
  publisher: string;
  title: string;
  year?: string;
  url?: string;
};

export type ArticleCard = {
  id: string;
  slug: string;
  title: string;
  standfirst: string;
  tint: ArticleTint;
  readMinutes: number;
  /** True when it matched this reader rather than arriving as a general pick. */
  forYou: boolean;
};

export type Article = Omit<ArticleCard, "forYou"> & {
  body: ArticleBlock[];
  sources: ArticleSource[];
  reviewedOn: string;
};

const CARD_COLUMNS = "id, slug, title, standfirst, tint, read_minutes, journeys, conditions";

function toCard(row: Record<string, unknown>, forYou: boolean): ArticleCard {
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    standfirst: row.standfirst as string,
    tint: (row.tint as ArticleTint) ?? "violet",
    readMinutes: Number(row.read_minutes ?? 3),
    forYou,
  };
}

/**
 * Up to `limit` articles for the banner rail.
 *
 * Matches first, then fills from everything else. Filling matters: a reader
 * who has declared nothing would otherwise see an empty section, and an empty
 * section on Home reads as a broken app rather than a personalisation gap.
 */
export async function knowledgeFeed(limit = 3): Promise<ArticleCard[]> {
  const profile = await activeProfile();

  /*
   * Conditions are compared lowercased. Somebody types "Type 2 Diabetes",
   * somebody else types "type 2 diabetes", and an exact match would show the
   * second reader nothing.
   */
  const { conditions: declared, journey } = await profileSignalsFor(profile?.id);
  const journeys = journey ? [journey] : [];

  const { data, error } = await supabase
    .from("articles")
    .select(CARD_COLUMNS)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(24);

  if (error || !data) return [];

  const matched: ArticleCard[] = [];
  const rest: ArticleCard[] = [];

  for (const row of data) {
    const rowConditions = ((row.conditions as string[] | null) ?? []).map((c) => c.toLowerCase());
    const rowJourneys = (row.journeys as string[] | null) ?? [];

    const hit =
      rowConditions.some((c) => declared.includes(c)) ||
      rowJourneys.some((j) => journeys.includes(j));

    (hit ? matched : rest).push(toCard(row, hit));
  }

  return [...matched, ...rest].slice(0, limit);
}

/** One article, with its body and sources. */
export async function articleBySlug(slug: string): Promise<Article | null> {
  const { data, error } = await supabase
    .from("articles")
    .select("id, slug, title, standfirst, tint, read_minutes, body, sources, reviewed_on")
    .eq("slug", slug)
    .not("published_at", "is", null)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id as string,
    slug: data.slug as string,
    title: data.title as string,
    standfirst: data.standfirst as string,
    tint: (data.tint as ArticleTint) ?? "violet",
    readMinutes: Number(data.read_minutes ?? 3),
    body: (data.body as ArticleBlock[] | null) ?? [],
    sources: (data.sources as ArticleSource[] | null) ?? [],
    reviewedOn: data.reviewed_on as string,
  };
}

/**
 * The two signals, both of them the reader's own words.
 *
 * `conditions` is what they typed into their health profile. `journey` is the
 * tile they tapped during onboarding — a personalisation hint, never a
 * diagnosis. Neither is inferred from a document.
 */
export async function profileSignalsFor(
  profileId: string | undefined,
): Promise<{ conditions: string[]; journey: string | null }> {
  if (!profileId) return { conditions: [], journey: null };

  const { data } = await supabase
    .from("profiles")
    .select("conditions, journey")
    .eq("id", profileId)
    .maybeSingle();

  const conditions = data?.conditions;
  return {
    conditions: Array.isArray(conditions) ? (conditions as string[]).map((c) => c.toLowerCase()) : [],
    journey: (data?.journey as string | null) ?? null,
  };
}
