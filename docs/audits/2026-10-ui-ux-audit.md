# Cheeku UI/UX audit, October 2026

Audit of the whole Expo app (web build, iPhone 17 size, demo family) using the
design skills in `.claude/skills`: emil-design-eng, improve-animations,
find-animation-opportunities, animate-expo, apple-design, break-ui and
mobile-native. 38 screens captured against a fake backend, 9 of them again with
worst-case data, plus a sweep of the motion and styling code.

What this could not judge: anything that needs a phone (haptic timing, gesture
feel, 120fps, Dynamic Type at the largest sizes, keyboard behaviour). Those are
called out where they matter.

## Verdict

The base is good. The lavender glass palette, the mascot, the Instrument Serif
accent and the warm copy already read as one product, and the motion code is
well built: Reanimated on the UI thread everywhere, reduced motion respected in
every motion component, native stack transitions, no sliding tabs.

What keeps it from feeling premium is consistency, not ideas:

1. **Sheets feel like web modals.** The dim backdrop slides up with the sheet,
   and every sheet shows a grabber that cannot be dragged.
2. **The app is silent in the hand.** No haptics anywhere, and only about a
   third of tappable things react to a press, each with a different strength.
3. **The design system has drifted.** 56 font sizes, 42 corner radii, 151
   one-off hex colours, and two competing primary button colours.
4. **Alarm language is loud.** "High priority" in red on every flagged lab
   report, against the content system's calm tone.
5. **A handful of real bugs** (below) that a reviewer would spot in a minute.

Fix 1 to 3 and the app moves from "nice" to "expensive". None of it is a
redesign.

## Top fixes, in order of leverage

| # | Severity | Area | Finding | Fix | Effort |
|---|---|---|---|---|---|
| 1 | High | Sheets | 13 bottom sheets use `<Modal animationType="slide">` with the scrim inside, so the dark backdrop slides up with the sheet. Each draws a grabber but none can be dragged (`src/components/family/tray.tsx:107`, `ui/confirm-sheet.tsx:60`, `today/sheets.tsx:28`, `records/filter-bar.tsx:256` and 9 more). | One shared `<Sheet>`: Modal `animationType="none"`; scrim fades `opacity 0 to 1`, 200ms, `Easing.bezier(0.23, 1, 0.32, 1)`; sheet enters `translateY('100%') to 0` with `withSpring({ duration: 300, dampingRatio: 0.8 })`; `Gesture.Pan` drag-to-dismiss on velocity or distance, rubber-band when dragged up. Exit faster than enter. | M |
| 2 | High | Feel | No haptics at all (`expo-haptics` not installed). | Add `expo-haptics`. `selectionAsync` on pillar chips, segmented controls, member pick; `impactAsync(Light)` on Mark done, sheet snap; `notificationAsync(Success)` on booking confirmed, report filed, streak day complete; `impactAsync(Medium)` on Delete. One per action, same frame as the visual, never on scroll. | S |
| 3 | High | Press feedback | 315 `Pressable`s, about 106 with any press state, using 9 different scales (0.92 to 0.992) that snap instantly. The tab bar items have none. | One `<Tap>` primitive: `scale 0.97` (cards `0.98`), Reanimated CSS transition `transform 120ms cubic-bezier(0.23, 1, 0.32, 1)`, feedback on press-in. Replace raw `Pressable` screen by screen. | M |
| 4 | High | Motion | `ZoomIn` (scale from 0) with bouncy springs (damping 10 to 14) on the family tray, which opens tens of times a day, and on add-member, member page, lab booking confirmed. `PopIn` starts at scale 0.5. | Tray: no entrance beyond the sheet itself. Elsewhere `FadeIn` + scale `0.95 to 1`, 200ms ease-out. Keep a bounce only on the rare success moment (booking confirmed). | S |
| 5 | High | Design system | 32 inline `fontSize`s + 24 `text-[px]` sizes, 42 `borderRadius` values, 151 inline hex colours. Primary CTAs are purple (`brand-600`, 38 uses) or near-black (`ink-900`, 26 uses), sometimes side by side (Choose a lab: "Book with HomeCheck" purple, "Book with Prime" black). | Type scale 12 / 13 / 15 / 17 / 20 / 24 / 28 / 34 + display; radius scale 8 / 12 / 16 / 24 / 32 / pill; colours only from `theme/tokens.ts`. One primary: filled `brand-600`. Secondary: white or glass. `ink-900` only for the centre + button. Enforce with a lint rule on raw hex and `fontSize`. | L |
| 6 | Medium | Health language | Records list tags every flagged lab report "High priority" in red; Health file says "High"; Home says "Family alert" in red caps; elsewhere "Worth a look". | One ladder from the content system: In range, Worth a look, Talk to your doctor. Red only for "go now". Same words on every screen. | S |
| 7 | Medium | Today | "0 of 15 done": 15 equal-weight cards, a "Healthy living" chip on every one, a black button on every one. | Show the 3 that matter now, fold the rest under "Later today". Drop the repeated chip. Progress as a ring in the header. Pairs with goal cards (`loop-goal-cards`). | M |
| 8 | Medium | Materials | "Glass" is a translucent fill with no blur (`expo-blur` not installed), so the floating tab bar and sticky headers look muddy over content. | Static `BlurView` (never animate its intensity) behind the tab bar and sheet headers, bright 1px top edge; solid fallback when Reduce Transparency is on. | S |
| 9 | Medium | Loading | 46 `ActivityIndicator` spinners, 2 skeletons. | Skeletons shaped like the real cards on Home, Records, Health file, Ask. Keep the persisted cache on screen while refreshing. | M |
| 10 | Medium | Motion budget | Perpetual loops on screens seen daily: mascot breathing and float, the "Open now" pulse (`home/care.tsx:112`), notification dot pulse (`notifications/parts.tsx:269`). Entrances replay on every visit (`ui/motion.tsx` `useEnter` 380ms, `Reveal` 560ms, settings rows stagger). | Loops stop after two cycles or play only on first view of the day. Entrances once per session. Two `Easing.in(quad)` exits (`mascot/lottie.tsx:391`, `onboarding/motion.tsx:132`) become `Easing.bezier(0.23, 1, 0.32, 1)` at 200ms. | S |

