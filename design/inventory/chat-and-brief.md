# Design inventory — Ask Baymax chat (E1/E2) & Pre-consult brief (F1)

Source of truth: the PNG renders in `design/screens/`. Where this file and any written
spec disagree, **the images win**.

## How to read the measurements

- Frames are iPhone mockups, ~853 x 1844 px, with a black device bezel.
- The live UI area maps to a **390 x 844 CSS px** viewport. Divide observed frame pixels
  by **~2.19** to get CSS px.
- All sizes below are CSS px and are **approximate (±2px)** — they were read off the
  renders, not exported from the source file. Treat them as strong guidance for
  proportion and rhythm, not as exact production values.
- **Colour caveat:** hex values below are visual estimates. `design/sample_tokens.py`
  exists specifically to measure them; run it (needs Pillow) before hard-coding tokens:
  `python3 design/sample_tokens.py "E1 Ask Baymax use case 1.png"`.
- **Text caveat:** body copy is rendered small in these mockups. Headings, button labels,
  chips and short strings are transcribed with high confidence. Long paragraph body copy
  and the fine print inside citation rows are marked `[verify]` where the glyphs are at
  the edge of legibility.

## Shared chrome (applies to every screen in this file except the chat-limit screen)

Top to bottom:

1. **Status bar** — 9:41, cellular/wifi/battery. Dynamic-Island pill notch. Height ~54px
   (safe-area top ~47–54px).
2. **Screen header** — back chevron `←` at left (~24px glyph, left inset 20px), then a
   two-line title block:
   - Line 1: screen title, ~26–28px, weight 700, near-black.
   - Line 2: subtitle, ~13px, weight 400, muted grey-purple.
     The header sits on a **soft lavender gradient hero** that bleeds behind a **3D white
     Baymax character render** on the right (~110–130px tall, partially cropped by the
     right edge, with small sparkle/star accents). The hero is decorative and non-
     interactive. On chat screens a small circular **history / clock-arrow icon** sits at
     the top-right (~24px).
3. **Privacy strip** — a full-width white/near-white rounded card, radius ~14px, 16px
   side margin, ~52px tall, ~12px internal padding. Contains a small rounded-square
   purple-tinted icon badge (~28px, radius 8px, shield/lock glyph), then two text lines:
   - **"Private & secure"** — ~13px, weight 600.
   - secondary line, ~11px, muted. On chat screens: **"Your health data is protected and
     never shared"**. On brief screens: **"Only you and your doctor can see this
     information."** (step 5 uses: **"Your files are encrypted and only visible to you
     and your doctor."**) `[verify — wording drifts slightly per screen]`
     Chat screens add a `›` chevron at the far right, so the strip is tappable there;
     the brief screens have no chevron (static reassurance).
4. **Bottom tab bar** — 5 slots, white, ~84px tall including home-indicator inset,
   hairline top border. Labels left→right: **Home**, **Documents**, _(centre FAB)_,
   **Ask Baymax**, **Profile**. The centre slot is a raised circular **purple FAB with a
   white `+`**, ~56px diameter, overlapping the bar by ~18px, with a soft purple glow
   shadow. The active tab is tinted purple (icon + label); inactive tabs are grey.
   On Ask Baymax screens the **Ask Baymax** tab is the active one.
5. **Home indicator** — black pill, centred, bottom.

### Colour roles (shared)

| Role                          | Approx value                          | Where it appears                                                    |
| ----------------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| Brand primary (purple/indigo) | `#5B4BE0` – `#6C5CE7`                 | Primary CTAs, FAB, active tab, selected chips, progress fill, links |
| Brand primary tint            | `#EEEBFD` – `#F1EEFE`                 | User bubbles, selected-chip fill, icon badges                       |
| App background                | `#F7F6FC` / white                     | Page background, gradient hero base                                 |
| Surface                       | `#FFFFFF`                             | Cards, assistant bubbles, input bar                                 |
| Border / hairline             | `#ECEAF3`                             | Card borders, chip outlines, dividers                               |
| Text primary                  | `#14121F` – `#1C1B2E`                 | Headings, bubble text                                               |
| Text secondary                | `#6E6B84`                             | Subtitles, helper text, timestamps                                  |
| **Green**                     | `#16A34A` / `#22C55E`, fill `#E9F9EF` | **"Safe" / normal / positive / actionable** — see per-screen notes  |
| **Amber**                     | `#F59E0B` / `#D97706`, fill `#FEF4E6` | **"Use with care" / "Moderate" severity**                           |
| **Red**                       | `#EF4444` / `#DC2626`, fill `#FDECEC` | **"Avoid" / out-of-range ("deficient") lab values**                 |
| Info blue/teal                | `#2563EB`, fill `#EEF3FE`             | Neutral "Note:" callouts, non-health information                    |

**Health meaning of the traffic-light colours — important:**

- **Green** never means "good news" generically. It means _within reference range_
  (labs), _safe for this profile_ (ingredient scan), or _this is a step you can take_
  (the "What you can do" block).
- **Amber** means _needs attention / conditional_ — an ingredient safe only in limits, a
  self-rated severity of "Moderate".
- **Red** means _out of reference range_ or _avoid_. In use case 3 the word
  **"deficient"** is rendered in red inline inside an otherwise-black sentence. Red is
  applied to the _word_, not the whole bubble — there is no red bubble anywhere.
- No screen in this set uses red for errors/validation; red is reserved for health
  semantics. Plan a separate token if you need destructive/error red.

---

# E1/E2 Ask Baymax chat

Screen title on all four chat screens: **"Ask Baymax"** with subtitle
**"Your AI health companion"**.

## Chat component anatomy (shared across E1 screens)

**Assistant (Baymax) bubble**

- Left aligned. A ~28px circular avatar with the Baymax face sits at the **left, aligned
  to the bubble's top edge**, with ~8px gap to the bubble.
- Bubble: white surface, ~1px `#ECEAF3` border, very soft shadow, **radius ~16px** with
  the **bottom-left corner tightened to ~4–6px** (tail toward the avatar).
