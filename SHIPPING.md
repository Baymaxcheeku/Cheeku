# Shipping to the App Store and Play Store

> **2026-10-30:** the Next.js app this document describes was removed from the
> repo; the mobile app in `mobile-react-native/` is the only build. Paths into
> the web app's `src/` refer to git history before that date.

Written 2026-08-01, against the app as it stands. Read the two blockers first;
both change decisions you would otherwise make later and expensively.

---

## Blocker 1 — the name is not shippable

**Baymax is Disney's character** (Big Hero 6). A health app called Baymax, with
a companion mascot, will not clear App Store review, and it is a trademark
exposure independent of the store.

This is already known to be temporary. Flagging it here because it is not a
branding task, it is a **submission blocker**, and it has a long tail: bundle
identifier, App Store Connect record, Play Console listing, deep-link domain,
support email, and every string in the product. Rename before any store account
is created, not after.

Already insulated from the rename: the mascot is an original character (see
`illustrations/sprout.tsx`), so the visual identity survives it intact.

## Blocker 2 — Apple will not let you charge by UPI

The paywall currently sells subscriptions (₹29 day pass, ₹99 solo, ₹249 family)
and is architected around a UPI/Razorpay flow. **Digital subscriptions consumed
inside an iOS app must use Apple's in-app purchase**, at 15–30% commission.
Google Play Billing imposes the same on Android. A store build that takes
payment via UPI for in-app features is rejected under App Store Guideline 3.1.1.

This reaches further into the code than it looks:

- `subscriptions` table and `activateTier()` currently trust an internal
  checkout result. They will need to trust a **validated store receipt**.
- Renewals, cancellations, refunds, grace periods and billing retries all
  arrive as **server-to-server webhooks** from Apple and Google, not from your
  own UI. `cancelPlan()` becomes "tell the store", not "write a row".
- The entitlement read path (`getEntitlement`) stays as-is conceptually, which
  is good: it already derives everything from one row, so swapping what writes
  that row is contained.

**Recommendation:** put RevenueCat in front of StoreKit and Play Billing rather
than integrating both directly. It normalises receipts, handles the webhook
lifecycle, and writes one entitlement state you can mirror into Supabase. Keep
UPI/Razorpay alive for the **web** version only, where Apple has no claim.

Budget this as real work, not integration glue.

---

## The architecture question

This is a **server-rendered Next.js app**: 9 files export server actions, 13
routes are `force-dynamic`, and `middleware.ts` refreshes the Supabase session
cookie on every request. There is no static export. That rules out the naive
path of bundling the built site into a native binary — there is no built site,
there is a server.

Three real options.

### Path A — Capacitor shell over a hosted server (recommended first)

A thin native iOS/Android wrapper that loads the deployed app, plus native
plugins for the things a browser cannot do.

- **Effort:** 3–5 weeks on top of Phase 0.
- **Keeps:** every screen, every server action, the entire codebase. One
  codebase for web and both stores.
- **Risk:** **App Store Guideline 4.2 (Minimum Functionality).** Apple rejects
  apps that are only a website in a shell. This is the single most common
  rejection for this approach and it is judged on how the app *feels*, not on
  how it is built.

  Mitigate by shipping genuine native capability in v1:
  - push notifications (APNs) — the Notifications screen currently promises
    delivery that does not exist, so this is owed anyway
  - biometric app lock (Face ID / fingerprint) — appropriate for medical records
    and a strong signal of nativeness
  - native document scanner and camera capture, not an `<input type=file>`
  - offline read of already-fetched records
  - native share sheet for the data export

  With those, 4.2 is a manageable risk. Without them, expect rejection.

### Path B — React Native / Expo rewrite

- **Effort:** 3–5 months.
- **Reusable as-is:** the Supabase schema and RLS, and most of `src/lib` —
  the safety gate (`safety/detect.ts`), quota and plan logic, the answer engine,
  extraction, grouping and insight code are all pure TypeScript with no DOM
  dependency. That is a substantial fraction of the product's actual rules.
- **Rewritten:** every screen and all the design work in this repo, navigation,
  forms, and the server actions (which become API routes the app calls).
- Worth it only once the product has traction and native polish is the
  differentiator.

### Path C — PWA only

Already half-built: `manifest.ts` and `apple-icon.tsx` ship, and the app
installs to the iOS home screen standalone today. Costs nothing further and is
the right way to test with real users **now**. It does not give you a store
listing, so it does not answer the question — but it removes the pressure to
rush one.

