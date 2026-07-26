# Design Inventory — Records, Timeline & Document Processing

Source images: `design/screens/*.png` (iPhone mockup renders, ~853×1844 px; black bezel around a live UI area equal to a **390×844 CSS viewport**; divide observed device px by **~2.19** for CSS px).

All sizes below are **estimates derived by eye from the renders** — treat them as a starting grid, not exact tokens. Colour hexes are approximations of what is visible; roles are exact.

---

## Shared design language (applies to all 5 screens)

| Role                                           | Observed                                                                         | Approx. hex            |
| ---------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------- |
| App background                                 | very light lavender-grey, not pure white                                         | `#F5F4FA`              |
| Card / row surface                             | pure white                                                                       | `#FFFFFF`              |
| Primary brand                                  | deep indigo-violet (buttons, FAB, active tab, active chip, progress ring, links) | `#5B3DF5` – `#6C4CF1`  |
| Brand tint surface                             | pale violet wash used for "AI insight" / reassurance cards                       | `#EFEBFE`              |
| Text primary                                   | near-black with a violet cast                                                    | `#141126`              |
| Text secondary / meta                          | mid grey                                                                         | `#8A879A`              |
| Divider / chip border                          | very light grey                                                                  | `#E8E6F0`              |
| Success / "Normal" / "Good"                    | green text on pale green pill                                                    | `#16A34A` on `#E7F7EE` |
| Caution / "Borderline" / "Needs attention"     | amber-orange text on pale amber pill                                             | `#F59E0B` on `#FEF3E2` |
| Danger / "High risk" / "Low" / "High priority" | red text on pale red pill                                                        | `#EF4444` on `#FDECEC` |

- Corner radii: cards & rows **~14 px**, icon tiles **~10 px**, status pills **fully rounded (~11 px)**, filter chips **fully rounded (~17 px)**, primary buttons **fully rounded / ~26 px**.
- Screen horizontal padding: **16 px**. Inner card padding: **12–16 px**.
- Status bar always shows `9:41` with signal / wifi / battery glyphs (mockup chrome, not app UI).
- **Bottom tab bar** (present on D1, D2/Timeline, OCR review, Report details — **absent on the Processing screen**): height ~64 px + home-indicator inset. Four labels — **Home, Documents, Ask Baymax, Profile** — with a raised circular **violet FAB with a white `+`** (~56 px) centred between Documents and Ask Baymax, overlapping the bar upward by ~18 px. On these screens the **Documents** tab is active (violet icon + violet label); the others are grey.

---

## 1. `D1 Records list + filters.png`

- **UI screen name:** "My Records"
- **Maps to:** **D1 Records list**

### Verbatim text

- Title: `My Records`
- Subtitle: `All your health documents in one place.`
- Filter chips: `Filters` · `All types` · `All members` · `Newest first`
- Stat cards: `24` / `Total records` — `15` / `Normal` — `6` / `Needs attention` — `3` / `High priority`
- Section headers: `Today`, `Yesterday`, `This week`, `This month`
- Records (title / person · date / facility / status pill):
  1. `Blood Test Report` — `Ananya Sharma` · `15 May 2025` — `Fortis Hospital, Bangalore` — `Needs attention`
  2. `Thyroid Profile` — `Rohan Sharma` · `14 May 2025` — `SRL Diagnostics` — `Normal`
  3. `Vitamin D Test` — `Ananya Sharma` · `12 May 2025` — `Metropolis Healthcare` — `Borderline`
  4. `Complete Blood Count (CBC)` — `Karan Sharma` · `10 May 2025` — `Thyrocare Technologies Ltd.` — `High risk`
  5. `Lipid Profile` — `Mom (Sunita Sharma)` · `8 May 2025` — `Fortis Hospital, Bangalore` — `Normal`
  6. `ECG Report` — `Mom (Sunita Sharma)` · `6 May 2025` — `Narayana Health` — `Normal`