- Max width ~76% of viewport (~285px). Internal padding ~12px 14px.
- Text ~13px / line-height ~19px, text-primary.
- Timestamp (e.g. **"9:41 AM"**) sits **below and left** of the bubble, ~10px, muted.
- A long answer is split into **several stacked bubbles** rather than one tall bubble —
  in use case 1 the assistant's reply is 4 separate bubbles with ~6px gaps, sharing one
  avatar and one trailing timestamp. This is a real composition rule, not a rendering
  artifact, and is easy to miss from a written spec.

**User bubble**

- Right aligned, no avatar. Fill = brand primary tint (`#EEEBFD`), **no border**,
  radius ~16px with the **bottom-right corner tightened to ~4–6px**.
- Same type size as assistant. Timestamp below-right, muted.
- An attached image/report renders **inside** the user bubble as a rounded thumbnail
  (radius ~10px) above the caption text (use case 2), or as an attachment row (use case 3).

**Date separator**

- Centred, tiny (~11px), muted, label **"Today"**, ~20px vertical margin, no rule line.

**Suggested-question / action chip row**

- A single **horizontally scrolling** row of pill chips, pinned directly **above** the
  input bar, ~34px tall, radius **full (999px)**, 1px border, white fill, ~12px label.
- The last chip in the row is visibly **clipped by the right edge** — deliberate affordance
  showing the row scrolls.
- Chips are prefixed with a small purple glyph (~14px).

**Input bar**

- White rounded container, radius ~24px, ~48px tall, 16px side margins, sitting above the
  tab bar with ~10px gap.
- Contents left→right: **two-line placeholder text**, a **camera icon**, and a circular
  **purple send button** (~34px, white arrow-up glyph).
- Placeholder (wraps to two lines, transcribed literally):
  **"Ask anything about health, reports,"** / **"medicines or your family..."**
- Use case 3's placeholder differs slightly: **"Ask anything about health, reports,"** /
  **"medicines or your family."** `[verify — trailing punctuation]`

**Global disclaimer**

- Centred, ~10–11px, muted grey, directly under the input bar, above the tab bar:
  **"Baymax gives health guidance, not medical advice."**
- This is a persistent footer on every chat screen. It is _outside_ the input bar.

---

## `E1 Ask Baymax use case 1.png` → "Ask Baymax" → mid-conversation, text-only Q&A (haemoglobin in pregnancy)

**State:** an active thread with one user question, a multi-bubble assistant answer, a
user follow-up, and a second assistant answer that includes a green checklist. No
citations block on this screen — this is the "conversational advice" variant.

### Layout top-to-bottom

| y (approx, CSS px) | Element                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| 0–54               | Status bar                                                                                           |
| 54–120             | Header: "Ask Baymax" / "Your AI health companion"; history icon top-right; Baymax hero render behind |
| 120–172            | Privacy strip                                                                                        |
| ~180               | "Today" date separator                                                                               |
| ~192–240           | User bubble #1 + timestamp                                                                           |
| ~252–430           | Assistant answer (4 stacked bubbles) + timestamp                                                     |
| ~440–486           | User bubble #2 + timestamp                                                                           |
| ~496–640           | Assistant answer #2 (paragraph + green checklist + closing question)                                 |
| ~650–684           | Suggested-chip row (horizontally scrolling)                                                          |
| ~692–740           | Input bar                                                                                            |
| ~746–760           | Disclaimer                                                                                           |
| ~760–844           | Tab bar + home indicator                                                                             |

### Exact visible text

Date separator: **"Today"**

User bubble #1:

> "Hi Baymax, I just got my wife's blood test result. Her hemoglobin is 10.1 g/dL, is that normal in pregnancy? I'm worried."

Timestamp: **"10:32 AM"** `[verify]`

Assistant reply, four consecutive bubbles:

1. > "I understand your concern. I'm here to help. 💜"
   > (ends with a purple heart emoji — the only emoji in the chat set)
2. > "A hemoglobin level of 10.1 g/dL is slightly low for pregnancy."
3. > "During pregnancy, Hb levels below 11 g/dL may indicate mild anemia."
   > "It's common and treatable with proper nutrition and iron supplements."
   > `[verify — may be two bubbles rather than one two-paragraph bubble]`
4. > "Has her doctor suggested any tests or recommended a follow-up?"

Timestamp: **"10:33 AM"** `[verify]`

User bubble #2:

> "Yes, doctor gave iron tablets. She also feels very tired these days. Is that because of this?"

Timestamp: **"11:04 AM"** `[verify]`

Assistant reply #2:

> "Yes, fatigue is a common symptom of anemia during pregnancy. Your body is working harder to support the baby."

> "Make sure she:"

Green checklist (each row: green ✓ glyph ~14px, 8px gap, ~13px label):

- **"Takes iron tablets regularly"**
- **"Eats iron-rich foods"**
- **"Stays hydrated and rests well"**

> "Would you like a list of iron-rich foods safe during pregnancy?"

Timestamp: **"11:05 AM"** `[verify]`

Suggested/action chip row (left→right, last one clipped):

- **"Iron-rich foods"** (leading purple icon)
- **"Understand my report"**
- **"Track this for her"**
- **"Reminde…"** — clipped; likely **"Reminder"** / **"Set a reminder"** `[verify]`

Note: these chips read as **actions on the answer**, not as suggested questions —
they carry verbs and object references, so treat them as an "answer actions" component.

### Colour notes for this screen

- The green ✓ marks are `#16A34A` on the white bubble — no green background pill.
  Green here means "recommended action", not "normal result".
- No amber or red appears; the borderline haemoglobin value is described in words
  ("slightly low") rather than colour-coded. Compare with use case 3, where the same
  class of information _is_ colour-coded. This inconsistency is real in the designs.

---

## `E1 Ask Baymax use case 2.png` → "Ask Baymax" → photo-led ingredient/product safety scan

**State:** user has sent a **photo of a product** with a question; Baymax returns a
structured **safety report card** rather than a chat paragraph. This is the richest
"card in a bubble" layout in the set.

### Layout top-to-bottom

