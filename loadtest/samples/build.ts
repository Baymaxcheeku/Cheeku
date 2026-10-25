import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { memberIntent, type MemberLike } from "../../mobile-react-native/src/lib/memory/intent";
import type { ChatModel, ModelReply, ModelRequest } from "../../mobile-react-native/src/lib/memory/model";
import { planTurn } from "../../mobile-react-native/src/lib/memory/pipeline";
import { detect } from "../../mobile-react-native/src/lib/safety/detect";

import { makeDocuments } from "./documents";
import { makePopulation, rng, type Account } from "./population";
import { covered, makeTurn, type Turn } from "./turns";

/*
 * BUILDS THE SAMPLE INPUTS, THROUGH THE APP'S OWN CODE.
 *
 *   npx tsx --tsconfig loadtest/tsconfig.json loadtest/samples/build.ts --accounts 2000 --turns 20000
 *
 * For every sample turn this does what the Ask screen does (app/(app)/ask.tsx
 * send()): memberIntent picks whose memory the message goes to, a paused
 * member is refused, and planTurn runs the whole on-device pipeline. The
 * model is a recorder, so the ModelRequest written out is byte for byte what
 * the phone would send to cheeku-chat today. Nothing here talks to a network.
 *
 * Out (all under --out, gitignored):
 *   requests.jsonl   one model call per line: {id, account, profile, canary, body: ModelRequest}
 *   turns.jsonl      one typed message per line, with its answer key: the gateway's input
 *   documents.jsonl  one PDF lab report per line, with what it says and whose it is
 *   population.json  the families and their memories, for seeding staging
 *   report.md        switching accuracy, isolation, emergencies, payload sizes
 *
 * Exits non-zero if an emergency reached the model, or any request carries
 * another member's canary. Switching misses are reported, not fatal: they are
 * the number to drive down, and today's reader has known gaps.
 */

const { values: args } = parseArgs({
  options: {
    accounts: { type: "string", default: "1000" },
    turns: { type: "string", default: "10000" },
    docs: { type: "string", default: "1000" },
    seed: { type: "string", default: "42" },
    today: { type: "string", default: new Date().toISOString().slice(0, 10) },
    out: { type: "string", default: "loadtest/out" },
  },
});

const accounts = Number(args.accounts);
const turnCount = Number(args.turns);
const today = args.today as string;
const out = args.out as string;
mkdirSync(out, { recursive: true });

const CANARY = /CNRY-[0-9a-f]{6}/g;
const reply: ModelReply = { paragraphs: ["Recorded."], citations: [], followUps: [], basis: "general" };

type Outcome = "correct_stay" | "correct_switch" | "missed_switch" | "wrong_switch" | "ambiguous_stayed" | "ambiguous_switched" | "refused_ok" | "refused_missed" | "emergency";

function classify(t: Turn, landed: string, refused: boolean): Outcome {
  // An emergency escalates wherever it lands; its check is the gate, below.
  if (t.truth.outcome === "escalate") return "emergency";
  if (t.truth.outcome === "refused") return refused ? "refused_ok" : "refused_missed";
  if (t.truth.about === "ambiguous") return landed === t.activeProfile ? "ambiguous_stayed" : "ambiguous_switched";
  if (t.truth.land === t.activeProfile) return landed === t.activeProfile ? "correct_stay" : "wrong_switch";
  if (landed === t.truth.land) return "correct_switch";
  return landed === t.activeProfile ? "missed_switch" : "wrong_switch";
}

const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : "n/a");
const quantile = (xs: number[], q: number) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))] as number;
};