- Sticky footer bar: `Active filters (2)` / `All types · Last 3 months` / `Clear all`

### Layout, top → bottom

1. **Status bar** (~44 px).
2. **Header block**, left-aligned, no back arrow (this is a tab root). Title ~26 px / 700; subtitle ~13 px grey, ~4 px below. On the right of the title row: **search (magnifier)** icon and **bell** icon with a small **red unread dot** at its top-right. Icons ~22 px, ~16 px apart. Header block ~64 px tall.
3. **Filter chip row**, horizontally scrollable, ~34 px tall, 8 px gap, chips bleed to the right edge.
   - `Filters` chip is visually distinct: violet slider/tune icon **and violet label**, white fill, violet-tinted border — it is the _entry point to the filter sheet_, not a value.
   - `All types`, `All members`, `Newest first` are **dropdown chips**: white fill, 1 px light-grey border, dark label, small **chevron-down** on the right. All are shown in their _default/unset_ state (no solid-violet selected chip appears anywhere in this render).
4. **Stat strip**: 4 equal white cards in one row, ~8 px gap, each ~82×76 px, radius ~14 px. Composition = small rounded icon tile (~24 px) top-left, big number (~20 px / 700) below it, label (~10 px grey) under that.
   - `Total records` icon = violet document
   - `Normal` icon = green shield/check
   - `Needs attention` icon = amber circle-exclamation
   - `High priority` icon = red flag
   - **The four numbers are the four health-status buckets, not filters** — they read as a summary strip.
5. **Grouped list.** Group header (~13 px / 600, dark) with ~18 px top margin and ~8 px bottom margin, then the rows. Groups are **relative-time buckets** (`Today` / `Yesterday` / `This week` / `This month`), not months.
6. **Record row card** (~76 px tall, white, radius ~14 px, 12 px padding, ~10 px vertical gap between rows):
   - **Icon tile** 40×40, radius ~10, pale red/pink fill, red-and-white **PDF** document glyph.
   - **Title**, ~14 px / 600, dark.
   - **Meta line 1**, ~10–11 px grey: tiny person avatar glyph + name, then a small **calendar glyph** + date. The separator between name and date is rendered as icon + text pairs (`👤 Ananya Sharma  📅 15 May 2025`).
   - **Meta line 2**, ~10 px grey: facility name only.
   - **Status pill** right-aligned, vertically centred, ~22 px tall, radius full, ~10 px label. The `Needs attention` pill carries a small warning glyph before the label; the plain `Normal` pills are label-only.
   - **No chevron.** Rows are tappable but show no trailing disclosure arrow.
7. **Sticky "active filters" bar** pinned directly above the tab bar: white, ~56 px, radius ~14 px, slight shadow, left icon tile with the filter/tune glyph, two stacked lines (`Active filters (2)` bold small; `All types · Last 3 months` grey smaller) and a right-aligned violet text link `Clear all`.
8. **Bottom tab bar** (see shared section).

### Colour meaning (health)

Green / amber / red on this screen encode **clinical result severity of the record**: `Normal` (green) → `Borderline` / `Needs attention` (amber) → `High risk` (red). The stat strip uses the same three colours for the same three buckets plus violet for the neutral total.

### States visible

- Filled list with 6 records; all four filter chips in **unset/default** state; **filters active (2)** state shown via the sticky footer bar; notification bell in **unread** state.
- **Not shown:** empty state, loading skeleton, error, selected/solid filter chip, filter bottom sheet.

---

## 2. `D2 Timeline view.png`

- **UI screen name:** "Timeline"
- **Maps to:** **D3 Timeline**

### Verbatim text