| y (approx) | Element                                                           |
| ---------- | ----------------------------------------------------------------- |
| 0–54       | Status bar                                                        |
| 54–120     | Header + hero                                                     |
| 120–172    | Privacy strip                                                     |
| ~180       | "Today" separator                                                 |
| ~190–290   | User bubble with **image thumbnail** + caption + timestamp        |
| ~300–670   | Assistant response: intro line, then a full-width **result card** |
| ~680–712   | Chip row                                                          |
| ~720–768   | Input bar                                                         |
| ~772–786   | Disclaimer                                                        |
| —          | Tab bar                                                           |

### Exact visible text

User bubble:

> "Hi Baymax, is this body lotion safe for my pregnant wife and our toddler?"

The bubble contains a **product photo thumbnail** (~96 x 96px, radius ~10px) placed
**above** the caption text, right-aligned inside the bubble.
Timestamp: **"12:15 PM"** `[verify]`

Assistant intro (plain bubble):

> "Thanks for sharing! I've reviewed the ingredients and checked them for safety during pregnancy and for young children."

**Result card** (white, radius ~16px, 1px border, ~12–14px padding, full content width):

Card section 1 — **"Overall safety"** (~12px, weight 600, muted, left aligned)

- A green verdict block: rounded rect, green tint fill `#E9F9EF`, radius ~12px,
  ~64px tall, containing a **green shield-with-check icon** (~28px) at the left and:
  - **"Safe"** — ~18px, weight 700, green `#16A34A`, with a small sparkle glyph after it.
  - **"This product is generally safe for pregnant women and children."**
    — ~11px, text-secondary.
- Below the verdict, two small profile pills side by side:
  - **"Pregnancy"** / sub-label **"Safe"** (green)
  - **"Toddler"** / sub-label **"Safe"** (green)
    These are the **profile context pills** — they show _which family member the verdict was
    computed for_. Each is a small rounded chip (radius ~10px) with a tiny avatar/icon,
    the person label, and a coloured verdict word. This is the key composition idea:
    a single scan returns **per-profile verdicts**, not one global verdict.

Card section 2 — header row: **"Ingredient breakdown"** (~13px, weight 600) with a
right-aligned **legend** of three dot+label pairs:

- **● Safe** (green) **● Use with care** (amber) **● Avoid** (red)

Then a list of ingredient rows. Each row: coloured status icon at left (~18px circle:
green ✓ / amber ! / red ✕), ingredient name (~12px, weight 600), a second muted line of
description (~10px), and a right-aligned coloured status word.

Rows transcribed (`[verify]` on the descriptive second lines — smallest type on the screen):

1. **"Aqua (Water)"** — "Safe" — status **Safe** (green)
2. **"Glycerin"** — "Safe · Hydrating, skin-identical" — status **Safe** (green)
3. **"Caprylic/Capric Triglyceride"** — "Safe · Emollient, helps lock in moisture" — status **Safe** (green)
4. **"Dimethicone"** — "Safe · Barrier protectant, non-absorbing" — status **Safe** (green)
5. **"Avena Sativa (Oat Kernel) Extract"** — "Safe · Soothes irritated skin" — status **Safe** (green)
6. **"Phenoxyethanol"** — "Use with care · Preservative in low concentration" — status **Use with care** (amber)

Card footer — a green-tinted callout strip (radius ~12px, green tint fill) with a green
check icon:

- **"No major red-flag ingredients detected."** (~12px, weight 600)
- **"Always patch-test before first use. Discontinue if irritation occurs."** (~10px) `[verify]`

Chip row (left→right):

- **"What is Phenoxyethanol?"**
- **"Show full ingredient list"**
- **"Best lotions for pregnancy"**

Input bar as shared; note the send button is enabled/purple.

### Colour notes

- Exactly one **amber** row (Phenoxyethanol) and **zero red** rows — the design
  deliberately shows the "mostly safe with one caveat" case. Build the row component to
  handle all three states; only two are exercised here.
- The green verdict block and the green footer callout are two different components with
  the same tint — don't collapse them.

---

## `E1 Chat answer with citations reports led use case 3.png` → "Ask Baymax" → report-led answer **with citations**

## `... use case 3 copy.png` / `... use case 3 copy 2.png`

**These three files are byte-identical duplicates** (all 1,284,328 bytes, visually
identical). Treat as **one** screen; the `copy` files add no new information.

**State:** the user has attached a **PDF report** and asked what a value means. Baymax
returns a structured answer with an explicit **"Sources & citations"** block. This is the
canonical E2 "grounded answer" screen.

### Layout top-to-bottom

| y (approx) | Element                                                                          |
| ---------- | -------------------------------------------------------------------------------- |
| 0–54       | Status bar                                                                       |
| 54–120     | Header + hero                                                                    |
| 120–172    | Privacy strip                                                                    |
| ~180       | "Today" separator                                                                |
| ~190–275   | User bubble: text + **PDF attachment row** + timestamp                           |
| ~285–320   | Assistant bubble: "I've reviewed your report."                                   |
| ~320–390   | Result paragraph (with red inline "deficient")                                   |
| ~395–460   | **"⚠ What it means"** block                                                      |
| ~465–580   | **"✅ What you can do"** block with bullets                                      |
| ~585–630   | **"Note:"** info callout                                                         |
| ~635–715   | **"Sources & citations"** block, 3 rows                                          |
| ~720–760   | Full-width tinted CTA strip: "Would you like me to track your Vitamin D levels?" |
| ~765–800   | Action chip row (3 chips)                                                        |
| ~805–855   | Input bar                                                                        |
| —          | Disclaimer, tab bar                                                              |

### Exact visible text

User bubble:

> "Hi Baymax, I uploaded my blood test report. My Vitamin D is low (16 ng/mL). What does it mean and what should I do?"

**Attachment row inside the user bubble** — white sub-card, radius ~10px, ~44px tall:
red **PDF** file glyph (~24px) + filename **"Blood_Test_Report.pdf"** (~12px, weight 600).
Timestamp: **"9:32 AM"** `[verify]`

Assistant, first bubble:

> "I've reviewed your report."

Result paragraph:

> "Your Vitamin D (25-OH) level is 16 ng/mL, which is considered **deficient**. Optimal levels are 30–50 ng/mL."

- The single word **"deficient"** is rendered in **red** `#DC2626`, weight 600, inline.
  Everything else in the sentence is text-primary. `[this is the only inline-coloured word in the chat set]`

