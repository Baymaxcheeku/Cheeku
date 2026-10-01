/*
 * Worth knowing: the shapes and the rules, without any network.
 *
 * Articles are the content side of the app, written and checked by the team
 * and published from the database (migrations 0016, 0029). This file turns a
 * row into something the screens can draw, ranks the feed for one reader, and
 * works out "continue reading" from their history. Pure, so all of it is
 * tested (catalog.test.ts).
 *
 * WHAT IS NEVER USED TO RANK. Anything read out of someone's documents.
 * Showing diabetes articles because a lab value came back high is a diagnosis
 * dressed as a reading list. Only the conditions a person typed into their
 * own profile, and the journey they picked, count (see queries.ts).
 */

export type ArticleCategory = "reports" | "family" | "prevention" | "pregnancy" | "living";
export type ArticleIcon = "book" | "droplet" | "ruler" | "heart" | "activity" | "gauge" | "baby" | "syringe" | "shield" | "home" | "flask" | "pill" | "apple" | "moon";

export const CATEGORIES: readonly ArticleCategory[] = ["reports", "family", "prevention", "pregnancy", "living"];

export const CATEGORY_LABEL: Record<ArticleCategory, string> = {
  reports: "Reading your reports",
  family: "Caring for family",
  prevention: "Staying ahead",
  pregnancy: "Pregnancy",
  living: "Living well",
};

/** The short form, for chips. */
export const CATEGORY_CHIP: Record<ArticleCategory, string> = {
  reports: "Reports",
  family: "Family",
  prevention: "Prevention",
  pregnancy: "Pregnancy",
  living: "Living well",
};

export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "callout"; text: string }
  | { type: "list"; items: string[] }
  | { type: "steps"; items: string[] }
  | { type: "questions"; items: string[] }
  | { type: "stat"; value: string; label: string };

export type ArticleSource = { publisher: string; title: string; year?: string; url?: string };

export type ReadState = { progress: number; saved: boolean; finished: boolean };

export type ArticleCard = {
  id: string;
  slug: string;
  title: string;
  standfirst: string;
  category: ArticleCategory;
  icon: ArticleIcon;
  readMinutes: number;
  featured: boolean;
  publishedAt: string | null;
  /** Matched this reader's own profile, rather than a general pick. */
  forYou: boolean;
  read: ReadState | null;
};

export type Article = ArticleCard & {
  keyPoints: string[];
  author: string;
  body: ArticleBlock[];
  sources: ArticleSource[];
  reviewedOn: string | null;
};

type Row = Record<string, unknown>;

const CATEGORY_SET = new Set<string>(CATEGORIES);
const ICON_SET = new Set<string>(["book", "droplet", "ruler", "heart", "activity", "gauge", "baby", "syringe", "shield", "home", "flask", "pill", "apple", "moon"]);

/*
 * Before 0029 there was only a colour. A reader on an older database still
 * gets sensible categories from it rather than everything filed as reports.
 */
const TINT_TO_CATEGORY: Record<string, ArticleCategory> = { violet: "reports", indigo: "reports", teal: "family", amber: "living", rose: "pregnancy" };

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter((x): x is string => x !== null) : []);

export function toCard(row: Row, forYou = false, read: ReadState | null = null): ArticleCard {
  const category = CATEGORY_SET.has(row.category as string)
    ? (row.category as ArticleCategory)
    : (TINT_TO_CATEGORY[row.tint as string] ?? "reports");
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: str(row.title) ?? "Untitled",
    standfirst: str(row.standfirst) ?? "",
    category,
    icon: ICON_SET.has(row.icon as string) ? (row.icon as ArticleIcon) : "book",
    readMinutes: Math.max(1, Math.round(Number(row.read_minutes ?? 3)) || 3),
    featured: row.featured === true,
    publishedAt: str(row.published_at),
    forYou,
    read,
  };
}