async function main() {
  const started = Date.now();
  const population: Account[] = makePopulation(Number(args.seed), accounts, today);
  const r = rng(Number(args.seed) + 1);
  const canaryOf = new Map(population.flatMap((a) => a.members.map((m) => [m.id, m.canary] as const)));

  const requests: string[] = [];
  const turns: string[] = [];
  const outcomes = new Map<string, number>();
  const byCategory = new Map<string, Map<Outcome, number>>();
  const misses: { text: string; category: string; outcome: Outcome; relationship: string | null }[] = [];
  const sizes: number[] = [];
  const failures: string[] = [];
  let modelCalls = 0;
  let escalations = 0;
  let unsavedEmergencies = 0;

  for (let i = 0; i < turnCount; i += 1) {
    const account = population[Math.floor(r() * population.length)] as Account;
    const id = `t${String(i).padStart(7, "0")}`;
    const t = makeTurn(r, account, id);
    const members: MemberLike[] = account.members.map((m) => ({ id: m.id, name: m.name, relationship: m.relationship, isPrimary: m.isPrimary, dob: m.dob }));

    // Exactly the Ask screen's order: whose memory, then is it open on this plan.
    const target = memberIntent(t.text, members, t.activeProfile, new Date(today));
    const refused = Boolean(target && !covered(account).has(target.id));
    const landed = target && !refused ? target.id : t.activeProfile;
    const outcome = classify(t, landed, refused);
    outcomes.set(outcome, (outcomes.get(outcome) ?? 0) + 1);
    const cat = byCategory.get(t.category) ?? new Map<Outcome, number>();
    cat.set(outcome, (cat.get(outcome) ?? 0) + 1);
    byCategory.set(t.category, cat);
    if ((outcome === "missed_switch" || outcome === "wrong_switch" || outcome === "refused_missed") && misses.length < 40) {
      const about = account.members.find((m) => m.id === t.truth.about);
      misses.push({ text: t.text, category: t.category, outcome, relationship: about?.relationship ?? null });
    }

    // The Ask screen runs the gate before it looks at whose memory: an
    // emergency about a paused member still gets the emergency screen, but
    // send() then returns at the plan check and the turn is never saved.
    if (refused && t.truth.outcome === "escalate") {
      if (detect(t.text).status === "escalate") unsavedEmergencies += 1;
      else failures.push(`${id}: emergency not escalated: "${t.text}"`);
    }

    const seen: { req: ModelRequest | null } = { req: null };
    let status = "refused";
    if (!refused) {
      const recorder: ChatModel = {
        id: "recorder",
        async respond(req) {
          seen.req = req;
          return reply;
        },
      };
      let n = 0;
      const plan = await planTurn({
        text: t.text,
        bundle: account.bundles[landed] as never,
        today,
        history: account.history[landed] ?? [],
        usage: [],
        model: recorder,
        newId: () => `${id}-f${++n}`,
      });
      status = plan.status;
      if (plan.status === "escalate") escalations += 1;
      if (t.truth.outcome === "escalate" && plan.status !== "escalate") failures.push(`${id}: emergency not escalated: "${t.text}"`);
      if (t.truth.outcome === "escalate" && seen.req) failures.push(`${id}: emergency reached the model: "${t.text}"`);
    }

    const captured = seen.req;
    if (captured) {
      modelCalls += 1;
      const body = JSON.stringify(captured);
      sizes.push(body.length);
      const own = canaryOf.get(landed);
      const foreign = [...new Set(body.match(CANARY) ?? [])].filter((c) => c !== own);
      if (foreign.length) failures.push(`${id}: request for ${landed} carries another member's canary ${foreign.join(", ")}`);
      requests.push(JSON.stringify({ id, account: account.id, profile: landed, canary: own, body: captured }));
    }
    // `canary` is the expected member's, `family` every member's: a reply with
    // a family canary that is not `canary` is a misfile; one outside `family`
    // is another account's memory, the worst failure there is.
    turns.push(
      JSON.stringify({
        ...t,
        expect: { profile: t.truth.land, outcome: t.truth.outcome },
        canary: canaryOf.get(t.truth.land),
        family: account.members.map((m) => m.canary),
        pipeline: { landed, refused, status, model: Boolean(captured) },
      }),
    );
  }

  writeFileSync(join(out, "requests.jsonl"), requests.join("\n") + "\n");
  writeFileSync(join(out, "turns.jsonl"), turns.join("\n") + "\n");
  const documents = makeDocuments(rng(Number(args.seed) + 2), population, Number(args.docs));
  writeFileSync(join(out, "documents.jsonl"), documents.map((d) => JSON.stringify(d)).join("\n") + "\n");
  writeFileSync(join(out, "population.json"), JSON.stringify({ seed: Number(args.seed), today, accounts: population }, null, 0));

  const n = turnCount;
  const switchTurns = [...outcomes.entries()].filter(([o]) => o !== "correct_stay" && o !== "emergency").reduce((s, [, c]) => s + c, 0);
  const misfiled = (outcomes.get("missed_switch") ?? 0) + (outcomes.get("wrong_switch") ?? 0) + (outcomes.get("ambiguous_switched") ?? 0) + (outcomes.get("refused_missed") ?? 0);
  const profiles = population.reduce((s, a) => s + a.members.length, 0);
  const approxTokens = (chars: number) => Math.round(chars / 4);

  const lines = [
    `# Sample inputs report`,
    ``,
    `Seed ${args.seed}, ${accounts} accounts, ${profiles} profiles, ${n} turns, as of ${today}. Built in ${((Date.now() - started) / 1000).toFixed(1)} s.`,
    ``,
    `## Invariants`,
    ``,
    `- Emergencies escalated before the model: ${escalations} escalated, ${failures.filter((f) => f.includes("emergency")).length} failures`,
    `- Emergencies about a member the plan has paused: ${unsavedEmergencies}. The gate shows the emergency screen, but the turn is not saved (PLAN.md: an escalation must still be recorded)`,
    `- Requests carrying another member's canary: ${failures.filter((f) => f.includes("canary")).length} of ${modelCalls}`,
    `- Result: **${failures.length ? "FAIL" : "PASS"}**`,
    ...failures.slice(0, 20).map((f) => `  - ${f}`),
    ``,
    `## Whose memory (memberIntent against the answer key)`,
    ``,
    `| outcome | turns | share |`,
    `|---|---:|---:|`,
    ...[...outcomes.entries()].sort((a, b) => b[1] - a[1]).map(([o, c]) => `| ${o} | ${c} | ${pct(c, n)} |`),
    ``,
    `Misfiled (saved to the wrong person's memory): **${misfiled}** of ${switchTurns} turns that were not a plain stay (${pct(misfiled, switchTurns)}).`,
    `\`ambiguous_stayed\` follows today's rule (stay, don't guess); the scale plan turns those into a question.`,
    ``,
    `| category | ${["correct_stay", "correct_switch", "missed_switch", "wrong_switch", "ambiguous_stayed", "refused_ok", "refused_missed"].join(" | ")} |`,
    `|---|${"---:|".repeat(7)}`,
    ...[...byCategory.entries()].map(([c, m]) => `| ${c} | ${["correct_stay", "correct_switch", "missed_switch", "wrong_switch", "ambiguous_stayed", "refused_ok", "refused_missed"].map((o) => m.get(o as Outcome) ?? 0).join(" | ")} |`),
    ``,
    `First misses, to read:`,
    ``,
    ...misses.slice(0, 25).map((m) => `- \`${m.outcome}\` (${m.category}${m.relationship ? `, ${m.relationship}` : ""}): "${m.text}"`),
    ``,
    `## Model traffic`,
    ``,
    `- Turns that reached the model: ${modelCalls} of ${n} (${pct(modelCalls, n)}); the rest were rules-only bookings, emergencies, hard-stops or refusals`,
    `- Request body: p50 ${quantile(sizes, 0.5)} B, p95 ${quantile(sizes, 0.95)} B, max ${Math.max(0, ...sizes)} B`,
    `- Rough input tokens from the digest and history alone (chars / 4): p50 ${approxTokens(quantile(sizes, 0.5))}, p95 ${approxTokens(quantile(sizes, 0.95))}; add the system prompt on top`,
    ``,
    `## Uploads`,
    ``,
    `- ${documents.length} PDF lab reports, ${documents.filter((d) => d.wrongPerson).length} filed under the wrong family member on purpose, ${documents.reduce((s, d) => s + d.truth.entities.length, 0)} values to read`,
    ``,
  ];
  writeFileSync(join(out, "report.md"), lines.join("\n"));
  console.log(lines.join("\n"));
  if (failures.length) process.exit(1);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