**"What it means" block** — amber/warning header:

- Header: **"⚠ What it means"** — amber triangle glyph + ~13px weight 700 label.
- Body:
  > "Low Vitamin D can lead to fatigue, low immunity, bone weakness, and mood changes. It's common because of low sun exposure, diet, or absorption issues."

**"What you can do" block** — green header:

- Header: **"✅ What you can do"** — green check-in-square glyph + ~13px weight 700 label,
  green `#16A34A`.
- Bulleted list (~12px, ~6px between items, bullet = small purple/green dot):
  - **"Vitamin D3 supplement: 2000–4000 IU daily for 8–12 weeks, then recheck."**
  - **"Get 15–20 minutes of sunlight daily (before 10 AM)."**
  - **"Include Vitamin D-rich foods: eggs, fatty fish, fortified milk."**
  - **"Recheck level after 3 months."**

**"Note:" callout** — info-blue tint card, radius ~12px, ~44px tall, small info/pill icon:

- **"Note:"** (weight 700) then
- **"Discuss this with your doctor before starting any high-dose supplements."**

**"Sources & citations" block** — this is the component that matters most here:

- Section label: **"Sources & citations"** — ~12px, weight 600, text-secondary, with a
  small book/link glyph.
- Three stacked **citation rows**, each ~34px tall:
  - A **numbered circular badge** at the left — **①**, **②**, **③** — ~18px, purple fill
    with white numeral (or purple outline with purple numeral).
  - Source text, ~11px, text-secondary, single line, ellipsised.
  - Rows are separated by a hairline, sit inside a light tinted container (radius ~12px).
- Row text (`[verify — smallest type in the whole set]`):
  1. **"Endocrine Society, Vitamin D Deficiency Guideline, 2011"**
  2. **"Indian MoH, Vitamin D deficiency in India, ICMR 2022"**
  3. **"Institute of Medicine (IOM), Dietary Reference Intakes for Calcium and Vitamin D, 2011"**
- **Citation chip anatomy:** number badge → source/publisher name → document/guideline
  title → year. No external-link icon and no thumbnail. They read as _provenance labels_,
  not as tappable outbound links, though they are almost certainly tappable.

**Tracking CTA strip** — full-width tinted (light purple) rounded strip, radius ~12px,
~40px tall, centred text:

> "Would you like me to help you track your Vitamin D levels?"

**Action chip row** (three chips, evenly spread, last one _not_ clipped here):

- **"Track this for me"**
- **"Remind me to recheck"**
- **"Share with doctor"**

### Developer surprises on this screen

- The assistant's answer is **not** a single bubble. It is a sequence of _typed blocks_
  (paragraph → warning block → action block → note → citations → CTA) that visually run
  together without individual bubble borders. Only the very first line
  ("I've reviewed your report.") has a distinct bubble outline. Model the answer as a
  **block list**, not as markdown inside one bubble.
- Three severity accents co-exist on one screen (red word, amber block, green block).
- The citation numerals do **not** appear inline in the answer text — there are no
  superscript `[1]` markers in the prose. The sources block is a flat, unanchored list.

---

## `E1 Chat limit maxed out for free user.png` → "Baymax" → free-tier chat quota exhausted / paywall

**⚠ This screen is visually a different design language from the other three E1 screens
and this will surprise anyone implementing from a spec.** Differences:

- Title is **"Baymax"** (not "Ask Baymax"), left-aligned next to the back chevron, with
  subtitle **"Your AI health companion"** on a second line at ~11px. Type is much smaller
  (~17px title vs ~27px elsewhere).
- **No lavender gradient hero and no large Baymax character render in the header.** The
  Baymax character instead appears small (~64px), inline, to the **right of the quota
  headline**, mid-page.
- Header right side has **two small outline icons** in a rounded container (looks like a
  shield/verified icon + a menu/more icon) instead of the single history clock icon.
- **No bottom tab bar and no FAB.** The page runs to the bottom safe area with only the
  message input. This is effectively a modal/takeover state.
- **No "Baymax gives health guidance, not medical advice." disclaimer.**
- Background is plain white/very light grey, not the lavender wash.

### Layout top-to-bottom

| y (approx) | Element                                                                   |
| ---------- | ------------------------------------------------------------------------- |
| 0–54       | Status bar                                                                |
| 54–100     | Compact header: `←` "Baymax" / "Your AI health companion" + 2 icons right |
| ~110–160   | Assistant bubble (greeting) + timestamp                                   |
| ~170–210   | User bubble + timestamp                                                   |
| ~220–275   | Assistant bubble + timestamp                                              |
| ~285–345   | **Quota headline block** + inline Baymax figure                           |
| ~350–380   | **"Get unlimited chats, personalised insights and more"** pill            |
| ~390–480   | Plan card 1 — Family Plan (**"Most popular"** ribbon)                     |
| ~488–555   | Plan card 2 — Solo Plan                                                   |
| ~562–630   | Plan card 3 — Daily Plan                                                  |
| ~640–660   | Footer legal + **"Restore Purchase"**                                     |
| ~670–715   | Message input bar                                                         |
| ~715–844   | Home indicator (no tab bar)                                               |

### Exact visible text — conversation

Assistant bubble 1 (avatar at left, white bubble):

> "Hi there! I'm Baymax. How can I help you with your health today?"

Timestamp: **"9:41 AM"**

User bubble (right, lavender):

> "I've been feeling anxious and my sleep has been really poor."

Timestamp: **"9:41 AM"** `[verify]`

Assistant bubble 2:

> "I'm sorry to hear that. I'm here for you. Can you tell me a bit more about how you've been feeling lately?"

Timestamp: **"9:41 AM"** `[verify]`

### Exact visible text — quota / paywall

Headline (~19px, weight 700, left aligned, near-black):

> "You've reached your free chat limit"

Sub-copy (~12px, text-secondary, two lines):

> "Free users can have 5 chats with Baymax. Subscribe to keep the conversation going."

Value pill (rounded-full, light purple tint fill, ~30px tall, small sparkle glyph at left,
~11px purple label):

> "Get unlimited chats, personalised insights and more"