/** Blocks, defensively: an unknown or malformed block is dropped, never drawn. */
export function readBlocks(v: unknown): ArticleBlock[] {
  if (!Array.isArray(v)) return [];
  const out: ArticleBlock[] = [];
  for (const b of v) {
    if (typeof b !== "object" || b === null) continue;
    const o = b as Row;
    const text = str(o.text);
    switch (o.type) {
      case "p":
      case "h":
      case "callout":
        if (text) out.push({ type: o.type, text });
        break;
      case "list":
      case "steps":
      case "questions": {
        const items = strs(o.items);
        if (items.length) out.push({ type: o.type, items });
        break;
      }
      case "stat": {
        const value = str(o.value);
        const label = str(o.label);
        if (value && label) out.push({ type: "stat", value, label });
        break;
      }
    }
  }
  return out;
}

export function toArticle(row: Row, read: ReadState | null = null): Article {
  const sources = Array.isArray(row.sources)
    ? (row.sources as Row[])
        .filter((s) => str(s?.publisher) && str(s?.title))
        .map((s) => ({ publisher: str(s.publisher) as string, title: str(s.title) as string, year: str(s.year) ?? undefined, url: str(s.url) ?? undefined }))
    : [];
  return {
    ...toCard(row, false, read),
    keyPoints: strs(row.key_points).slice(0, 5),
    author: str(row.author) ?? "Cheeku health desk",
    body: readBlocks(row.body),
    sources,
    reviewedOn: str(row.reviewed_on),
  };
}

export function toReadState(row: Row): ReadState {
  const progress = Math.min(1, Math.max(0, Number(row.progress ?? 0) || 0));
  return { progress, saved: row.saved === true, finished: Boolean(row.finished_at) || progress >= 0.9 };
}

/** Whether a row matches this reader's own declared conditions or journey. */
export function matchesReader(row: Row, declared: string[], journey: string | null): boolean {
  const conditions = strs(row.conditions).map((c) => c.toLowerCase());
  const journeys = strs(row.journeys);
  return conditions.some((c) => declared.includes(c)) || (journey !== null && journeys.includes(journey));
}

/**
 * The order for Home: for-you first, then unread before read, then newest.
 * Something read to the end drops to the back rather than vanishing, so a
 * short catalogue never leaves the rail empty.
 */
export function rankFeed(cards: ArticleCard[]): ArticleCard[] {
  const score = (c: ArticleCard) => (c.forYou ? 0 : 2) + (c.read?.finished ? 4 : 0);
  return [...cards].sort((a, b) => score(a) - score(b) || String(b.publishedAt ?? "").localeCompare(String(a.publishedAt ?? "")));
}

/** Started and not finished, most recently opened first is the caller's order. */
export function continueReading(cards: ArticleCard[]): ArticleCard[] {
  return cards.filter((c) => c.read && !c.read.finished && c.read.progress >= 0.05);
}

/** The library's hero: the featured one, else the newest unread. */
export function featuredPick(cards: ArticleCard[]): ArticleCard | null {
  return cards.find((c) => c.featured) ?? cards.find((c) => !c.read?.finished) ?? cards[0] ?? null;
}

/** Up to `n` others from the same category, then from anywhere, unread first. */
export function relatedTo(article: Pick<ArticleCard, "id" | "category">, cards: ArticleCard[], n = 3): ArticleCard[] {
  const others = cards.filter((c) => c.id !== article.id);
  const unreadFirst = (xs: ArticleCard[]) => [...xs].sort((a, b) => Number(Boolean(a.read?.finished)) - Number(Boolean(b.read?.finished)));
  const same = unreadFirst(others.filter((c) => c.category === article.category));
  const rest = unreadFirst(others.filter((c) => c.category !== article.category));
  return [...same, ...rest].slice(0, n);
}

/** "4 min read", "Read", "2 min left". */
export function readLabel(c: Pick<ArticleCard, "readMinutes" | "read">): string {
  if (c.read?.finished) return "Read";
  if (c.read && c.read.progress >= 0.05) {
    const left = Math.max(1, Math.ceil(c.readMinutes * (1 - c.read.progress)));
    return `${left} min left`;
  }
  return `${c.readMinutes} min read`;
}
