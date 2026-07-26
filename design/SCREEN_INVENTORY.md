# Baymax — Screen Inventory & Token Extraction

Source of truth: the 42 PNGs in `./screens/`. Where these frames disagree with
`BAYMAX_BUILD.md` or `Baymax_Design_System_V1.md`, **the frames win** and the
disagreement is recorded under [Conflicts](#conflicts) for a human decision.

Frames are iPhone mockup renders at 853×1844 with a black device bezel. The live
UI area maps to a **390×844 CSS viewport**, so observed pixel measurements are
divided by ~2.19 to reach CSS px.

Detailed per-screen notes live in `./inventory/`:

| File | Covers |
|---|---|
| `inventory/records.md` | D1 records list, timeline, document processing, report detail |
| `inventory/chat-and-brief.md` | E1/E2 chat, chat quota limit, F1 pre-consult brief (6 frames) |
| `inventory/account-and-paywall.md` | H profile/plan states, I paywalls + success, J settings sub-screens |

---

## 1 · Token extraction (measured, not guessed)

Colours were sampled with `design/sample_tokens.py`, which crops the device
bezel, filters to saturated pixels, quantises and clusters across all 42 frames.
Run it yourself:

```bash
.designvenv/bin/python design/sample_tokens.py "C Home screen 1.png"
```

### Brand ramp — hue ≈ 245°

The single most common saturated colour across all 42 frames is `#2A1EBA`
(7.05% of saturated pixels): the primary button fill.

| Token | Hex | Provenance |
|---|---|---|
| `--brand-950` | `#0A0A3C` | measured `#060642` (deep navy headline / hero wash) |
| `--brand-900` | `#14136B` | interpolated |
| `--brand-800` | `#2A1EBA` | **measured**, dominant primary-button fill |
| `--brand-700` | `#3B2BC9` | **measured** `#3C2CCC` on the auth screen button |
| `--brand-600` | `#4A2ADE` | **measured** `#422ADE` (gradient top / active nav) |
| `--brand-500` | `#5B4EF0` | **measured** `#5A4EF6` (links, interactive) |
| `--brand-400` | `#8A82F5` | interpolated |
| `--brand-300` | `#AEAEEA` | **measured** |
| `--brand-200` | `#C6C6F6` | **measured** |
| `--brand-100` | `#DCDAFB` | **measured** `#D2D2F6`/`#DEDEFF` |
| `--brand-50` | `#F1F0FE` | **measured** near-white lavender tint |

Primary buttons are not flat: they run a subtle vertical gradient from roughly
`--brand-600` to `--brand-800`.

### Surfaces

| Token | Hex | Provenance |
|---|---|---|
| `--canvas` | `#FAFAFE` | **measured** — a *cool* near-white with a lavender cast |
| `--surface` | `#FFFFFF` | measured |
| `--surface-tint` | `#F6F6FE` | measured |
| `--ink-900` | `#0F1030` | measured |
| `--ink-500` | `#6B6C8A` | measured `#66668A`/`#727296` |
| `--ink-300` | `#9696AE` | **measured** |
| `--line` | `#E8E8F4` | derived from card borders |

### Semantic — health meaning only

| Token | Hex | Provenance |
|---|---|---|
| `--safe` | `#23AF5F` | **measured** (also `#37AF73`) |
| `--caution` | `#FFAF23` | **measured** |
| `--danger` | `#EA2A36` | **measured** |
| `--danger-strong` | `#E10A1E` | **measured**, the emergency call button |
| `--danger-bg` | `#FEF1F3` | **measured** emergency wash |

Background tints (`--safe-bg`, `--caution-bg`) are derived, not sampled, because
the frames render them under illustration overlays.

### Geometry (measured from frames)

Cards `20px` · tiles/inputs `16px` · sheets `28px` top corners · buttons fully
pill. Screen padding `20px`. Two elevation levels only.

---

## 2 · Screen map — frame filename → app screen

The 42 frames cover more surface area than the 21 screens in the build spec.

### Onboarding

| Frame | Screen | Notes |
|---|---|---|
| `A Flash screen 1..4` | **A2 Value carousel** | 4 panels, not a splash. Step chips, `Skip`, dot indicator |
| `B onboarding flow screen 1 authentication` | **A3 Sign in** | Email/password + tabs; Google / Apple / Phone(OTP) secondary |
| `B onboarding flow screen usage selection 2` | **A4 Who is this for?** | "It's for me" / "It's for my family", radio-style select |
| `B onboarding flow screen profile creation 3` | **A5 Profile intake** | Basic information + Health snapshot cards |
| `B onboarding flow screen upload first document hook 4` | **A6 First upload** | Dashed drop zone, 3 alternates, "I'll upload later" |

No splash frame (A1) was supplied.

### Daily loop

| Frame | Screen | Notes |
|---|---|---|
| `C Home screen 1` | **B1 Home** | Greeting, family row, Upcoming card, Health Summary, Ask Baymax card |
| `C expanded family switcher 2` | **B2 Family switcher** | Bottom sheet; reveals a **Health Score** card on Home behind it |

### Document & memory

| Frame | Screen |
|---|---|
| `Common document processing screen` | **C1 Analysing** |
| `Common document processing output 1` | **C2 OCR review** |
| `Common Report details screen processed 2` | **D2 Record detail** |
| `D1 Records list + filters` | **D1 Records list** |
| `D2 Timeline view` | **D3 Timeline** |

Note the filename `D2 Timeline view.png` maps to **D3**, not D2.

### Companion

| Frame | Screen |
|---|---|
| `E1 Ask Baymax use case 1` / `2` | **E1 Chat** |
| `E1 Chat answer with citations ... use case 3` (+2 duplicates) | **E2 Answer with citations** |
| `E1 Chat limit maxed out for free user` | **H1 quota moment** |
| `F1 Pre-consult brief step 1..6` | **F1 Brief** — a 6-frame wizard |

The three `use case 3` files are byte-identical duplicates: one screen, not three.

### Safety, monetisation, account

| Frame | Screen |
|---|---|
| `G Safety guardrail emergency screen 1..3` | **G1 Emergency** — a 3-step flow |
| `I 99-month paywall screen` / `success` | **H1/H2 Solo ₹99** |
| `I 249-Month paywall screen` / `success` | **H1/H2 Family ₹249** |
| `H Profile screen free user 1` / `Solo ₹99` / `Family 249` | **I1 Profile** — 3 plan states |
| `J About baymax` / `Languages` / `help and report` / `notification` / `privacy and security` | **I1 sub-screens** (5 extra, not in the 21) |

---

## 3 · Global patterns observed

**Bottom navigation** is `Home · Documents · [+ FAB] · Ask Baymax · Profile` —
four tabs around a centred violet **`+`** FAB. The build spec describes
`Home · Records · Ask · Profile` with a *camera* FAB.

**Family switcher** is a horizontal avatar row directly under the Home greeting,
not a top-right cluster. The active profile renders as a wide lavender pill
(avatar + name + "Me"); the rest are plain circles, ending in an `All` button.

**Reassurance strip** — nearly every onboarding frame carries a lock-icon line:
"Bank-level encryption. Only you and your family can access." Trust is a
recurring visual element, not a one-off.

---

## Conflicts

Ordered by how much they change the build. Items 1–3 were escalated and **ruled
on by Athar on 2026-07-26**; the rulings are recorded inline below and are
settled — do not re-litigate them.

### 1 · Emergency escalation is not a hard interrupt · **blocks Phase 2/5**

`BAYMAX_BUILD.md` §7 specifies a full-screen, non-dismissible-for-3s interrupt
with no navigation, no AI content, and `Call 112`.

The frames show a **3-step guided flow** ("Step 2 of 3", "Step 3 of 3") that:

- keeps the bottom tab bar visible throughout
- has `Back` / `Continue` / `Done` buttons and is freely dismissible
- calls **108** (Indian ambulance), never 112
- offers a conversation-summary share, video-call and "notify family" options
- uses **green** reassurance cards ("You're not alone", "Help is on the way")

The spec's version is a safety control; the design's version is a support flow.
They are different products.

> **RULING — hybrid.** A Tier-1 detection renders a non-dismissible full-screen
> interrupt for 3s with no nav and no AI content, offering **both 112 and 108**.
> Dismissing it hands off into the design's 3-step support flow. The safety
> guarantee is preserved; the designed screens are all still used.

### 2 · Semantic colour is used non-semantically · **blocks Phase 4/6**

Both specs state green/amber/red carry health meaning only. The frames break
this in two places:

- **OCR review** uses the same green/amber/red for *extraction confidence*, so
  "Hemoglobin 13.2" reads green ("High · 96%") on one screen and red ("Low") on
  another — the identical value in two colours.
- **Paywall/billing** uses mint-green cards for auto-renewal disclosure and
  compliance badges; success states are indigo, not green.

> **RULING — separate confidence scale.** Health severity keeps green/amber/red.
> Extraction confidence uses a visually distinct treatment: neutral greys plus a
> single amber "needs review" state. A colour never carries two meanings.

### 3 · Authentication is email/password, not phone OTP · **blocks Phase 3**

The build spec mandates phone OTP as the primary path. The frame shows
`Sign in` / `Create account` tabs over **email + password**, with Google, Apple
and Phone(OTP) as three secondary buttons. This changes the Supabase Auth setup
and the DPDP consent capture point.

> **RULING — the frames win.** Email + password is primary, with Google, Apple
> and Phone(OTP) secondary. The DPDP consent checkbox lives on the
> `Create account` tab, unticked by default.

### 4 · Design-system values that were simply wrong

Adopted from the frames without asking, since these are unambiguous:

- **Canvas is cool `#FAFAFE`, not warm `#FAF9F6`.** The whole app reads cooler.
- **Brand primary is `#2A1EBA`/`#3B2BC9`, not `#2E2F86`** — noticeably brighter
  and more saturated.
- **Semantic hexes all shifted**: safe `#23AF5F` (not `#1F9E75`), caution
  `#FFAF23` (not `#E8A13C`), danger `#EA2A36` (not `#E24B4A`).
- **No serif anywhere.** The Home greeting is bold sans with the name in violet,
  not the "one editorial serif moment" both specs call for. Fraunces is loaded
  but currently unused.

### 5 · Features in the frames that no spec mentions

- **Health Score** — an `82/100` ring card on Home with "+4 pts vs yesterday".
  Not in the data model, not in the 21 screens. Scope decision needed.
- **Health Summary** — three stat tiles (24 Documents / 3 Safe for you /
  1 Needs review) driving Home's information density.
- **Upcoming reminder card** with appointment date + facility, dismissible.
- **5 settings sub-screens** (About, Languages, Help & report, Notifications,
  Privacy & security) beyond the single I1 screen in the spec.
- Profile intake collects **height, weight, blood group** — none of which exist
  in the §5 data model.

### 6 · Smaller contradictions

- **Upload cap**: frame says "PDF, JPG, PNG up to 25MB"; spec §3.2 says 10MB.
  Currently unresolved — I will implement **10MB** (the security constraint)
  unless told otherwise.
- **Quota unit**: the limit screen says "5 chats", the spec says 3 chats/month.
  The frame's wording implies conversations, not messages.
- **Pending question is not visibly preserved** on the quota frame, though both
  specs make preservation a hard requirement of Flow 3.
- **F1 counter mismatch**: 6 frames, but the UI counter stops at "Step 5 of 5".
- **Records rows have no chevron**; the spec's row anatomy assumes one.
- **Nav bar is inconsistent** across frames — present on H screens, absent on
  most J sub-screens and on the document-processing screen.

---

## Measurement caveats

The per-screen files in `inventory/` were produced by three parallel agents that
did not have image-cropping tools available, so their **pixel measurements are
visual estimates** and their hex values are eyeballed. The token table in §1 of
this file is the authoritative colour source — it is the only one derived from
actual pixel sampling. Re-verify spacing against the PNGs when implementing each
screen.