**Plan cards** — three stacked cards, white, radius ~16px, 1px border, ~14px padding,
~10px gap. Each card: a rounded-square tinted icon badge at the left (~40px, radius 12px),
then plan name + one-line description + a feature list, then the price at the right, then
a full-width purple CTA button (radius ~12px, ~40px tall, white ~13px label).

**Card 1 — Family Plan** (has a purple **"Most popular"** ribbon/tag on its top-left,
and a purple 1–2px border instead of the grey hairline; a **"Save 20%"** tag sits at the
top-right):

- Name: **"Family Plan"**
- Description: **"For you and your loved ones"**
- Features (each with a small check):
  - **"Up to 6 family members"**
  - **"Unlimited chats"**
  - **"Shared insights & reports"**
- Price: **"₹899"** (~20px, weight 700), struck-through original **"₹1,749 billed yearly"**
  `[verify — the small strike-through line]`
- CTA: **"Choose Family Plan"**

**Card 2 — Solo Plan**:

- Name: **"Solo Plan"**
- Description: **"Personalised care, just for you"**
- Features: **"Unlimited chats"**, **"Personalised insights"**, **"Health tracking & reports"**
- Price: **"₹499"**, sub-line **"₹1,388 billed yearly"** `[verify]`
- CTA: **"Choose Solo Plan"**

**Card 3 — Daily Plan**:

- Name: **"Daily Plan"**
- Description: **"Flexible plan for short-term needs"**
- Features: **"Unlimited chats for 24 hours"**, **"Personalised insights"**, **"Cancel anytime"**
- Price: **"₹29"** with **"/day"** suffix `[verify]`
- CTA: **"Choose Daily Plan"**

Footer row: legal line at left (~10px, muted) — **"Auto-renews. Cancel anytime."** — and a
right-aligned purple text link **"Restore Purchase"**. `[verify]`

Input bar at the very bottom: rounded pill, ~44px, placeholder **"Message Baymax..."**,
circular purple send button at the right. **The input remains enabled-looking** — it is
not visually disabled or locked.

### How the quota moment is presented — and the pending question

- The paywall is **inline in the transcript**, not a modal sheet or a full-screen
  interstitial. The conversation scrolls above it and the plan cards simply continue the
  scroll. There is no scrim, no dismiss `✕`, and no "Maybe later" escape hatch visible.
- **The pending question is NOT visibly preserved.** The last message in the thread is
  _Baymax's_ reply ("Can you tell me a bit more about how you've been feeling lately?").
  There is no greyed-out/queued user bubble, no "your message will send after you
  subscribe" affordance, and no retry marker. The limit is hit at the moment the user
  would type their next message. If preserving a pending question is a product
  requirement, **the design does not show it** and you must raise it rather than invent
  the affordance.
- The input bar is still present and looks active, so the "blocked" state must be enforced
  on send (or the bar should be given a disabled treatment that the design does not
  currently specify).
- The copy says **"Free users can have 5 chats with Baymax"** — the quota unit is
  **chats/conversations, not messages**. Yet the visible thread contains 3 messages in one
  conversation, so the counter shown to the user and the counter in the copy need
  reconciling.

---

# F1 Pre-consult brief

A 6-file flow. Screen title is **"Pre-consult brief"** on every screen, with a per-step
subtitle. All steps carry the shared chrome (header + hero, privacy strip, bottom tab bar
with FAB), so the flow is **inside the tab shell, not a modal stack** — the user can
navigate away via the tab bar at any point.

## Shared step chrome

- **Step counter** at the top-right of the header, ~11px, text-secondary:
  **"Step 1 of 5"**, **"Step 2 of 5"**, … .
- Directly under the counter, a **segmented progress bar**: 5 short rounded segments
  (each ~18 x 4px, radius 2px, ~4px gap). Completed/current segments are brand purple,
  remaining are `#E4E1F2`.
- **Bottom action row**, ~16px above the tab bar:
  - Steps 2–6 have a secondary **"← Back"** button at the left: white fill, 1px border,
    radius ~12px, ~46px tall, ~90px wide.
  - The primary button fills the remaining width: brand purple, radius ~12px, ~46px tall,
    white ~14px weight-600 label, usually with a trailing `→`.
  - Step 1 has **no Back**; its primary button is full width.
- Section headings inside the body: ~14px weight 700, with a ~12px text-secondary helper
  line beneath.
- Optional sections are marked with the literal word **"(Optional)"** or a right-aligned
  **"Optional"** label in text-secondary.

### ⚠ Numbering discrepancy — read this before building

The six files are named "step 1"…"step 6", but the **in-UI counters only go to 5**:

| File   | In-UI counter                      | What it actually is                              |
| ------ | ---------------------------------- | ------------------------------------------------ |
| step 1 | Step 1 of 5                        | Capture concern                                  |
| step 2 | Step 2 of 5                        | Structured symptom questions                     |
| step 3 | Step 3 of 5                        | Editable review of answers                       |
| step 4 | Step 4 of 5                        | "What we'll share with your doctor" confirmation |
| step 5 | **Step 5 of 5**                    | Upload files & reports                           |
| step 6 | **Step 5 of 5** (bar fully filled) | Generated summary / share & export               |

So either step 6 is a **completion state of step 5** rather than a sixth step, or the
counter on one of the last two frames is a design error. Also note steps 3 and 4 are
**two consecutive review screens** — a genuine design decision (edit-in-place review,
then a final read-only "this is what your doctor sees" confirmation), not a duplicate.
Flag both with design before implementing.

---

## `F1 Pre-consult brief step 1.png` → "Pre-consult brief" → Step 1 of 5 — describe the concern

Subtitle: **"Help your doctor understand your concern better."**

### Layout & content

1. Header + step counter **"Step 1 of 5"** + progress bar (1/5 filled).
2. Privacy strip: **"Private & secure"** / **"This information is only visible to you and your doctor."**
3. Section: **"What would you like help with?"** (~14px, weight 700)
   - **Textarea**: white, radius ~14px, 1px border, ~110px tall, ~12px padding.
     Placeholder (two lines): **"Describe your symptoms, test results"** / **"or health concern..."**
   - **Character counter** bottom-right inside the textarea: **"0/500"** (~10px, muted).
     → The concern field is hard-capped at **500 characters**.
   - Below the textarea, a wrapping row of **quick-add suggestion chips** (pill, radius
     full, 1px purple-tinted border, white fill, ~30px tall, ~11px purple label, each with
     a small leading coloured dot/glyph):
     **"Fatigue"**, **"Low hemoglobin"**, **"Vitamin deficiency"**, **"+ Other"**
     The **"+ Other"** chip opens free entry.