- Title: `Timeline`
- Subtitle: `View your health records over time.`
- Filter chips: `Filters` · `All types` · `All members` · `All time`
- Stat cards: identical to D1 — `24` `Total records`, `15` `Normal`, `6` `Needs attention`, `3` `High priority`
- Month headers with counts: `May 2025` / `5 records` — `April 2025` / `4 records` — `March 2025` / `3 records`
- Entries (date rail / title / person · facility / status):
  - **May 2025**
    - `15` `MAY` — `Blood Test Report` — `Ananya Sharma · Fortis Hospital, Bangalore` — `Needs attention`
    - `14` `MAY` — `Thyroid Profile` — `Rohan Sharma · SRL Diagnostics` — `Normal`
    - `13` `MAY` — `Vitamin D Test` — `Ananya Sharma · Metropolis Healthcare` — `Borderline`
    - `12` `MAY` — `Complete Blood Count (CBC)` — `Karan Sharma · Thyrocare Technologies Ltd.` — `High risk`
    - `08` `MAY` — `Lipid Profile` — `Mom (Sunita Sharma) · Fortis Hospital, Bangalore` — `Normal`
  - **April 2025**
    - `28` `APR` — `ECG Report` — `Ananya Sharma · Narayana Health` — `Normal`
    - `22` `APR` — `Blood Sugar (Fasting)` — `Ananya Sharma · Apollo Diagnostics` — `Borderline`
    - `15` `APR` — `X-Ray Chest` — `Rohan Sharma · Fortis Hospital, Bangalore` — `Normal`
    - `02` `APR` — `Urine Routine Test` — `Ananya Sharma · SRL Diagnostics` — `Normal`
  - **March 2025**
    - `28` `MAR` — `Iron Profile` — `Ananya Sharma · Metropolis Healthcare` — (clipped by viewport bottom)

### Layout, top → bottom

1. Status bar.
2. **Header with a back chevron** on the left of the title (unlike D1). Title `Timeline` ~24 px / 700 sits on the same line as the chevron and is **left-aligned next to it**, not centred; subtitle beneath, spanning the full width. Search + bell (with red dot) on the right, same as D1.
3. **Filter chip row** — same four-chip pattern, but the 4th chip is `All time` (a _date-range_ selector) instead of `Newest first` (a _sort_ selector). Same visual treatment.
4. **Stat strip** — pixel-identical to D1.
5. **Month group header**: left = `May 2025` (~13 px / 600 dark); right = `5 records` in **violet** (~11 px), right-aligned on the same line. This count badge is a Timeline-only element; D1's group headers have no count.
6. **Timeline entry row** (~64 px tall, ~8 px gap):
   - **Date rail**, ~34 px wide, left-most: day number (`15`) ~15 px / 700 dark, month abbreviation (`MAY`) ~9 px uppercase grey directly under it.
   - **Timeline spine**: a thin vertical grey connector line running the full height of the group, with a **status-coloured dot / ring marker** (~10 px) on the row's centre line. **Dot colour matches the record's status pill** (green / amber / red) — this is the visual thread of the whole screen.
   - **Content card** to the right: small type-icon glyph, title ~13 px / 600, then a single grey meta line `Name · Facility` (~10 px). **Note: the Timeline meta line drops the date** (it lives in the rail) and combines person and facility with a middot into ONE line — whereas D1 uses two meta lines and includes the date.
   - **Status pill** right-aligned, same tokens as D1.
7. Bottom tab bar. **There is no sticky active-filters bar on Timeline** — the list scrolls straight into the tab bar and the last visible row (`Iron Profile`) is clipped mid-card, confirming a continuous scroll.

### States visible

Filled/scrolled state only, filters unset. No empty, loading, or end-of-timeline state shown.

---

## 3. `Common document processing screen.png`

- **UI screen name:** "Processing your document"
- **Maps to:** **C1 Camera capture / Analysing** (the _Analysing_ half)

### Verbatim text