## Bugs found

| # | Where | What happens | Fix |
|---|---|---|---|
| 1 | `app/today.tsx:146` | Header reads "Made for your what's due." | Rephrase, e.g. "Built around what's due." when `builtFrom` holds a due item. |
| 2 | `src/lib/memory/starters.ts:38` | Ask chip reads "How has Rajesh's hba1c changed?" The all-caps check misses "HbA1c". | Keep the marker's display name as stored; only lowercase plain words. |
| 3 | `app/(app)/ask.tsx:387` | With no messages, the thread still scrolls to the end, so Ask opens with the mascot cut off under the chips. | Only `scrollToEnd` when `messages.length > 0`; centre the empty intro. |
| 4 | Health file, conditions | A long condition ("Type 2 diabetes mellitus with peripheral neuropathy") runs off the right edge, clipped. | Let condition pills wrap to new rows. |
| 5 | Records filter | The member chip shows the full name, pushing "All types" and "All time" off screen. | First name in the chip. |
| 6 | Records rows | When filtered to one person, every row repeats their full name, truncated. | Drop the name when one member is selected. |
| 7 | Choose a lab | With an empty cart each lab shows "₹0" and "5 labs do all of it". | Hide prices and the claim until a test is in the cart. |
| 8 | Sign in | Three disabled "SOON" buttons (Google, Apple, Phone). | Hide until live; an unfinished option reads as an unfinished app. |
| 9 | Scan, Labs, Services | Option subtitles and test names truncate mid-word ("Complete blood count (...", "From your prescription to your..."). | Wrap to two lines; never truncate a test name or anything people compare. |
| 10 | Welcome | Large empty band between the chat bubbles and the copy. | Tighten the vertical rhythm or let the mascot fill it. |

## Motion review (Before / After / Why)