4. Section: **"Related files & reports"** with a right-aligned **"(Optional)"** label.
   - **Upload dropzone**: dashed 1px border, radius ~14px, ~72px tall, centred content:
     purple upload/cloud glyph (~24px), **"Upload lab reports, prescriptions or images"**
     (~12px, weight 600) and **"PDF, JPG, PNG up to 10MB"** (~10px, muted).
   - **Attached-file row** below it: white card, radius ~12px, ~56px tall, red **PDF**
     glyph, **"Blood_Test_Report.pdf"** (~12px weight 600), sub-line
     **"2 pages · Uploaded just now"** (~10px muted), and a **`✕` remove** button at the right.
5. Section: **"Additional context"** with helper **"Help your doctor with some more details."**
   - Four tappable **key/value rows**, white cards, radius ~12px, ~48px tall, ~8px gap.
     Each row: small purple icon badge (~24px) → question label (left, ~12px) →
     current value (right, ~12px, weight 600) → `›` chevron.

     | Question                               | Value shown                            |
     | -------------------------------------- | -------------------------------------- |
     | **"When did this start?"**             | **"3 days ago"**                       |
     | **"How would you rate the severity?"** | **"Moderate"** — rendered in **amber** |
     | **"Any ongoing medication?"**          | **"Yes, 2 medications"**               |
     | **"Any allergies?"**                   | **"None"**                             |
     | **"Pregnancy status"**                 | **"Pregnant (1st trimester)"**         |

     (five rows total; the pregnancy row is conditional on profile.) `[verify — exact value strings]`
6. Primary CTA, full width: **"Continue"** (no arrow glyph on step 1) `[verify]`

### Colour notes

- **Amber** on **"Moderate"** is the only semantic colour on this screen and it carries
  self-reported **severity**, not a lab range. Severity scale is presumably
  Mild (green) / Moderate (amber) / Severe (red) — only Moderate is shown.

### How the user advances

Fill/skip the textarea (chips prefill it), optionally attach files, optionally answer the
context rows, tap **Continue**.

---

## `F1 Pre-consult brief step 2.png` → "Pre-consult brief" → Step 2 of 5 — structured symptom detail

Subtitle: **"A few more details to help your doctor prepare for you."**

### Layout & content

1. Header, counter **"Step 2 of 5"**, progress 2/5.
2. Privacy strip: **"Private & secure"** / **"Only you and your doctor can see this information."**
3. Section: **"Tell us about your symptoms"** / helper **"Add any details that can help your doctor understand better."**
   - Five key/value rows (same anatomy as step 1's context rows: icon badge, question,
     right-aligned answer, `›`):

     | Question                               | Value                      |
     | -------------------------------------- | -------------------------- |
     | **"When did this start?"**             | **"3 days ago"**           |
     | **"How would you rate the severity?"** | **"Moderate"** (amber)     |
     | **"How often does it occur?"**         | **"Several times a day"**  |
     | **"Where do you feel it?"**            | **"Head, Body"**           |
     | **"What makes it better or worse?"**   | **"Rest makes it better"** |

4. Section: **"Symptom timeline"** / helper **"Select all that apply."** `[verify]`
   - A row of **4 selectable tiles**, radius ~12px, ~64px tall, equal width, 8px gap.
     Each tile: small icon on top, bold label, tiny sub-label:
     - **"Just started"** / **"< 24 hrs"** — **selected**: purple 1.5px border + light
       purple fill + purple text, with a small purple check badge at the tile's top-left.
     - **"Recent"** / **"2–7 days"**
     - **"Ongoing"** / **"1–4 weeks"**
     - **"Long-term"** / **"1+ month"**
       `[verify — sub-labels are the smallest type here]`
   - Note: only **one** tile is selected despite "Select all that apply" — it behaves as a
     single-select segmented control. Treat as single-select.
5. Section: **"Add any additional symptoms"** / helper **"Select all that apply."**
   - A **search field**: white, radius ~12px, ~40px tall, magnifier glyph, placeholder
     **"Search symptoms"**.
   - A wrapping grid of **symptom chips** (~34px tall, radius full, 1px border, leading
     glyph + label). Selected chips get purple fill-tint, purple border and a small
     purple **✓** badge; unselected are white with grey border.
     Row 1: **"Fatigue"** (selected), **"Headache"** (selected), **"Nausea"**, **"Dizziness"**
     Row 2: **"Body ache"** (selected), **"Fever"**, **"Sore throat"**, **"Other"**
     → three selected: Fatigue, Headache, Body ache. This matches the "Symptoms you
     selected" list on step 3 (which shows 5 — see the discrepancy note there).
6. Section: **"Anything else you want your doctor to know?"** with right-aligned
   **"Optional"**.
   - Textarea, radius ~14px, ~80px tall, placeholder **"Add any extra details..."**,
     counter **"0/500"** bottom-right.
7. Action row: **"← Back"** + **"Continue →"**

### How the user advances

Answer/confirm the five rows (each opens a picker), pick one timeline tile, multi-select
symptom chips, optionally add free text, tap **Continue →**.

---

## `F1 Pre-consult brief step 3.png` → "Pre-consult brief" → Step 3 of 5 — editable review

Subtitle: **"Almost done! Review your information before we prepare your summary."**

### Layout & content

