# Build brief — React Native rewrite

> **2026-10-31:** the Next.js app this document describes was removed from the
> repo (it is in git history at `9d01a11`); the mobile app (this folder) is the
> only build. Paths into the web app's `src/` refer to that history.

You are building the native mobile app. A working Next.js web app already
exists at `baymax-app/`; it is the specification. This document tells you what
to port unchanged, what to rewrite, and what not to touch.

Read `baymax-app/PROGRESS.md` for the build log and every design decision with
its reasoning. Read `baymax-app/SHIPPING.md` for store submission constraints.
Both are current.

---

## 0 · What this product is

An India-first family health app. Households photograph medical documents;
the app reads them, files them per family member, remembers what they said,
and answers questions in plain language while always citing the record the
answer came from.

Five journeys it is built around (`src/lib/onboarding/journeys.ts` — port this
file as-is): expecting a baby, trying to conceive, caring for a parent, new
parent, optimising your own health, plus an open "just keeping track".

**The product is the memory, not the chat.** Every design decision follows from
that.

---

## 1 · Stack — use exactly this

```
Framework      Expo (managed) + React Native + TypeScript strict
Navigation     Expo Router (file-based, mirrors the existing route tree)
Styling        NativeWind v4 (Tailwind syntax, existing tokens port directly)
State          Zustand for client UI state only; server state via TanStack Query
Backend        Supabase — Postgres, Auth, Storage, RLS (EXISTING, do not rebuild)
Auth           @supabase/supabase-js with AsyncStorage/SecureStore session
Validation     Zod on every input and every API boundary
Forms          react-hook-form + zodResolver
Icons          lucide-react-native (single weight, rounded)
SVG            react-native-svg
Animation      react-native-reanimated (respect reduced motion)
Testing        Vitest for lib logic, Maestro or Detox for E2E
Payments       RevenueCat (StoreKit + Play Billing) — see §7
```

**Do not add:** Redux, styled-components, any component library (Paper, UI
Kitten, Tamagui), moment.js, axios. Do not add an AI SDK — see §6.

**Target:** iOS 16+, Android 10+. Portrait only. Design baseline 390×844.

---

## 2 · What ports unchanged

These files are pure TypeScript with no DOM or Next dependency. **Copy them
verbatim.** They carry the product's hard-won rules and they are already
tested — 172 tests pass against them.

```
src/lib/safety/detect.ts              THE SAFETY GATE — see §5
src/lib/safety/escalation.ts
src/lib/safety/lexicon.generated.ts
src/lib/safety/fixtures/*.ts          300 frozen test phrases
src/lib/billing/plans.ts              tiers, prices, seats
src/lib/records/types.ts              severity, doc types, flags
src/lib/records/grouping.ts           date bucketing
src/lib/records/filters.ts
src/lib/onboarding/journeys.ts        the five ICPs
src/lib/notifications/derive.ts
src/lib/profiles/avatar.ts            DiceBear micah generator
src/lib/settings/schemas.ts           Zod schemas
src/lib/auth/schemas.ts
src/lib/app-meta.ts
```

Port the matching `*.test.ts` files with them. If a test fails after porting,
the port is wrong — do not edit the test to make it pass.

**Needs a small edit (3 files):** `src/lib/records/insight.ts` and
`src/lib/ai/mock/knowledge.ts` reference DOM or Next types in one or two
places. Strip those; the logic is portable.

---

## 3 · What gets rewritten

Roughly 12,000 lines of UI. There is no shortcut here.

- **22 screens** in `src/app` — the route tree maps 1:1 onto Expo Router.
- **34 components** in `src/components` — Tailwind classes mostly survive via
  NativeWind, but every layout needs review: no CSS grid, no `position: fixed`,
  different flex defaults.
- **The 9 server-action files** become API calls. See §4.
- **Illustrations** (`src/components/illustrations/`) are authored SVG. They
  port to `react-native-svg` element by element. Gradients and filters need
  checking — RN SVG supports gradients, filter support is limited, so the
  mascot's shading may need flattening. `sprout-flat.tsx` already contains a
  filter-free version of the character to fall back on.
- **Framer Motion → Reanimated.** `src/components/ui/motion.tsx` is the whole
  motion vocabulary; rewrite it once and the screens follow.

---

## 4 · Server actions become an API

This is the largest architectural change and the one most likely to be got
wrong. In the web app, forms call server functions directly and auth rides on
an httpOnly cookie refreshed by `middleware.ts`. **React Native has none of
that.**

Replace with **Supabase Edge Functions** (or a small Node/Hono service) exposing
these endpoints. Keep the request and response shapes identical to the existing
server actions so the ported types still describe them.

