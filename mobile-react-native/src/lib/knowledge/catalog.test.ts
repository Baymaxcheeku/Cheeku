import { describe, expect, it } from "vitest";

import { continueReading, featuredPick, matchesReader, rankFeed, readBlocks, readLabel, relatedTo, toArticle, toCard, toReadState, type ArticleCard } from "./catalog";

const card = (over: Partial<ArticleCard> = {}): ArticleCard => ({
  id: "a",
  slug: "a",
  title: "A",
  standfirst: "",
  category: "reports",
  icon: "book",
  readMinutes: 4,
  featured: false,
  publishedAt: "2026-09-01",
  forYou: false,
  read: null,
  ...over,
});

describe("rows", () => {
  it("reads a new-style row and falls back on an old one", () => {
    expect(toCard({ id: 1, slug: "x", title: "T", standfirst: "S", category: "family", icon: "home", read_minutes: 4, featured: true })).toMatchObject({ category: "family", icon: "home", featured: true });
    expect(toCard({ id: 1, slug: "x", title: "T", tint: "rose", read_minutes: "3" })).toMatchObject({ category: "pregnancy", icon: "book", readMinutes: 3 });
    expect(toCard({ id: 1, slug: "x", title: "T", category: "nonsense", icon: "rocket" })).toMatchObject({ category: "reports", icon: "book" });
  });

  it("drops unknown or broken blocks rather than drawing them", () => {
    expect(
      readBlocks([
        { type: "p", text: "Hello" },
        { type: "script", text: "x" },
        { type: "questions", items: ["Q1", 2, ""] },
        { type: "stat", value: "3 months" },
        { type: "list", items: [] },
        null,
      ]),
    ).toEqual([
      { type: "p", text: "Hello" },
      { type: "questions", items: ["Q1"] },
    ]);
  });

  it("builds an article with sources it can actually cite", () => {
    const a = toArticle({ id: 1, slug: "x", title: "T", body: [], key_points: ["One", "Two"], sources: [{ publisher: "NHS", title: "Page" }, { title: "No publisher" }] });
    expect(a.keyPoints).toEqual(["One", "Two"]);
    expect(a.sources).toEqual([{ publisher: "NHS", title: "Page", year: undefined, url: undefined }]);
    expect(a.author).toBe("Cheeku health desk");
  });

  it("reads progress and finishing", () => {
    expect(toReadState({ progress: 0.4, saved: true })).toEqual({ progress: 0.4, saved: true, finished: false });
    expect(toReadState({ progress: "0.95" })).toMatchObject({ finished: true });
    expect(toReadState({ progress: 0.3, finished_at: "2026-09-01" }).finished).toBe(true);
  });

  it("matches only the reader's own declared words", () => {
    expect(matchesReader({ conditions: ["Type 2 diabetes"] }, ["type 2 diabetes"], null)).toBe(true);
    expect(matchesReader({ journeys: ["parent"] }, [], "parent")).toBe(true);
    expect(matchesReader({ conditions: ["Asthma"] }, ["diabetes"], "self")).toBe(false);
  });
});

describe("ranking", () => {
  it("puts for-you and unread first, finished last", () => {
    const ranked = rankFeed([
      card({ id: "old-read", read: { progress: 1, saved: false, finished: true }, forYou: true }),
      card({ id: "general", publishedAt: "2026-09-10" }),
      card({ id: "mine", forYou: true, publishedAt: "2026-08-01" }),
    ]);
    expect(ranked.map((c) => c.id)).toEqual(["mine", "general", "old-read"]);
  });

  it("finds what to continue, the hero, and related reads", () => {
    const cards = [
      card({ id: "a", category: "family", featured: true }),
      card({ id: "b", category: "family", read: { progress: 0.4, saved: false, finished: false } }),
      card({ id: "c", category: "reports", read: { progress: 0.02, saved: true, finished: false } }),
      card({ id: "d", category: "family", read: { progress: 1, saved: false, finished: true } }),
    ];
    expect(continueReading(cards).map((c) => c.id)).toEqual(["b"]);
    expect(featuredPick(cards)?.id).toBe("a");
    expect(featuredPick(cards.slice(1))?.id).toBe("b");
    expect(relatedTo(cards[0] as ArticleCard, cards, 3).map((c) => c.id)).toEqual(["b", "d", "c"]);
  });

  it("labels reading time honestly", () => {
    expect(readLabel(card())).toBe("4 min read");
    expect(readLabel(card({ read: { progress: 0.5, saved: false, finished: false } }))).toBe("2 min left");
    expect(readLabel(card({ read: { progress: 1, saved: false, finished: true } }))).toBe("Read");
  });
});