- Step rail: `A1` `A2` `A3` `A4` `A5` `A6` — right-hand action `Skip`
- Heading (2 lines): `Processing your` / `document ✨`
- Body: `Baymax is securely reading your document and extracting key information. This may take a few seconds.`
- Progress: `72%` · `Extracting information...` · `Please keep the app open and don't close it while we process your document.`
- Checklist rows (title / subtitle):
  1. `Document uploaded` / `File: Blood_Test_Report.pdf`
  2. `Reading document` / `Scanning text and structure`
  3. `Extracting key information` / `Identifying important details`
  4. `Validating data` / `Checking accuracy and consistency`
  5. `Finalizing` / `Preparing your health insights`
- Reassurance card: `Your data is encrypted and secure` / `Only you and your family can access it.`
- Footer: `Cancel processing`

### Layout, top → bottom

1. Status bar.
2. **Top nav row**: back chevron on the far left, then a horizontal run of six small pill/step markers labelled `A1`–`A6` with **`A6` filled solid violet with white text** and `A1`–`A5` as light outlined/grey pills, then `Skip` as a grey text button on the far right. Row height ~32 px. This is an **onboarding-style step indicator sitting on a "Common" screen** — an implementation surprise if the spec treats this as a plain modal.
3. **Heading block**, left-aligned, ~24 px / 700, two lines, with the second word `document` rendered in **violet** and followed by a **sparkle glyph** — a two-tone heading, not a flat string.
4. **Illustration**: the white Baymax character holding a violet tablet/clipboard, occupying the right ~40 % of the block, overlapping/bleeding to the right edge and vertically overlapping the heading + body text.
5. **Body paragraph** ~12–13 px grey, ~60 % width so it clears the illustration.
6. **Progress card**: white, radius ~16 px, full width, ~150 px tall, centre-aligned. Contains a **circular determinate progress ring** (~76 px diameter, ~8 px stroke, violet track filled clockwise, pale violet remainder) with `72%` centred inside in ~18 px / 700 dark. Below the ring: `Extracting information...` ~14 px / 600 dark, then the two-line caution copy ~11 px grey, centred.
7. **Checklist card**: white, radius ~16 px, five rows separated by hairline dividers, each row ~52 px:
   - Left: rounded icon tile ~32 px. Completed rows use a **pale violet tile with a violet glyph**; the active row uses a **solid violet tile with a white glyph**; pending rows use a **pale grey tile with a grey glyph**.
   - Middle: title ~12–13 px / 600 + subtitle ~10 px grey.
   - Right status: rows 1–2 = **green circular check**; row 3 = **violet indeterminate spinner** and its title is **violet**; rows 4–5 = **no trailing indicator**, title and subtitle both greyed out.
   - So three distinct row states exist: **done / in-progress / pending**.
8. **Reassurance card**: pale-violet fill (`#EFEBFE`-ish), radius ~14 px, ~56 px tall, violet shield glyph in a circle on the left, bold small title + grey subtitle stacked.
9. **Footer**: `Cancel processing` as a **plain grey text button** (no fill, no border), centred, ~44 px tap target, near the home indicator.
10. **No bottom tab bar** — this screen is full-bleed/modal.

### States visible

- Single in-flight loading state at 72 %. Done / active / pending checklist rows all visible simultaneously.
- **Not shown:** 0 %, 100 %/success, processing error/retry, cancel confirmation.

---

## 4. `Common document processing output 1.png`

- **UI screen name:** "Review extracted information"
- **Maps to:** **C2 OCR review**

### Verbatim text

- Header title: `Review extracted information`; right-hand action `Help` (with a circled-question glyph)
- Subtitle: `We've scanned your document. Please review the details below and confirm.`
- File card: `Blood_Test_Report.pdf` / `Uploaded on 15 May 2025 · 2 pages` / pill `Processed`
- Confidence card: `92%` · `Extraction confidence` (with an info glyph) · `High confidence. Please review the details below before saving.`
- Legend: `High confidence (90%+)` · `Medium (70-89%)` · `Low (<70%)`
- Section: `Extracted details`
  - `Patient name` — `Ananya Sharma` — `High · 98%`
  - `Date of test` — `14 May 2025` — `High · 97%`
  - `Lab name` — `Thyrocare Technologies Ltd.` — `High · 95%`