| Existing server action | Endpoint | Notes |
| --- | --- | --- |
| `lib/ai/actions.ts` `askBaymax` | `POST /ask` | Returns `AskResult`. Quota failure is a distinct shape, not an error string. |
| `lib/ai/actions.ts` `askAboutProduct` | `POST /ask/product` | |
| `lib/ai/actions.ts` `recordEscalation` | `POST /escalations` | Must persist even when the gate blocks the send. |
| `lib/records/upload.ts` `uploadDocument` | `POST /documents` | Multipart. Strips EXIF client-side first. |
| `lib/profiles/actions.ts` `switchProfile` | client-side state | No cookie in RN; hold active profile in Zustand + SecureStore. **Still validate server-side on every read.** |
| `lib/settings/actions.ts` (5 actions) | `PATCH /profile`, `/health`, `/notifications`, `/password` | |
| `lib/account/actions.ts` | `GET /export`, `POST /account/delete` | Both must keep working; stores require in-app deletion. |
| `lib/billing/actions.ts` | replaced by RevenueCat webhooks | See §7. |

**Auth:** `supabase-js` with `SecureStore` for the refresh token. Never
`AsyncStorage` for tokens.

**Critical:** the web app enforces plan-scoped profile access server-side via
`selectableProfiles()`. That check must live in the API, not the app. See §8.

---

## 5 · The safety gate — do not redesign

`src/lib/safety/detect.ts` runs **on device, before any network call**, on every
message the user sends. It is deterministic, under 200ms, and returns
`{ status, matched, lexiconVersion }`.

Rules that do not change:

1. It runs **first** in the send path. There must be exactly **one** send path;
   a second route to the model is a second place to forget the gate.
2. It never sends user text to a server to decide. A network round trip can
   promise neither latency nor availability.
3. `matched` carries a rule id, **never user text** — it goes to logs.
4. On `escalate`, the app shows the emergency screen and still records the
   turn. An escalation that leaves no record is not auditable.
5. The frozen test suite (`fixtures/must-fire.ts`, `must-not-fire.ts`) is a CI
   gate: 100% recall on must-fire, under 5% false positives on must-not-fire.
   Any lexicon edit reruns it.

It handles Hinglish and romanised Hindi via a spelling-variant fold. Port that
intact.

---

## 6 · The AI boundary — someone else owns this

A data scientist is building OCR, document analysis, and the chat model in
parallel. **Do not build any of it.** Build against the contract below and use
the existing mock until the real service exists.

`src/lib/ai/mock/` is a complete fixture implementation — a working document
extractor, an answer engine with citations, a general-knowledge corpus, and
five product-safety scenarios. It ports as-is and lets every screen be built
and demoed before the model lands.

### Contract the app expects

**Extraction** (`POST /documents` response):

```ts
{
  documentId: string;
  docType: "lab_report" | "prescription" | "discharge" | "scan"
         | "bill" | "vaccination" | "other";
  title: string;
  eventDate: string | null;      // ISO date
  facility: string | null;
  doctor: string | null;
  confidence: number;            // 0..1, shown to the user
  rawText: string | null;        // the OCR text, always retrievable
  entities: Array<{
    kind: "lab_value" | "medication" | "condition" | "vital" | "vaccine";
    name: string;
    value: number | null;
    valueText: string | null;
    unit: string | null;
    refRange: string | null;     // the range PRINTED ON THE DOCUMENT
    flag: "normal" | "high" | "low" | "caution" | null;
  }>;
}
```

**Chat** (`POST /ask` response) — shape is `AskResult` in `lib/ai/actions.ts`:

```ts
{
  ok: true;
  conversationId: string;
  user: ChatTurn;
  assistant: ChatTurn;   // { content, citations[], grounded, kind, followUps[] }
}
```

`kind` is `"grounded"` (read from the user's own records, must carry
citations), `"general"` (health information not from their documents, must be
labelled as such in the UI), `"silent"` (refuses, outside both), or
`"product"` (a photo safety assessment).

### Non-negotiable rules for whoever builds the model

These are product rules, not preferences. They are enforced by tests today and
the tests port.

1. **Never diagnose. Never suggest a medication, a dose, or a treatment.** The
   app reads what a document says and hands interpretation to a doctor.
2. **Every grounded claim cites the document it came from**, and the citation
   is tappable through to that record. A citation that cannot be checked is
   decoration.
3. **A value is reported against the range printed on that document**, not
   against a general population range. Pregnancy ranges differ; the lab's own
   range is the only honest reference.
4. **General health information is allowed** and must be visibly labelled as
   not read from the user's records.
5. **One family member's data never appears in another's context.** The model
   receives only the active profile's records.

---

## 7 · Payments

The web app charges via UPI. **iOS requires Apple IAP for digital
subscriptions**; Play Billing likewise. Read `SHIPPING.md` §"Blocker 2".

Use **RevenueCat**. Products: ₹29 day pass (`micro`, 24h expiry), ₹99/mo
(`solo`), ₹249/mo (`family`, 4 seats). Definitions live in
`src/lib/billing/plans.ts` — port it.

The entitlement **read** path is already correct and stays: everything derives
from one `subscriptions` row via `getEntitlement()`. Only the **writer**
changes — from an internal checkout result to a validated store receipt, plus
webhooks for renewal, cancellation, refund and grace.

Daily pass expiry is checked identically in the read path and the write path.
Do not split that; if they disagree the paywall and the gate fight each other.

---

## 8 · Backend — already built, do not rebuild

Supabase project with 10 migrations in `baymax-app/supabase/migrations/`. Tables:

```
families            one per account
profiles            family members; avatar seeds
documents           uploaded records + extraction blob
entities            extracted values, flags, ref ranges
timeline_events
conversations       chat threads
messages            append-only, safety audit trail
consent_log         append-only
subscriptions       tier, chats_used_this_month, expires_at
support_tickets
```

**RLS is on every table.** Storage is private with a server-generated object key
of `<user_id>/<profile_id>/<uuid>.<ext>`; policies match on the first segment,
so a client-supplied path is a client-supplied authorisation decision.

### Two invariants that are easy to break

**Plan-scoped profile access.** A family shares one `user_id`, so RLS cannot
distinguish members. `selectableProfiles()` slices the roster by
`seatsFor(tier)`. Every read path must derive from it: active profile, profile
switching, records list, record detail, and upload. On a one-seat plan a locked
member's document is a valid row for that caller — only this check stops it
being served. Locked members are **preserved, not deleted**; they return on
upgrade.

**Append-only tables.** `messages` and `consent_log` have no update policy by
design. An editable audit trail is not evidence.

---

## 9 · Design system

Tokens live in `baymax-app/src/app/globals.css` and port directly to a
NativeWind theme.

```
brand      #4a2ade (600) core; 50→950 ramp
canvas     #fafafe    surface #ffffff
ink        900 #0f1030 · 700 #3a3b57 · 500 #6b6c8a · 300 #9696ae
line       #e8e8f4
radius     card 20 · tile 16 · sheet 28 · pill 999
shadow     e1 0 2px 12px rgba(15,16,48,.06) · e2 0 8px 28px rgba(15,16,48,.12)
easing     cubic-bezier(0.22, 1, 0.36, 1)
```

**Semantic colour is reserved.** Green `#23af5f`, amber `#ffaf23`, red
`#ea2a36` mean **health status only** — never decoration, never a button,
never a category tint. This rule has been broken twice in this codebase and
caught both times; expect to police it.

Text-on-tint uses darkened variants (`--safe-text`, `--caution-text`,
`--danger-text`) because the fill colours do not clear 4.5:1 as text.

**Mascot:** "Sprout", an original character in `src/components/illustrations/
sprout.tsx`. Single continuous body, stem, heart-leaf. Verified legible at
34px. App icons already generate from it. It survives the pending rename.

**Motion:** one authored moment per screen, not a fade on every section.
Durations under 300ms except deliberate ambient loops. Honour reduced motion
explicitly — Reanimated will not inherit an OS setting for you.

---

## 10 · Screens

22 routes. Build in this order; each phase is demoable.

**Phase 1 — shell and auth** (2 wk)
`/` splash · `/welcome` 4-panel carousel with the journey picker · `/sign-in` ·
`/who` · `/profile` · `/first-upload` · `/plan`

**Phase 2 — the memory core** (3 wk)
`/scan` upload + progress · `/scan/review` extraction review ·
`/records` list and timeline behind one segmented toggle · `/records/[id]`
detail with the original-document toggle · `/home`

**Phase 3 — the companion** (2.5 wk)
`/ask` chat, the safety gate, citations, product-photo path · emergency
escalation overlay · family switcher with plan-locked members

**Phase 4 — account** (2.5 wk)
`/settings` and the 7 sub-screens · paywall · export and delete

**Phase 5 — native** (3 wk)
Push (APNs + FCM) · biometric lock · native document scanner · offline record
cache · share sheet · deep links

**Phase 6 — store** (2–4 wk)
See `SHIPPING.md` §"Phase 3".

**Estimate: 13–17 weeks** to a submittable build.

---

## 11 · Rules for the build

1. **Read `PROGRESS.md` before changing anything that looks odd.** Most
   surprising decisions are recorded there with the reason. The frames were
   overridden in several places for safety reasons and those overrides are
   deliberate.
2. **Do not weaken the safety gate for latency.** It is already under 200ms.
3. **Do not put health data in logs, URLs, query strings, or analytics.**
4. **Never show one family member's data in another's context.** Every screen
   is scoped to the active profile.
5. **Ported tests are the specification.** If one fails, the port is wrong.
6. **The app does not diagnose.** Any copy that implies it is a bug.

## 12 · What already exists to reuse

- Working web app, every screen designed and reviewed, running locally.
- 10 Supabase migrations, RLS on every table, tested isolation.
- 172 passing tests over the rules that matter.
- 300-phrase frozen safety corpus.
- Complete mock AI: extractor, answer engine, knowledge corpus, 5 product
  scenarios — enough to build and demo every screen before the model exists.
- Original mascot and generated app icons.
- Design tokens sampled from the approved frames.
- `PROGRESS.md`, `SHIPPING.md`, `SECURITY.md`, `PRIVACY_NOTES.md`.

## 13 · Open items inherited

- **Rename.** "Baymax" is Disney's character and is a store blocker. Pick the
  real name before creating any store account or bundle identifier.
- Real OCR and model (the data scientist's track).
- Rate limiting on auth and AI endpoints.
- Nonce-based CSP is a web concern and does not carry over.
- Push delivery: preferences are collected today, nothing sends.