**Suggested route: C now, A for launch, B if it earns it.**

---

## Phase 0 — production readiness (required for any path)

None of this is store-specific. All of it is required before real patients'
records exist.

| Item | Why it blocks launch |
| --- | --- |
| Rename off "Baymax" | Trademark. See Blocker 1. |
| Real AI backend | `lib/ai/mock/*` is a fixture corpus. The safety gate stays client-side and deterministic regardless. |
| Real OCR/extraction | `lib/ai/mock/extract.ts` returns canned output keyed on filename. |
| Rate limiting on auth and AI endpoints | Already in the backlog. Public endpoints with no limit invite abuse and cost. |
| Playwright E2E on the core flows | Backlog task #19, still open. |
| Error monitoring (Sentry or equivalent) | You cannot debug a medical app from user reports alone. |
| Supabase production project | Separate from dev, with PITR backups and a tested restore. |
| Migration process | `supabase/migrations` exists; the promotion path to prod does not. |
| Privacy policy, terms, DPDP notice | Required by both stores and by Indian law. |
| Nonce-based CSP | `next.config.ts` still carries `'unsafe-inline'` on `script-src`, with a note saying Phase 7 fixes it. |

## Phase 1 — native shell

1. `npx cap init`, add iOS and Android platforms.
2. Point the shell at the production URL; configure allowed navigation so the
   webview cannot wander off-origin.
3. Native plugins, in priority order: push (APNs + FCM), biometric lock, camera
   and document scanner, secure storage for the session, share sheet.
4. Universal Links (iOS) and App Links (Android) so `/records/<id>` opens in the
   app rather than Safari.
5. Deliver on the notification preferences the app already collects — the
   `notification_prefs` shape exists and nothing sends against it.
6. Offline: cache the record list and detail payloads. A medical app that is
   blank on a train is worse than one that says "last synced 09:14".

## Phase 2 — billing migration

1. RevenueCat project; products mirrored in App Store Connect and Play Console.
2. Server-side receipt validation writing to `subscriptions`.
3. Webhook handlers for renewal, cancellation, refund, billing-retry, grace.
4. Keep the read path (`getEntitlement`) unchanged; only the writer changes.
5. Web keeps UPI/Razorpay. The tier a user holds must be identical whichever
   way they paid.

## Phase 3 — store submission

**Accounts:** Apple Developer Program (~$99/yr, and an Organization enrolment
needs a D-U-N-S number — start this early, it takes weeks). Google Play Console
($25 once).

**Assets:** icons already generate from the Sprout mark (`apple-icon.tsx`,
`icon.tsx`). Needed additionally: screenshots at every required size, feature
graphic (Play), preview video (optional but converts).

**Compliance paperwork:**

- Apple **Privacy Nutrition Labels** and Google **Data Safety** form. Both ask
  exactly what health data you collect and whether it leaves the device. Answer
  them from `PRIVACY_NOTES.md` rather than from memory.
- Health-app declarations. App Store §1.4.1 governs medical apps. **The
  product's rule 1 is an asset here**: it does not diagnose, does not suggest a
  dose, and says so on screen. Apps that appear diagnostic get asked for
  clinical evidence and regulatory clearance. Keep that boundary visible in the
  listing copy, not just in the code.
- Age rating: expect "Medical/Treatment Information", 17+ on iOS.
- Account deletion must be reachable **in-app** (Apple requirement since 2022).
  Already built: Profile → Your data → Delete all my data.

**Release train:** TestFlight (iOS) and Internal Testing (Play) → closed beta →
production. Budget 1–3 days per iOS review round and expect at least one
rejection on the first submission; it is normal.

---

## Rough timeline

| Stage | Elapsed |
| --- | --- |
| Phase 0 | 6–10 weeks |
| Phase 1 | 3–5 weeks |
| Phase 2 | 2–4 weeks |
| Phase 3 | 2–4 weeks including review |

**Roughly 3–5 months to a store listing via Path A**, assuming Phase 0 is the
long pole, which it is. Path B adds 3–5 months on top.

## What is already done

Worth knowing so it is not rebuilt:

- Phone-first design throughout; the desktop device frame only simulates it, so
  the layouts need no adaptation.
- Original mascot, and app icons generated from it at both required sizes.
- PWA manifest and standalone iOS launch.
- Account export and deletion, which both stores require.
- RLS on every table, plus plan-scoped profile access enforced server-side.
- A deterministic, client-side safety gate that never depends on the network.
- 172 tests over the rules that matter.
