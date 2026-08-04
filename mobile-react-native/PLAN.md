# Execution plan — React Native app

The native build of the app that lives in the repo root as a Next.js web app.
That web app is the specification: every screen, flow and product rule is
already decided and reviewed there. This is a port, not a redesign.

Read alongside:

- `../PROGRESS.md` — build log, every design decision with its reasoning
- `../SHIPPING.md` — store submission constraints, including two blockers
- `../REACT_NATIVE_BUILD.md` — the full brief this plan executes
- `TOOLCHAIN.md` — install hazards specific to this package

---

## Status

**Phase 0 complete.** Scaffold, toolchain, shared logic, design tokens.

| | |
| --- | --- |
| Expo SDK | 57, React Native 0.86, React 19.2.3, new architecture on |
| Router | expo-router, typed routes |
| Styling | NativeWind 4.2.6, tokens ported from `globals.css` |
| Backend | `@supabase/supabase-js`, sessions in SecureStore |
| Tests | 103 ported tests passing, including the 300-phrase safety corpus |
| Bundle | `expo export --platform ios` succeeds |

**Ported and passing (`src/lib/`):** the safety gate and its frozen corpus,
plans and tiers, record types, date grouping, filters, insight, the journeys,
notification derivation, the avatar generator, Zod schemas, and the complete
mock AI — extractor, answer engine, knowledge corpus, product scenarios.

**One deliberate change during the port.** `profiles/avatar.ts` returned a
base64 `data:` URI for an `<img src>`. React Native has neither `Buffer` nor
`<img>`, so it now returns raw SVG for `react-native-svg`'s `SvgXml`. Same
generator, same seeds, same faces.

---

## Phase 1 — shell and auth (2 weeks)

Screens: `/` splash · `/welcome` (4-panel carousel, journey picker) ·
`/sign-in` · `/who` · `/profile` · `/first-upload` · `/plan`

1. Port the motion vocabulary. `../src/components/ui/motion.tsx` is the whole
   set: `Drift`, `Settle`, `PulseRing`, `StaggerList`, `PopIn`, `PressRow`,
   `Meter`, `SpringSwitch`, `TapToWiggle`. Rewrite once in Reanimated and every
   screen follows. Honour `useReducedMotion` explicitly — Reanimated does not
   inherit the OS setting.
2. Port the primitives: `Button`, `Field`, `Sheet`. The web `Sheet` is a portal
   working around a stacking-context trap that does not exist here; use
   `@gorhom/bottom-sheet` or a plain modal instead.
3. Port the Sprout mascot to `react-native-svg`. Gradients port; filters do
   not. `../src/components/illustrations/sprout-flat.tsx` is the filter-free
   fallback if the shading does not survive.
4. Supabase auth against the existing project. Session in SecureStore, already
   wired in `src/lib/supabase/client.ts`.
5. Journey selection persists locally, not to a cookie. **It is a
   personalisation hint, never a clinical fact** — nothing downstream may read
   it as history or feed it to the model.

## Phase 2 — memory core (3 weeks)

Screens: `/scan` · `/scan/review` · `/records` · `/records/[id]` · `/home`

1. `expo-image-picker` for camera and library. Strip EXIF before upload — a
   photo of a prescription carries the GPS of the house it was taken in.
2. Upload to Supabase Storage. **The object key is server-generated** as
   `<user_id>/<profile_id>/<uuid>.<ext>`; storage policies match on the first
   segment, so a client-supplied path is a client-supplied authorisation
   decision.
3. Records list and timeline behind one segmented toggle, as on web.
4. Record detail keeps the structured/original toggle. Extraction can be wrong,
   and a screen that only shows the machine's reading with no way back to the
   page the lab printed is asking to be trusted more than it has earned.
5. Home: greeting, family switcher, insight row, Ask box, health summary.

## Phase 3 — the companion (2.5 weeks)

Screens: `/ask`, emergency escalation, family switcher

1. **The safety gate runs on device, before any network call, in the one send
   path.** Ported unchanged. Do not add a second route to the model.
2. Citations are tappable through to the record. A citation that cannot be
   checked is decoration.
3. Escalation still records the turn. An escalation that leaves no record is
   not auditable.
4. Family switcher enforces plan-scoped access — see Phase 4.

## Phase 4 — account (2.5 weeks)

Screens: `/settings` and its seven sub-screens, paywall, export, delete

1. **Plan-scoped profile access.** A family shares one `user_id`, so RLS cannot
   separate members. Every read path derives from `selectableProfiles()`.
   Locked members are preserved and shown as padlocks, never deleted.

2. **Move the entitlement-gated WRITES behind an Edge Function.** Carried over
   from Phase 2, and the one place the port lost a guarantee the web build had.

   On web these were server actions, so the plan check ran somewhere the client
   could not reach. Here the same checks run on the device:

   - `lib/records/upload.ts` — the `selectableProfiles()` check before filing a
     document against a member.
   - `lib/billing/quota.ts` — `consumeChat`, absent entirely for now, needed by
     Phase 3's chat.

   What still holds without it: storage policies bind the object key's first
   segment to `auth.uid()`, and RLS bounds every insert to the caller's own
   account. So the exposure is **paywall evasion within one's own family**, not
   cross-account access — a modified client could file records against a
   profile its plan does not cover. Real, bounded, and not a privacy breach.

   The fix is one Edge Function called with the user's own JWT that re-derives
   the entitlement server-side. Phase 3 needs it for `consumeChat` regardless,
   so the upload write should move behind the same function rather than growing
   a second mechanism.
3. Export and delete must both work. Stores require in-app account deletion.
4. Health profile completeness meter counts from the saved record, not live
   input.

## Phase 5 — native capability (3 weeks)

Not polish. Without these, App Store Guideline 4.2 rejects the app as a website
in a shell. See `../SHIPPING.md`.

1. Push: APNs and FCM. The Notifications screen already collects preferences
   against a delivery system that does not exist.
2. Biometric app lock (`expo-local-authentication`).
3. Native document scanner, not a file input.
4. Offline read of fetched records. A medical app that is blank on a train is
   worse than one that says "last synced 09:14".
5. Universal Links and App Links so `/records/<id>` opens in the app.

## Phase 6 — billing and store (4 weeks)

1. RevenueCat in front of StoreKit and Play Billing. **UPI cannot take payment
   for in-app features on iOS** — Guideline 3.1.1.
2. The entitlement read path is unchanged; only the writer becomes a validated
   receipt plus renewal, cancellation, refund and grace webhooks.
3. Store accounts, listings, privacy labels, TestFlight, review.

**Total: 13–17 weeks to a submittable build.**

---

## Rules

1. Read `../PROGRESS.md` before changing anything that looks odd. Most
   surprising decisions are recorded there with the reason.
2. Ported tests are the specification. If one fails, the port is wrong.
3. Semantic colour is health meaning only. Never a button, never a category
   tint. Broken twice on web, caught twice.
4. Never show one family member's data in another's context.
5. No health data in logs, URLs, query strings, or analytics.
6. The app does not diagnose. Copy implying it does is a bug.

## Open

- **Rename.** "Baymax" is Disney's character and blocks store submission. It is
  currently the Expo `name`, `slug`, `scheme` and both bundle identifiers.
  Change before creating any store account.
- Real OCR and model — separate track, contract in `../REACT_NATIVE_BUILD.md`.
- Rate limiting on auth and AI endpoints.