- Section: `Test results`
  - `Hemoglobin (Hb)` — `13.2 g/dL` — `High · 96%`
  - `WBC Count` — `6,800 /µL` — `Medium · 82%`
  - `Platelet Count` — `1.35 L /µL` — `Low · 62%`
- Callout: `Some fields have low confidence` / `Please review and edit the highlighted fields to ensure accuracy.`
- Buttons: `Re-scan document` · `Confirm & Save`

### Layout, top → bottom

1. Status bar.
2. **App bar** ~48 px: back chevron left, **centred** title ~15 px / 600 (a two-word-wide centred title, distinct from D1/D3's left-aligned big titles), `Help` affordance on the right as a small violet-tinted icon + label.
3. **Subtitle** paragraph, ~11–12 px grey, centred-ish under the app bar, full width, 2 lines.
4. **File card**: white, radius ~14 px, ~64 px. Left = pale-red PDF icon tile 36×36; middle = filename ~13 px / 600 **rendered in violet**, meta line `Uploaded on 15 May 2025 · 2 pages` ~10 px grey; right = green `Processed` pill with a check glyph.
5. **Confidence card**: white, radius ~16 px, ~120 px. Left = circular ring ~64 px with `92%` centred (violet arc on pale-violet track); to its right, stacked: `Extraction confidence` + info glyph (~13 px / 600) and the two-line grey explanation. Far right = a decorative **shield illustration** with a violet-to-green gradient and a white check.
6. **Legend row** directly under the confidence card (inside or immediately below it): three inline items, each a ~6 px coloured dot + ~9–10 px grey label — **green** `High confidence (90%+)`, **amber** `Medium (70-89%)`, **red** `Low (<70%)`.
7. **Section header** `Extracted details` ~12 px / 600 dark, ~12 px above its card.
8. **Field row** (repeated; grouped in one white card with hairline dividers, ~56 px each):
   - Left: rounded pale-violet icon tile ~30 px with a contextual glyph (person for patient name, calendar for date, building/lab for lab name, droplet/cell glyphs for test analytes).
   - Middle: label ~10 px grey on top, **value ~14 px / 700 dark** beneath. (Label-above-value, not the usual value-above-label.)
   - Right: **confidence pill** `High · 98%` / `Medium · 82%` / `Low · 62%` (~22 px, colour-coded green / amber / red) followed by a small **violet pencil "edit" icon** — every field is individually editable.
9. **Section header** `Test results`, then the same row pattern for the three analytes.
10. **Low-confidence callout**: pale-violet card, radius ~14 px, ~60 px, sparkle glyph left, bold small title + grey subtitle, **chevron-right** on the far right (it navigates somewhere / jumps to the flagged fields).
11. **Footer button pair**, side by side, ~48 px tall, fully rounded:
    - `Re-scan document` — **outlined**, violet border + violet label, transparent/white fill, ~45 % width.
    - `Confirm & Save` — **solid violet**, white label preceded by a white check glyph, ~55 % width (visually wider — the primary).
12. Bottom tab bar present, `Documents` active.

### ⚠️ Colour-meaning trap on this screen

Green / amber / red here mean **OCR extraction confidence**, _not_ health severity. `Hemoglobin (Hb) 13.2 g/dL` carries a **green `High · 96%`** pill here, while the exact same value carries a **red `Low`** pill on the Report details screen. The word "High" also flips meaning between the two screens (high _confidence_ vs. high _risk_). Do not share a single status-badge component or a single colour→meaning map across C2 and the detail screen.

### States visible

- Post-OCR filled/review state with a mix of **high / medium / low confidence** rows simultaneously, plus the **needs-review** callout.
- **Not shown:** an inline edit/field-focused state, a validation-error state, saving spinner, or a zero-confidence/failed-extraction state.

---

## 5. `Common Report details screen processed 2.png`

- **UI screen name:** "Document analysis"
- **Maps to:** **D2 Record detail**

### Verbatim text

- Header title: `Document analysis`; right-hand action `Help`
- Subtitle: `We've analyzed your report. Here's what we found.`
- File card: `Blood_Test_Report.pdf` / `Uploaded on 15 May 2025 · 2 pages` / pill `Processed`
- Status card: `Overall health status` (with info glyph) · `Needs attention` · `Some values are outside the normal range.`
- Gauge legend: `Good` · `Needs attention` · `High risk`
- Section: `Key highlights` — right-aligned `3 flagged`
  - `Hemoglobin (Hb)` — `13.2 g/dL` — `Low`
  - `WBC Count` — `6,800 /µL` — `Borderline`
  - `Platelet Count` — `1.35 L /µL` — `Normal`
- Insight card: `AI insight` / `Your report shows minor deviations. Consider lifestyle adjustments and follow up if symptoms persist.`
- Section: `What would you like to do?`
  - `Ask Baymax` / `Get AI insights about your report`
  - `Track changes` / `See how your numbers change over time`
  - `Share report` / `Send to your doctor or a family member`

### Layout, top → bottom

1. Status bar.
2. **App bar** identical in structure to screen 4: back chevron, centred `Document analysis` ~15 px / 600, `Help` on the right.
3. **Subtitle** ~11–12 px grey, one line.
4. **File card** — visually identical to the one on screen 4, including the green `Processed` pill and the violet filename. These two screens clearly share this component.
5. **Overall health status card**: white, radius ~16 px, ~170 px tall.
   - Line 1: `Overall health status` ~12 px / 600 + small info glyph.
   - Left column: a large **amber dot** followed by `Needs attention` ~20 px / 700 in **amber**, then `Some values are outside the normal range.` ~11 px grey over two lines.
   - Right column: a **semicircular gauge / speedometer** ~110 px wide with a three-segment arc — **green (left) → amber (centre) → red (right)** — thick stroke, rounded caps, and a dark **needle** pivoting from the centre and pointing into the **amber** segment.
   - Under the gauge: a 3-item inline legend, each a small coloured dot + ~9 px grey label: `Good` (green), `Needs attention` (amber), `High risk` (red). **This is the canonical health scale for the whole app — three levels, in this order and wording.**
6. **Section header row**: `Key highlights` ~12 px / 600 on the left, `3 flagged` on the right in **red/amber** ~11 px (a count of abnormal analytes, likely tappable).
7. **Highlight row** (one white card, hairline dividers, ~58 px each):
   - Left: rounded icon tile ~30 px, **tinted to match the analyte's own status** (pale red for Hemoglobin, pale amber for WBC, pale green for Platelet) with a matching-colour glyph (droplet / cells / platelet).
   - Middle: analyte name ~10 px grey label above, **value + unit ~14 px / 700 dark** below (`13.2 g/dL`, `6,800 /µL`, `1.35 L /µL`).
   - Right: status pill — `Low` (red), `Borderline` (amber), `Normal` (green).
   - **Note the vocabulary widens here:** the pill can be a _direction_ (`Low`, and by symmetry `High`) as well as a _band_ (`Borderline`, `Normal`). The list screens only ever show band words. Plan for at least: `Normal`, `Borderline`, `Low`, `High`, `High risk`, `Needs attention`.
8. **AI insight card**: pale-violet fill, radius ~16 px, ~110 px. Sparkle glyph + `AI insight` ~12 px / 600 violet at top-left, body copy ~11 px dark-grey over ~3 lines occupying the left ~60 %, and the **Baymax character illustration** on the right, bleeding to the card edge.
9. **Section header** `What would you like to do?` ~12 px / 600.
10. **Action card row**: **three equal-width white cards side by side** (~112 px tall, ~8 px gap, radius ~14 px, 12 px padding), each = a ~28 px rounded tinted icon tile at the top (violet sparkle / violet-blue chart / violet share-arrow), a bold ~11 px title, and a ~9 px grey two-to-three-line description. Text wraps aggressively at this width.
11. Bottom tab bar present, `Documents` active.

### States visible

- Fully processed record in the **"Needs attention"** overall state, with one red, one amber and one green analyte simultaneously.
- **Not shown:** the `Good` or `High risk` overall states (needle position and headline colour must both change), a record with 0 flagged values, an unprocessed/failed record, or the full test-results list (only "Key highlights" — 3 of an unknown total — appears).

---

## Cross-cutting notes that would surprise a developer working from the written spec

1. **Two different green/amber/red semantics.** Health severity (D1, D3, Report details) vs. **OCR confidence** (C2 review). Same palette, different meaning, and the literal word "High" is _good_ on C2 and _bad_ on the detail screen. Keep the badge components separate.
2. **D1 and D3 are near-identical shells but differ in three specific places** — 4th filter chip (`Newest first` vs `All time`), group header (relative buckets, no count vs. `Month Year` + `N records` in violet), and row anatomy (2 meta lines incl. date, no spine vs. left date rail + coloured spine dot, 1 combined meta line). Everything else — stat strip, chip row, search + bell, tab bar — is shared verbatim, including the identical `24 / 15 / 6 / 3` numbers.
3. **The record rows have no chevron.** Nothing in the list signals navigability except the card affordance.
4. **D1 has a sticky "Active filters (2)" bar** floating above the tab bar with its own `Clear all` link; the Timeline has none. The bar shows the applied filters as a summary string (`All types · Last 3 months`) that does **not** match the unset-looking chips above it — i.e. the chip row and the active-filter bar are showing inconsistent state in this render.
5. **The processing screen carries an `A1…A6` step rail and a `Skip` action**, and has **no bottom tab bar** — it is presented as a full-screen onboarding-style step even though it is filed under "Common".
6. **The processing checklist has three distinct row states** (green check / violet spinner + violet title / greyed-out) and the progress ring is **determinate**, so the backend must emit a real percentage and a current-step key.
7. **Every extracted field on C2 is individually editable** (per-row pencil icon), and the low-confidence callout has a chevron implying it navigates to the flagged fields.
8. **C2's primary action is `Confirm & Save`; the secondary is `Re-scan document`** — a destructive-ish restart living as a peer button in the footer, not buried.
9. **The Report details screen shows only "Key highlights" (3 items) with a `3 flagged` count** — it is not the full results table. There is no visible "view all results" affordance in the render.
10. **The gauge on the detail screen is a custom semicircular 3-segment speedometer with a needle**, not a bar or a ring — the only instance of this component across these five screens.
11. **The bell icon carries a red unread dot** on both list screens; the FAB is a bare `+` with no label.
12. **Names appear in two formats** — plain (`Ananya Sharma`, `Rohan Sharma`, `Karan Sharma`) and relationship-qualified (`Mom (Sunita Sharma)`). Store both a display name and an optional relationship label.
13. **Units use a micro sign** (`6,800 /µL`, `1.35 L /µL`) and thousands separators; `1.35 L /µL` is transcribed exactly as rendered.
14. **Dates are `D MMM YYYY`** in lists (`15 May 2025`, `8 May 2025` — no zero padding) but **zero-padded two-digit day + uppercase 3-letter month** in the Timeline rail (`08 MAY`, `02 APR`).
15. **The Blood Test Report's date is inconsistent between screens**: the file card says `Uploaded on 15 May 2025` while C2's extracted `Date of test` is `14 May 2025`. Upload date and test date are separate fields.