1. Counter **"Step 3 of 5"**, progress 3/5.
2. Privacy strip (same as step 2).
3. Section: **"Your summary"** / helper **"Here's what we've captured. You can edit anything before continuing."**
   - Five **review rows** in one white card (radius ~14px), each row ~48px, divided by
     hairlines. Each row: purple icon badge → label (weight 600, ~12px) → value on a
     second line (~11px, text-secondary) → **purple pencil ✎ edit icon** at the far right.

     | Label                 | Value                                                                                              |
     | --------------------- | -------------------------------------------------------------------------------------------------- |
     | **"Duration"**        | **"Started 3 days ago"**                                                                           |
     | **"Severity"**        | **"Moderate"** — value shown as an **amber pill chip**, followed by **"You rated it as Moderate"** |
     | **"Frequency"**       | **"Several times a day"**                                                                          |
     | **"Location"**        | **"Head, Body"**                                                                                   |
     | **"Better or worse"** | **"Rest makes it better"**                                                                         |

     Note: the Severity row renders "Moderate" **twice** — once as an amber pill and once
     inside the descriptive sub-line. That is what the render shows.
4. Section: **"Symptoms you selected"**
   - Read-only chips in two rows, each with a leading glyph and a small **✕**-free look;
     they are non-removable here (edit happens via the pencil):
     **"Fatigue"**, **"Headache"**, **"Body ache"**, **"Nausea"**, **"Dizziness"**
     → **5 chips, but step 2 showed only 3 selected.** Real inconsistency across frames;
     assume the data model allows 5 and treat step 2's render as illustrative.
5. Section: **"Attached files"**
   - File row: red PDF glyph, **"Blood_Test_Report.pdf"**, sub-line
     **"2 pages · Uploaded just now"**, and an **eye 👁 preview icon** at the right
     (note: preview here, vs. **✕ remove** on step 1 — different affordance).
   - Below it a dashed **"+ Add more files"** row with sub-line
     **"Lab reports, prescriptions or images."**
6. Section: **"Anything else you want your doctor to know?"** with **"Optional"**.
   - A **quote-styled** block: light purple tint fill, radius ~12px, a large purple
     opening-quote glyph at the top-left, body text:
     > "This has been affecting my sleep and work. I've been feeling more tired than usual."
   - This is the user's free text from step 2 shown back as a styled quotation, not as an
     editable textarea.
7. Action row: **"← Back"** + **"Continue to next step →"**

### How the user advances

Optionally tap any pencil to jump back and edit that single field, then
**Continue to next step →**.

---

## `F1 Pre-consult brief step 4.png` → "Pre-consult brief" → Step 4 of 5 — doctor-facing confirmation

Subtitle: **"Review your information before we prepare your summary."**

Same information as step 3 but reframed from the **doctor's** point of view and with a
different card style. The section heading is the tell.

### Layout & content

1. Counter **"Step 4 of 5"**, progress 4/5.
2. Privacy strip.
3. Section heading (~14px weight 700): **"Here's what we'll share with your doctor"**
   - Five rows in a white card, each: purple icon badge → question text (the _original
     question wording_, not a field name) on line 1 → answer on line 2 → and at the right
     a **"Edit ✎"** control (the word "Edit" in purple ~11px **plus** the pencil glyph —
     unlike step 3 which shows the pencil alone).

     | Question                               | Answer                     |
     | -------------------------------------- | -------------------------- |
     | **"When did this start?"**             | **"3 days ago"**           |
     | **"How would you rate the severity?"** | **"Moderate"**             |
     | **"How often does it occur?"**         | **"Several times a day"**  |
     | **"Where do you feel it?"**            | **"Head, Body"**           |
     | **"What makes it better or worse?"**   | **"Rest makes it better"** |

     Note: on this screen **"Moderate"** appears in plain text, **not** amber. The severity
     colour treatment is inconsistent between step 3 and step 4.
4. Section: **"Symptoms included (5)"** — the count is in the heading.
   - Chips with a **purple ✓ badge on each**: **"Fatigue"**, **"Headache"**, **"Body ache"**,
     **"Nausea"**, **"Dizziness"**
5. Section: **"Attached file"** (singular here; step 3 used the plural "Attached files")
   - Row: PDF glyph, **"Blood_Test_Report.pdf"**, **"2 pages · Uploaded just now"**,
     **eye 👁** preview at the right. No "add more" affordance on this screen.
6. Section: **"Additional note"** with **"Edit ✎"** at the right.
   - Quote-styled block, same styling as step 3:
     > "This has been affecting my sleep and work. I've been feeling more tired than usual."
7. **Privacy reassurance callout** — light purple tint card, radius ~12px, ~52px tall,
   purple shield glyph at the left:
   > "This summary will be shared with your doctor before the consultation to help them understand your concern better."
8. Action row: **"← Back"** + **"Continue to next step →"**

### How the user advances

Read the doctor-facing version, use any **Edit** to correct a single field, then
**Continue to next step →**.

---

## `F1 Pre-consult brief step 5.png` → "Pre-consult brief" → Step 5 of 5 — upload files & reports

Subtitle: **"Upload any files or reports that can help your doctor understand better."**

The Baymax hero render on this screen is **different from the other steps** — Baymax is
shown holding a clipboard/folder with a small red medical cross, i.e. an
upload/records-specific illustration. Don't reuse one static hero image for the whole flow.

### Layout & content

1. Counter **"Step 5 of 5"**, progress 5/5 (all segments purple).
2. Privacy strip with the **file-specific** copy:
   **"Private & secure"** / **"Your files are encrypted and only visible to you and your doctor."**
3. **Large dropzone card** — white, radius ~16px, **dashed** 1.5px purple-tinted border,
   ~200px tall, centred stack:
   - Purple folder/upload illustration (~56px).
   - **"Upload files & reports"** — ~15px, weight 700.
   - **"Lab reports, prescriptions, discharge summaries, immunization records, or any relevant documents."** — ~11px, text-secondary, centred, 2 lines.
   - Primary purple button, radius ~10px, ~40px tall, ~150px wide, upload glyph +
     **"Upload files"**.
   - **"PDF, JPG, PNG up to 10MB each"** — ~10px, muted, under the button.
     → note the **per-file** 10MB cap wording differs from step 1's **"up to 10MB"**.
4. Section: **"Uploaded files (1)"** — count in the heading.
   - File row: red PDF glyph, **"Blood_Test_Report.pdf"**, sub-line
     **"2 pages · Uploaded just now"**, **`✕` remove** at the right.