| Before | After | Why |
|---|---|---|
| Scrim inside a sliding `Modal` | Scrim fades 200ms, sheet springs `{ duration: 300, dampingRatio: 0.8 }` | The backdrop is a layer, not part of the sheet; sliding it reads as a web modal |
| Grabber with no gesture | `Gesture.Pan` dismiss on velocity or distance | An affordance that does nothing breaks trust |
| `ZoomIn.springify().damping(12)` on tray avatars | No entrance (tray is tens/day) | Frequent UI should be instant; scale from 0 looks like it comes from nowhere |
| `PopIn` from `scale 0.5` | From `scale 0.95` + opacity | Nothing appears from nothing |
| `pressed ? 0.92 ... 0.992` snapping | One `scale 0.97`, 120ms strong ease-out | Consistent, felt but not seen |
| Tab bar items with no press state | Same `<Tap>` + `selectionAsync` | The most-tapped controls in the app |
| `Easing.in(Easing.quad)` exits | `Easing.bezier(0.23, 1, 0.32, 1)`, 200ms | Ease-in delays the moment the eye is on |
| Infinite pulse on "Open now" | Two pulses, then still | Perpetual motion on a daily screen becomes noise |
| Entrance stagger on every visit | Once per session | Repeated entrances make navigation feel slow |

## Animation opportunities (passed the gate)

| # | Where | Today | Purpose | Frequency | Motion |
|---|---|---|---|---|---|
| 1 | Today card "Done" | Card stays, button changes | State indication | Several a day | Check morphs in, card collapses with `itemLayoutAnimation` 220ms ease-out, `impactAsync(Light)` |
| 2 | Streak day completes | Static ring | Delight | Once a day | Ring fill 400ms ease-out, `notificationAsync(Success)`, mascot cheer once |
| 3 | Booking confirmed, report filed | Static confirmation | Delight | Rare | Existing mascot Lottie plays once with a Success haptic; this is where bounce belongs |
| 4 | Member switch | Content swaps | Preventing a jarring change | Several a day | 160ms crossfade with a 2px blur mask, no movement |

Rejected: tab switches (already instant, correct), Records list row entrances
(frequent, functional), pillar chip changes (tens a day), animated numbers on
Health file values (data people read and compare).

## Worst-case data (break-ui)

Run with names like "Lakshminarayanan Venkatasubramanian", "Rajeshwar Prasad
Srivastava-Bhattacharya", "Jo", a father-in-law, long conditions, a long
hospital and doctor name.

| # | Severity | Field | Worst case | What happens | Fix |
|---|---|---|---|---|---|
| 1 | Broken | Health file conditions | "Type 2 diabetes mellitus with peripheral neuropathy" | Pill runs off screen, clipped | Wrap pills |
| 2 | Ugly | Records member chip | Full long name | Other filters pushed off screen | First name |
| 3 | Ugly | Record row meta | Full name on every row | Truncated, repeated noise | Omit when filtered |
| 4 | Fragile | Doctor and facility names | 40+ characters | End-truncated with no way to read in full on that card | Two lines, or full name on tap |

Held up well: greeting with a long name, the family pill, the tray tiles, "Jo",
"Father-in-law", pluralisation ("1 report"), the Health file title wrapping to
three lines.

## Web build (mobile-native)

The Vercel build has no `app/+html.tsx`, so it ships without `theme-color`,
`-webkit-tap-highlight-color: transparent`, `overscroll-behavior: none` and 16px
input fonts. Add the baseline from the mobile-native skill. Small, and it matters
for anyone opening the web link on a phone.

## Accessibility notes

- Reduced motion is honoured across all motion components. Good.
- No `maxFontSizeMultiplier` anywhere and many fixed heights (buttons 52pt):
  test at the largest Dynamic Type size on a phone; cap only the tab bar labels.
- No dark mode. Fine for launch; worth a V2 entry.

## Suggested order

1. Quick wins (a day): the 10 bugs, haptics, `ZoomIn` and loop fixes, severity
   words, web baseline.
2. Primitives (two to three days): `<Sheet>`, `<Tap>`, blur material,
   skeletons.
3. System (a week, can run alongside features): type, radius and colour scales,
   one primary button, lint rule, then migrate screen by screen.
4. Today density, with goal cards.

Everything above needs a feel-check on a real phone (release build, an older
Android too) before it counts as done.