5. Section: **"You can upload"** — an **8-tile grid, 4 columns x 2 rows**, each tile white,
   radius ~12px, ~72px tall, containing a purple outline icon (~22px) above a ~10px
   centred, possibly two-line label:
   - Row 1: **"Lab reports"**, **"Prescriptions"**, **"Discharge summaries"**, **"Imaging reports (X-ray, MRI, CT)"**
   - Row 2: **"Immunization records"**, **"Health checkup reports"**, **"Doctor notes or letters"**, **"Other documents"**
     These are **informational category examples**, not selectable filters — they have no
     selected state anywhere in the set.
6. **Reassurance callout** — light purple tint, radius ~12px, shield glyph:
   > "We use best-in-class encryption and never share your data without your permission."
   > `[verify]`
7. Action row: **"← Back"** + **"Review & finish →"** — note the primary label changes here.

### How the user advances

Optionally upload more files, then **Review & finish →**.

---

## `F1 Pre-consult brief step 6.png` → "Pre-consult brief" → generated summary / share & export (counter still reads "Step 5 of 5")

Subtitle: **"Review your summary before sharing with your doctor."**

Hero: Baymax with a **purple check/verified badge** overlay — the "done" variant.

### Layout & content

1. Counter **"Step 5 of 5"**, progress bar **fully filled** (all 5 segments purple).
2. Privacy strip: **"Private & secure"** / **"This summary is encrypted and only you and your doctor can access it."**
3. **Summary document card** — white, radius ~16px, 1px border, ~14px padding:
   - Left: large red **PDF** file glyph (~36px).
   - **"Your pre-consult summary"** — ~15px, weight 700.
   - **"Generated on 15 May 2025 · 6 pages"** — ~11px, text-secondary. `[verify — date/page count]`
   - A **green pill badge** below: green tint fill, radius full, ~22px tall, small lock
     glyph + **"Encrypted & secure"** in green `#16A34A`, ~10px.
     → Green here means **security state**, not a health value. This is the one place
     green carries a non-health meaning; keep the token but be aware of the overload.
4. **Two-column region:**
   - Left column: **"Summary includes"** — 5 rows, each a small purple icon badge + a
     bold label + a muted description line:
     - **"Symptoms & timeline"** — **"What you're experiencing and since when."**
     - **"Severity & frequency"** — **"How severe and how often."**
     - **"Location & impact"** — **"Where you feel it and how it affects you."**
     - **"Better or worse factors"** — **"What makes it better or worse."**
     - **"Attached files & reports"** — **"1 file attached."**
       `[verify — description lines]`
   - Right column: a **preview card** of the actual brief — a miniature white document
     with a small Baymax header, the heading **"Pre-consult Summary"**, a few grey
     placeholder lines, patient/date metadata, and a purple document glyph in the middle.
     Radius ~12px, 1px border, ~150px tall. It is a **visual thumbnail preview**, not
     legible content.
5. **Tip callout** — light purple tint card, radius ~12px, lightbulb glyph, with a
   **dismiss `✕`** at the right:
   > "Tip: Download or share this summary and take it to your doctor for a helpful hospital consultation."
   > `[verify]`
6. Section: **"What would you like to do?"**
   - A **2x2 grid of action tiles**, each white, radius ~12px, ~76px tall, purple outline
     icon (~22px) above a ~11px weight-600 label and a ~9px muted sub-label:
     - **"Download PDF"** / **"Save to device"**
     - **"Share"** / **"Share with doctor"**
     - **"Print"** / **"Print for your appointment"**
     - **"Save to Baymax"** / **"Save in Baymax Records"** `[verify sub-labels]`
7. **Footer reassurance strip** — green-tinted, radius ~12px, small green check/shield:
   > "Your information is safe with Baymax. We never share it without your permission."
   > `[verify]`
8. Action row: **"← Back"** + a primary purple button with a check glyph + **"All set!"**
   (the only primary CTA in the flow with an exclamation mark and no `→`).

### How the user advances

This is terminal. **"All set!"** exits the flow (presumably back to Home or to the saved
brief). The four action tiles are side-effects available before exiting.

---

# Cross-cutting notes a written spec would miss

1. **The Baymax hero illustration is not one asset.** At minimum three variants appear:
   plain/waving (chat + brief steps 1–4), holding a clipboard with a red cross (brief
   step 5), and with a purple verified badge (brief step 6). Chat use case 2 and 3 reuse
   the plain variant.
2. **The chat-limit screen is a different design language** (no gradient hero, no tab bar,
   no FAB, no disclaimer, smaller header). Either it is from an earlier/later design pass
   or it is intentionally a takeover. Confirm before harmonising it — harmonising it would
   be a fidelity regression if intentional.
3. **Three of the twelve files are byte-identical** (`use case 3`, `copy`, `copy 2`).
   Only one screen to build.
4. **Long assistant answers are multi-bubble / multi-block**, not one markdown blob.
5. **Chips are used for four different jobs** with near-identical styling: answer actions
   (chat), input suggestions (brief step 1), multi-select symptoms (brief step 2), and
   read-only summary tags (brief steps 3–4). They need different components despite
   looking the same. The distinguishing signals are the leading glyph and the presence of
   a ✓ badge.
6. **The pencil/edit affordance changes label between step 3 (✎ only) and step 4
   (Edit ✎)**, and the file-row trailing icon changes between ✕ (steps 1, 5) and 👁
   (steps 3, 4). These are state-dependent, not arbitrary: ✕ where the file is still being
   collected, 👁 where the brief is being reviewed.
7. **Severity "Moderate" is amber on steps 1 and 3 but plain text on step 4.** Pick one
   and confirm with design.
8. **Selected-symptom count differs between step 2 (3 chips) and steps 3–4 (5 chips).**
   Mock data inconsistency across frames — do not encode either as truth.
9. **Character counters** appear as `0/500` on both free-text fields — the counter shows
   `0` even where placeholder text is present, i.e. it counts entered characters only.
10. **The 500-char cap, the 10MB file cap, and the "5 free chats" quota** are the only hard
    numeric limits stated anywhere in these screens. All are user-visible copy and must be
    kept in sync with backend enforcement.
11. **Currency is INR (₹)** and pricing is monthly headline with a yearly billed sub-line.
12. The brief flow lives **inside the tab bar shell**, so partial-progress persistence /
    resume is implicitly required — the user can leave mid-flow via a tab at any step.
