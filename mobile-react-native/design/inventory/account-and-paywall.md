# Account, Paywall & Settings — Design Inventory

Source images: `/design/screens/`. All renders are iPhone mockups (~853×1844 px) with a black
device bezel. The live UI corresponds to a **390×844 CSS-px viewport**; divide observed mockup
pixels by ~2.19 to get CSS px. All sizes below are already converted to CSS px and are
**approximate (±2px)** — the images are the source of truth, this doc is the transcription.

> **Transcription confidence.** Headings, row labels, plan names, prices, button labels and
> section titles were read directly and are reliable. A handful of very small secondary/caption
> lines (8–10 CSS px in the original) are marked `[low-confidence]` where the render did not
> resolve them cleanly — verify against the PNG before shipping that exact string.

---

## Global chrome shared by all these screens

| Element                  | Spec                                                                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status bar               | iOS default, `9:41` left, cellular/wifi/battery right. Height ~44px (Dynamic Island cutout on some renders).                                                            |
| Page horizontal padding  | **20px** left/right for all cards, rows and section headers.                                                                                                            |
| Card radius              | **16px** for standard cards/rows-groups; **20px** for hero/feature cards; **12px** for small inner chips.                                                               |
| Card fill                | White `#FFFFFF` on a very light lilac-grey page background `#F6F5FB` / `#F7F7FB`.                                                                                       |
| Card border              | 1px `#ECEAF5` (hairline lilac-grey), plus a very soft shadow `0 1px 2px rgba(20,20,43,.04)`.                                                                            |
| Brand primary            | Vivid indigo/violet `#5B3DF5`–`#6C4CF1`. Used for CTAs, active icons, links, selected states.                                                                           |
| Brand tint bg            | `#EFEBFF` / `#F1EDFF` (icon chip backgrounds, highlight cards).                                                                                                         |
| Text primary             | Near-black navy `#12122B`.                                                                                                                                              |
| Text secondary           | `#6E6E85`.                                                                                                                                                              |
| Text tertiary / captions | `#9A9AAE`.                                                                                                                                                              |
| Chevron                  | `›` 16px, `#C4C4D4`, right-aligned, 20px from card edge.                                                                                                                |
| Bottom tab bar           | 5 tabs, height ~64px + home indicator. Icons 22px + 10px label. Active = indigo. Center is a **raised circular indigo FAB (56px, `+`)** that overlaps the bar by ~14px. |

**Bottom tab labels are NOT consistent across the H and J screens — see "Surprises" at the end.**

---

# I1 Profile & settings (H screens)

Three states of the **same** Profile screen. Screen title in UI: **“Profile”**.
Route: `/profile` (bottom tab #5, “Profile”).

---

## 1. `H Profile screen free user 1.png` → “Profile” → Profile tab, **FREE user state**

### Exact visible text (top → bottom)

```
Profile
Manage your account and
app settings.

Ananya Sharma
ananya.sharma@example.com
+91 98765 43210

Free Plan

Upgrade to unlock more
Get family access and premium features to
stay protected and supported.

Solo Plan
₹99 / user / month
  Unlimited Ask Baymax
  Health insights
  PDF reports
  Priority support
[ Upgrade to Solo ]

Family Plan
₹249 / month
  Up to 4 family members
  Shared health insights
  Emergency plans
  All premium features
[ Upgrade to Family ]

Personal information
Update your personal details

Health profile
Manage your health summary

Security & privacy
Manage privacy, data and permissions

Notifications
Manage alerts and reminders

Language
Choose your preferred language

Help & support
Get help and view resources

About Baymax
App version and information
```

### Layout, top → bottom

1. **Header block** (y≈56–130). Title `Profile` — 30px / 700 / `#12122B`, left aligned.
   Sub-line `Manage your account and app settings.` — 14px / 400 / `#6E6E85`, wraps to 2 lines,
   line-height 20px. Right side: a **Baymax mascot illustration** (white robot, purple soft-shape
   background) bleeding off the right edge, occupying roughly x 210→390, y 40→150. Two circular
   icon buttons float top-right over the illustration: **bell (notifications)** and **question
   mark (help)**, 32px circles, white fill, 1px border, 8px gap.
2. **Profile header card** (y≈140–200). White, radius 16, padding 14px, full-bleed to the 20px
   gutters, height ~72px.
   - Avatar: 48px circle, photo, 2px white ring.
   - Column: name 16px/600; email 12px/400 `#6E6E85`; phone 12px/400 `#6E6E85` (3 stacked lines,
     line-height 16px).
   - Trailing chevron `›`.
   - **Plan badge below the text column**: pill, text `Free Plan`, 11px/600. On the free screen
     this pill is **grey/neutral** (`#F1F1F6` bg, `#6E6E85` text) — it is _not_ green.
3. **Upgrade card** (y≈210–370). Radius 20, fill very light lilac `#F4F1FF`, 1px `#E4DEFF`.
   - Row: 32px rounded-square indigo icon chip (crown/star glyph, white) + heading
     `Upgrade to unlock more` 15px/600, and 12px/400 `#6E6E85` two-line description.
   - **Two plan cards side by side**, each ~50% width minus 10px gap, white fill, radius 14,
     padding 12.
     - Icon: 26px circle, tinted (Solo = single-person indigo; Family = two-people indigo).
     - Plan name 13px/600 `Solo Plan` / `Family Plan`.
     - Price 18px/700 indigo: `₹99 / user / month` and `₹249 / month`
       (the `/ user / month` part is 11px/500 `#6E6E85`).
     - Benefit list: 4 lines, 11px/400, each with a small **indigo tick/dot** bullet, line-height
       16px.
     - Full-width outlined button at the bottom of each card: 1px indigo border, transparent fill,
       radius 10, height 32, label 12px/600 indigo — `Upgrade to Solo` / `Upgrade to Family`.
4. **Settings list** (y≈385 →). A single white card per row (not one grouped card): 7 rows,
   each **radius 14, height 60, margin-bottom 8**.

### Settings row anatomy (used on every H and J screen)

```
┌─ 20px gutter ─────────────────────────────────────────────┐
│  [icon 32×32 rounded-sq, tint bg]  Label 14/600           › │
│                                    Sub-label 11/400 #6E6E85 │
└───────────────────────────────────────────────────────────┘
```

- Row height **60px**, internal padding 12px 16px.
- Icon chip: 32×32, radius 9, background `#F1EDFF`, glyph 16px indigo, line-icon style.
- Label baseline gap to sub-label: 2px.
- Chevron `›` vertically centred, 16px from right edge.
- Row order is **identical in all three plan states**: Personal information → Health profile →
  Security & privacy → Notifications → Language → Help & support → About Baymax.

---

## 2. `H Profile screen Solo ₹99.png` → “Profile” → Profile tab, **SOLO ₹99 subscriber state**

### Exact visible text (only the parts that differ from Free)

```
Ananya Sharma
ananya.sharma@example.com
+91 98765 43210
  [✓ Account secure]   [★ Free plan]        ← two pills under the contact lines

Unlock more with Baymax Premium
Get priority support, advanced insights
and family access.
[ Upgrade now ]

Family                          View plans →
  Ananya   Rohan   Aarav   Mom        [ + ]
  You      12 years  9 years  54 years   Add
                                          member

Family access is a Premium feature
Share health records, manage permissions and
keep your loved ones protected.
[ View plans ]

Personal information …  (same 7 rows as Free)
```

> **Note the contradiction:** the second pill on this screen still reads **`Free plan`**
> even though the state is Solo ₹99 — the promo card language is “Unlock more with Baymax
> Premium”. Treat this as: **Solo is still “not Premium/Family”**, so the pill communicates that
> the _family_ entitlement is absent. Build the pill as a data-driven `planLabel` and confirm the
> intended copy with design. `[low-confidence on this pill's exact string]`

### Differences vs. Free

|                | Free                                                                  | Solo ₹99                                                                                                                                                                         |
| -------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header pills   | one grey `Free Plan` pill                                             | **two pills**: green-tinted `✓ Account secure` + indigo-tinted `★ Free plan`                                                                                                     |
| Upgrade block  | Big card with **two side-by-side plan cards** and two outline buttons | Compact single-row banner: indigo icon chip + `Unlock more with Baymax Premium` + 2-line sub + **solid indigo pill button `Upgrade now`** (height 30, radius 15, 12px/600 white) |
| Family section | absent                                                                | **present but locked**                                                                                                                                                           |
| Settings list  | 7 rows                                                                | identical 7 rows                                                                                                                                                                 |

### Family section (Solo) — the gating pattern

- Section header row: `Family` 16px/700 left; `Upgrade to access family features` 11px/400
  `#9A9AAE` immediately under it; `View plans` 12px/600 indigo on the right.
- **Member avatar strip**, white card radius 16, padding 14, horizontal row of 5 items,
  each 60px wide: 44px circle avatar + name 11px/600 + relation/age 10px/400 `#9A9AAE`.
  - Members shown: `Ananya / You`, `Rohan / 12 years`, `Aarav / 9 years`, `Mom / 54 years`.
  - 5th item = `Add member`: 44px circle with **dashed 1px indigo border, transparent fill, `+`
    glyph**, label `Add member` on 2 lines.
  - **GATING:** on Solo the four avatars are rendered **desaturated/greyscale at ~40–50% opacity**
    and are non-interactive. A small **lock badge** sits on the avatars.
- **Locked notice card** directly below, radius 16, fill `#F4F1FF`:
  `Family access is a Premium feature` 13px/600 + 11px/400 two-line sub +
  right-aligned **outlined button `View plans`** (1px indigo, radius 10, height 30).

---

## 3. `H Profile screen Family 249.png` → “Profile” → Profile tab, **FAMILY ₹249 subscriber state**

### Exact visible text (deltas)

```
Profile
Manage your account, family, and
app settings.                       ← sub-line gains “family,”

Ananya Sharma
ananya.sharma@example.com
+91 98765 43210
  [✓ Account secure]   [◆ Profile verified]

Baymax Premium
Unlock advanced insights and priority support.
[ View plans ]

Family                          View all →
  Ananya   Rohan   Aarav   Mom        [ + ]
  You      12 years  9 years  54 years   Add
                                          member

Personal information … (same 7 rows)
```

### Differences vs. Solo / Free

|                    | Family ₹249                                                                                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Header sub-line    | `Manage your account, family, and app settings.` (adds “family,”)                                                                                                                                                                                                  |
| Bell icon          | carries a **red numeric notification dot/badge** (`2`) — indigo/red `#FF4D4F` circle, 14px, top-right of the bell                                                                                                                                                  |
| Header pills       | `✓ Account secure` (**green** `#E9F8EF` bg, `#1DA860` text/glyph) + `◆ Profile verified` (**indigo** `#EFEBFF` bg, indigo text)                                                                                                                                    |
| Premium banner     | `Baymax Premium` + `Unlock advanced insights and priority support.` with an **outlined** `View plans` button (not a solid “Upgrade now”) — informational, not a hard sell                                                                                          |
| Family section     | **fully unlocked**: header right link is `View all` (not `View plans`); avatars are **full colour**; the active/self member `Ananya · You` gets a **2px indigo selection ring + a small green online/active dot** at top-right of the avatar; `Add member` is live |
| Locked notice card | **removed entirely**                                                                                                                                                                                                                                               |
| Settings list      | identical 7 rows                                                                                                                                                                                                                                                   |

### Free vs Solo vs Family — what is gated (summary for the developer)

| Capability                           | Free                      | Solo ₹99                                           | Family ₹249                           |
| ------------------------------------ | ------------------------- | -------------------------------------------------- | ------------------------------------- |
| Ask Baymax                           | limited/capped            | unlimited                                          | unlimited                             |
| Health insights & daily check-in     | ✗                         | ✓                                                  | ✓                                     |
| Unlimited reports & document storage | ✗                         | ✓                                                  | ✓                                     |
| Priority support                     | ✗                         | ✓ (“Priority support”)                             | ✓ (“Faster help when you need it”)    |
| Family members                       | ✗ (section not rendered)  | **section rendered, greyed + locked, upsell card** | ✓ up to 4 members                     |
| Shared health insights / permissions | ✗                         | ✗                                                  | ✓                                     |
| Emergency plans                      | ✗                         | ✗                                                  | ✓                                     |
| Profile pills                        | `Free Plan` grey          | `Account secure` + `Free plan`                     | `Account secure` + `Profile verified` |
| Upgrade surface                      | two-card comparison block | compact banner + `Upgrade now`                     | informational banner + `View plans`   |
| Settings rows                        | same 7                    | same 7                                             | same 7                                |

**Key gating pattern:** Family features are _shown but visibly disabled_ (greyscale avatars +
lock badge + upsell card) rather than hidden — this is a deliberate upsell mechanic and must be
implemented, not optimised away.

---

# H1/H2 Paywall + payment (I screens)

Two purchase screens (₹99 Solo, ₹249 Family) and two matching success screens. Both purchase
screens are the **same template** with different plan data. Screen title in UI:
**“Complete your subscription”**.

---

## 4. `I 99-month paywall screen.png` → “Complete your subscription” → **Solo ₹99 checkout**

### Exact visible text

```
←            Complete your subscription
                  🛡 Secure & encrypted

Solo Plan                                    Just ₹99 / month
₹99 / month                                  No hidden charges
Billed monthly · Cancel anytime

Everything you get with Solo Plan
  ∞  Unlimited        ♥  Health insights     ▤  Unlimited reports   ☏  Priority
     Ask Baymax          & daily check-in       & document storage      support

Your personal AI health companion.
Get answers, insights and support anytime, anywhere.

₹99 will be charged automatically every month
on the same date you subscribe.

Choose payment method

[UPI logo]  UPI            Recommended                        ( ● )
            Pay securely using any UPI app
            Pay with   GPay  PhonePe  Paytm  BHIM   +More        ›

[card icon] Debit / Credit Card                                  ( )
            Visa, Mastercard, RuPay and more
            VISA  mastercard  RuPay»  ⋯ More                      ›

✅ 100% secure payments · Your data is protected
   Cancel anytime. No lock-in.

Total                                            ₹99 / month

[ 🔒  Pay ₹99 / month ]

By continuing, you agree to our Terms of Service and Privacy Policy

⟳ Cancel anytime        ⚡ Instant activation       🛡 Secure checkout
  No questions asked       Start using right away      PCI DSS compliant
```

### Layout, top → bottom (CSS px)

1. **Nav bar** y≈52–100. Circular back button 36px (white, 1px border, indigo `←`) at x=20.
   Centred title `Complete your subscription` 17px/700. Beneath it, centred 11px/500 `#6E6E85`
   with a small green shield glyph: `Secure & encrypted`.
2. **Plan summary card** y≈110–190. White, radius 18, padding 16.
   - Left: 36px indigo-tint circle with plan icon (single person for Solo).
   - `Solo Plan` 16px/700; `₹99 / month` 26px/800 **indigo** (the `/ month` suffix 13px/500
     `#6E6E85`); `Billed monthly · Cancel anytime` 11px/400 `#9A9AAE`.
   - Right, top-aligned: **indigo-tint pill** `Just ₹99 / month` 11px/700 indigo, radius 12,
     with `No hidden charges` 10px/400 `#9A9AAE` under it.
3. **Benefits card** y≈200–275. White, radius 18, padding 16.
   - Heading `Everything you get with Solo Plan` 13px/700.
   - **4-column icon grid**, each column ~72px: 28px indigo glyph on top, then 2-line label
     10px/600 centred, line-height 13px. Labels exactly:
     `Unlimited Ask Baymax`, `Health insights & daily check-in`,
     `Unlimited reports & document storage`, `Priority support`.
4. **Companion strip** y≈285–330. Light lilac `#F4F1FF`, radius 16, 1px `#E4DEFF`. Sparkle icon +
   `Your personal AI health companion.` 12px/600 + `Get answers, insights and support anytime,
anywhere.` 11px/400. Small Baymax mascot art bleeding off the right edge.
5. **Auto-charge notice** y≈340–375. **Mint/green** card: bg `#EAF8F0`, 1px `#CBEBD9`,
   radius 12, calendar glyph `#1DA860`, text 11px/500 `#1E7A4C`, 2 lines:
   `₹99 will be charged automatically every month on the same date you subscribe.`
   → **Green here = "safe/transparent billing disclosure", not success.**
6. **Section heading** `Choose payment method` 15px/700, y≈390.
7. **Payment method — UPI (selected)** y≈405–490. White card radius 16, **2px indigo border**
   because selected. Radio on the right: 20px, indigo filled ring with white centre dot.
   - UPI wordmark logo (orange/green) left.
   - `UPI` 14px/700 + green-tint pill `Recommended` (bg `#EAF8F0`, text `#1DA860`, 10px/700).
   - `Pay securely using any UPI app` 11px/400 `#6E6E85`.
   - **Inner divider**, then a `Pay with` row: 11px/500 label + horizontal logo chips
     `GPay`, `PhonePe`, `Paytm`, `BHIM` (each ~28×20 white chip radius 6, 1px border) +
     `+More` text, and a trailing `›`.
8. **Payment method — Card (unselected)** y≈500–570. White card radius 16, 1px `#ECEAF5`,
   empty radio.
   - `Debit / Credit Card` 14px/700; `Visa, Mastercard, RuPay and more` 11px/400.
   - Logo chips row: `VISA`, `mastercard`, `RuPay»`, `⋯ More`, trailing `›`.
9. **Trust strip** y≈580–615. Mint bg `#EAF8F0`, radius 12, green tick glyph, 2 lines 10px/500:
   `100% secure payments · Your data is protected` / `Cancel anytime. No lock-in.`
10. **Total row** y≈625–650. `Total` 14px/600 left; `₹99 / month` 16px/800 indigo right.
11. **Primary CTA** y≈660–712. Full-width (20px gutters), height **52**, radius **14**, solid
    indigo `#5B3DF5`, white 16px/700 label with a leading 14px padlock glyph:
    `🔒 Pay ₹99 / month`.
12. **Legal line** y≈722. Centred 10px/400 `#9A9AAE`:
    `By continuing, you agree to our Terms of Service and Privacy Policy` — with
    **`Terms of Service`** and **`Privacy Policy`** as indigo links.
13. **Reassurance triad** y≈745–790. 3 equal columns, 20px indigo outline glyph, then
    11px/600 title and 10px/400 `#9A9AAE` sub:
    - `Cancel anytime` / `No questions asked`
    - `Instant activation` / `Start using right away`
    - `Secure checkout` / `PCI DSS compliant`
14. **No bottom tab bar** on paywall screens — only the home indicator. This is a modal/full-screen
    flow.

---

## 5. `I 249-Month paywall screen.png` → “Complete your subscription” → **Family ₹249 checkout**

Same template. Deltas only:

```
Family Plan                                  ₹249 / month
₹249 / month                                 No hidden charges
Billed monthly · Cancel anytime

Everything your family gets with Family Plan
  👪 Up to 4 family    ∞ Unlimited      ♥ Health insights   ▤ Unlimited reports  ☏ Priority
     members             Ask Baymax        & daily check-in    & storage            support
     Share benefits      Ask anything,     Personalised        Reports & docs,      Faster help
                         stay protected    insights for all    always at hand       when you need it

Better health, together.
Empower your entire family to live healthier, one smart choice at a time.

₹249 will be charged automatically every month
on the same date you subscribe.

Choose payment method            (identical UPI / Card blocks)

Total                                           ₹249 / month
[ 🔒  Pay ₹249 / month ]
By continuing, you agree to our Terms of Service and Privacy Policy
⟳ Cancel anytime · No questions asked  |  ⚡ Instant activation · Start using right away  |  🛡 Secure checkout · PCI DSS compliant
```

Structural differences from the ₹99 screen:

- Plan icon is the **two-person “family” glyph**.
- The right-hand pill reads plainly **`₹249 / month`** (no “Just” prefix).
- Benefits grid is **5 columns instead of 4**, and each column has a **third caption line**
  (10px/400 `#9A9AAE`) under the label. Columns are ~66px wide with tighter 6px gutters.
- The companion strip becomes a **taller feature card** (`Better health, together.` with a purple
  heart emoji in the headline) containing the Baymax mascot + floating purple heart artwork,
  radius 20, height ~76px.
- Everything else (auto-charge notice, payment methods, trust strip, CTA geometry, legal line,
  triad) is byte-identical apart from the amount token.

---

## 6. `I 99-Month paywall success.png` → “You’re all set!” → **Solo purchase success**

### Exact visible text

```
✓                    (large check mark)

You're all set!
Your Solo Plan is now active.
We're excited to have you on this journey to better health.

Plan            Billing          Next billing on
Solo Plan       ₹99 / month      15 May 2025

What you can do now
  ∞  Unlimited Ask Baymax
     Ask anything, anytime. Get trusted answers instantly.          ›
  ♥  Health insights & daily check-in
     Check in with Baymax daily and unlock personalised health insights.  ›
  ▤  Unlimited reports & storage
     Generate unlimited reports and securely store all your documents.    ›
  ☏  Priority support
     Get faster help from our priority support team.                 ›

Your health journey just got even better 💜
We'll be with you every step of the way.

[ Explore Ask Baymax ]
Go to Home
```

### Layout

1. **No nav bar, no back button** — this is a terminal confirmation screen. Confetti particles
   (green, yellow, indigo, small squares/triangles) scattered around the top ~180px.
2. **Success badge** y≈70–140: 72px indigo rounded-square/squircle (radius 24) with a white
   check, sitting inside a 110px soft indigo halo circle (`#EFEBFF` at ~50%).
3. `You're all set!` 28px/800 centred `#12122B`, y≈160.
4. `Your Solo Plan is now active.` 13px/500 **indigo** centred.
   `We're excited to have you on this journey to better health.` 12px/400 `#6E6E85`, centred,
   1 line (wraps to 2 on narrow).
5. **3-up stat card** y≈235–295: single white card radius 16, padding 14, three equal columns
   separated by 1px vertical dividers `#EFEFF5`. Each column: 20px tinted glyph (calendar / rupee
   card / calendar), then label 10px/500 `#9A9AAE`, then value 12px/700 `#12122B`.
   - `Plan` → `Solo Plan`
   - `Billing` → `₹99 / month`
   - `Next billing on` → `15 May 2025`
     The middle column's glyph tint is **green**; the outer two are indigo.
6. **`What you can do now`** section card y≈310–470: white, radius 18, heading 14px/700 with
   16px padding, then 4 rows. Row anatomy = 32px indigo-tint icon chip + title 13px/600 +
   sub 11px/400 `#6E6E85` (wraps to 2 lines) + trailing `›`. Row height ~50, 1px inset divider
   between rows (or 6px gap — divider is very faint).
7. **Emotional card** y≈485–545: light lilac `#F4F1FF` radius 18, headline
   `Your health journey just got even better 💜` 13px/700 + sub 11px/400, with Baymax + dumbbell
   artwork on the right.
8. **Primary CTA** `Explore Ask Baymax` — full width, height 52, radius 14, solid indigo, white
   16px/700.
9. **Secondary text button** `Go to Home` — centred, 14px/600 indigo, no border, ~44px tap height.
10. No bottom tab bar.

---

## 7. `I 249-Month paywall success.png` → “You’re all set!” → **Family purchase success**

```
✓
You're all set!
Your Family Plan is now active.
Together, let's build a healthier tomorrow.

Plan            Billing           Next billing on
Family Plan     ₹249 / month      15 May 2025

Better health, together 💜
Add your family members and unlock the full
power of smarter health insights for everyone.

What's next?

[icon] Add family members                                        ›
       Add up to 4 family members and start
       sharing the benefits.
       (o)(o)(o) +          ← stacked mini avatars
       [ Add family members ]        ← solid indigo full-width button

[icon] Invite family to join Baymax                              ›
       Send an invite link to your loved ones.
       They can join and enjoy smarter health care.
       [ Invite family members ]     ← OUTLINED indigo full-width button

✅ Your subscription is active and secure.
   You can manage your plan anytime in Settings.

[ Explore Ask Baymax ]
Go to Home
```

Deltas vs. the ₹99 success screen:

- Sub-headline differs (`Together, let's build a healthier tomorrow.`).
- The emotional card (`Better health, together 💜`) is promoted **above** the action list and is
  taller (~72px) with the Baymax + dumbbell art on the **left**.
- Section heading is **`What's next?`** (not “What you can do now”) and contains **2 action cards**
  instead of 4 list rows. Each action card is a separate white card, radius 16, padding 14,
  height ~110/100, with its **own full-width button inside** (height 44, radius 12):
  - card 1 button = **solid indigo** `Add family members`; card 1 also shows a row of 3 overlapped
    28px avatar circles plus a dashed `+` circle.
  - card 2 button = **outlined indigo** `Invite family members`.
- Extra **green trust strip** above the CTA: mint `#EAF8F0`, radius 12, green tick,
  `Your subscription is active and secure. / You can manage your plan anytime in Settings.`
- Same `Explore Ask Baymax` primary + `Go to Home` text link footer.

---

# Settings sub-screens (J screens)

All J screens use: circular back button top-left, centred bold title, and a centred
**icon + micro-tagline** line directly under the title.

---

## 8. `J notification screen.png` → “Notifications” → Settings ▸ Notifications

Sub-title line: `🔔 Stay informed, your way`

### Exact visible text

```
←              Notifications
            🔔 Stay informed, your way

Never miss what
matters to your health
Choose the updates you want to receive.
You can change these anytime.

▸ General updates
  Important updates about your account and Baymax.
    Account & security                                  [ON]
    Get notified about logins, password changes
    and security alerts.
    Product updates                                     [ON]
    New features, improvements and announcements.
    Tips & reminders                                    [ON]
    Helpful tips to get the most out of Baymax.

▸ Health & insights
  Stay on top of your health and check-ins.
    Daily check-in reminders                            [ON]
    Receive reminders to complete your daily
    check-in with Baymax.
    Health insights                                     [ON]
    Personalised insights and recommendations
    based on your data.
    Report notifications                                [OFF]
    When your reports are ready or updated.

▸ Family & sharing
  Updates about your family members and sharing.
    Family member activity                              [ON]
    Get notified about check-ins and added reports
    from family members.
    Invitations & requests                              [ON]
    Receive alerts for invites or joint or plans.   [low-confidence]

▸ Marketing & offers
  Special offers and content we think you'll love.
    Promotions & offers                                 [OFF]
    Discounts, offers and exclusive deals.

🛡 You're in control
   You can update your notification preferences anytime.
   We respect your choices.
```

### Layout & components

1. **Hero card** y≈115–190: light lilac `#F1EDFF` radius 20, height ~78. Headline
   `Never miss what matters to your health` 18px/800 — the phrase **“matters to your health”
   is indigo**, the rest is near-black (two-tone headline, appears on most J screens).
   12px/400 sub, 2 lines. Baymax mascot art on the right with a small chat-bubble glyph.
2. **Four collapsible groups.** Each group is one white card, radius 16, with:
   - **Group header row** (height 48): 30px indigo-tint icon chip + group title 14px/700 +
     11px/400 `#9A9AAE` sub-line, and a **chevron `⌄` on the right (expanded state)**. Groups are
     accordion-style and rendered expanded in the mockup.
   - **Toggle rows**, height ~56, 1px inset divider between. Left: label 13px/600 + sub 10.5px/400
     `#6E6E85` (1–2 lines). Right: **iOS-style switch**.
3. **Toggle styling** (this is the canonical switch for the whole app):
   - Track **44×26**, radius 13. ON = solid indigo `#5B3DF5`. OFF = `#E3E3EC` grey.
   - Knob 22px white circle, 2px inset, `0 1px 2px rgba(0,0,0,.15)` shadow.
   - No text inside the track; no “on/off” labels.
   - **Default states shipped in the design:** ON for Account & security, Product updates,
     Tips & reminders, Daily check-in reminders, Health insights, Family member activity,
     Invitations & requests. **OFF** for `Report notifications` and `Promotions & offers`.
4. **Footer reassurance card**: light lilac, radius 16, shield glyph, `You're in control` 12px/700
   - 2-line 10px/400 sub, with faint Baymax art behind.
5. **This screen renders a bottom tab bar** with labels `Home · Ask Baymax · Reports · Family ·
Settings` and **Settings is the active tab** — different from the H screens (see Surprises).

---

## 9. `J privacy and security screen.png` → “Security & Privacy” → Settings ▸ Security & privacy

Sub-title line: `🛡 Your health data is safe with us`

### Exact visible text

```
←              Security & Privacy
           🛡 Your health data is safe with us

Your trust,
our top priority
We follow industry-leading security practices
to keep your data private, secure and in your control.

How we protect your data
  🔒 End-to-end encryption                                        ›
     All your data is encrypted in transit and at rest
     using industry-standard encryption.
  🏛 Secure infrastructure                                        ›
     We use trusted cloud infrastructure with 24/7 monitoring,
     firewalls and advanced threat detection.
  👤 Strict access control                                        ›
     Your data is accessible only to authorized systems
     and trained personnel.
  🛡 Regular security audits                                      ›
     We conduct regular security assessments and
     vulnerability testing to keep improving.

Your privacy, your control
  👤 You own your data                                            ›
     Your health data belongs to you. We never sell
     your personal information.
  🗄 Data used only to help you                                    ›
     We only use your data to provide and improve
     Baymax and its features.
  ⚙ Easy controls                                                 ›
     View, download or delete your data anytime
     from your account settings.
  🗑 Right to be forgotten                                        ›
     You can request to delete your account and all
     associated data at any time.

✅ We're compliant
   We comply with global security standards and
   applicable data protection regulations.
   [ISO 27001]  [SOC 2 TYPE II]        ← certification badges, right side

❓ Have questions?
   Reach out to our support team              [ Contact support ]
   anytime at support@baymax.health

🔒 Your security and privacy are at the heart of everything we do.
   Thank you for trusting Baymax.
```

### Every visible control (important — this screen is compliance-critical)

| Control                      | Type                    | Behaviour implied by copy                                                                                                            |
| ---------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `End-to-end encryption`      | disclosure row, chevron | opens explainer detail                                                                                                               |
| `Secure infrastructure`      | disclosure row, chevron | explainer                                                                                                                            |
| `Strict access control`      | disclosure row, chevron | explainer                                                                                                                            |
| `Regular security audits`    | disclosure row, chevron | explainer                                                                                                                            |
| `You own your data`          | disclosure row, chevron | policy explainer                                                                                                                     |
| `Data used only to help you` | disclosure row, chevron | policy explainer                                                                                                                     |
| **`Easy controls`**          | disclosure row, chevron | **This is the export/download + delete entry point.** Copy: “View, download or delete your data anytime from your account settings.” |
| **`Right to be forgotten`**  | disclosure row, chevron | **Account + all-data deletion request.**                                                                                             |
| `Contact support`            | outlined indigo button  | mailto/support flow to `support@baymax.health`                                                                                       |

**Surprise / gap:** there is **no toggle, no switch, and no explicit consent checkbox anywhere on
this screen** — no “analytics consent”, no “share data for research”, no separate
`Export my data` / `Delete my account` buttons. Export and deletion are only reachable as
**chevron disclosure rows** (`Easy controls`, `Right to be forgotten`). If the written spec calls
for dedicated destructive buttons or a consent toggle list, **the design does not have them** and
the design wins. There is also **no red destructive styling anywhere** — `Right to be forgotten`
uses the same neutral indigo-tint icon chip as every other row.

### Layout & colour

1. Hero card, light lilac radius 20: two-tone headline `Your trust,` (near-black) /
   `our top priority` (indigo), 20px/800, line-height 26; 11px/400 2-line sub. Right side shows
   a **purple padlock badge with a green ✓ shield** artwork.
2. Two sections, each with a 14px/700 section heading in the page gutter, then a white card
   radius 16 containing 4 rows. Row = 30px indigo-tint icon chip + 13px/600 title +
   10.5px/400 `#6E6E85` 2-line sub + `›`. Row height ~58, hairline dividers.
3. **Compliance card**: mint `#EAF8F0`, 1px `#CBEBD9`, radius 16. Green tick glyph,
   `We're compliant` 12px/700 `#1E7A4C`. Right side: two badge chips — `ISO 27001` and
   `SOC 2 TYPE II` — rendered as ~52×36 white/grey outlined seals.
   → **Green = trust/compliance affirmation.**
4. **Support card**: light lilac radius 16, `?` glyph, text left, **outlined indigo button
   `Contact support`** right (height 32, radius 10, 12px/600).
5. Footer micro-copy centred, 10px/400 `#9A9AAE`, 2 lines with a small padlock.
6. **No bottom tab bar** on this screen (full-screen sub-page, home indicator only).

---

## 10. `J Languages screen.png` → “Language” → Settings ▸ Language

Sub-title line: `🌐 Choose your preferred language`

### Exact visible text

```
←              Language
           🌐 Choose your preferred language

Your language, your experience
We're working hard to bring Baymax
to more languages.
                                   [A / अ  circular badge]

Available now
  EN   English                                              ✓
       Default language

Coming soon
  हिं   हिंदी      Hindi                            [Coming soon]
  বাং   বাংলা      Bengali                          [Coming soon]
  म    मराठी      Marathi                          [Coming soon]
  த    தமிழ்      Tamil                            [Coming soon]
  తె   తెలుగు     Telugu                           [Coming soon]
  ગુ   ગુજરાતી    Gujarati                         [Coming soon]
  ಕ    ಕನ್ನಡ      Kannada                          [Coming soon]
  മ    മലയാളം     Malayalam                        [Coming soon]
  ਪੰ   ਪੰਜਾਬੀ     Punjabi                          [Coming soon]
  ଓ    ଓଡ଼ିଆ      Odia                             [Coming soon]
  অস   অসমীয়া    Assamese                         [Coming soon]
  सं   संस्कृतम्   Sanskrit                         [Coming soon]

🌐 More languages on the way!
   We're constantly adding more languages to make Baymax
   accessible for everyone.
```

### Layout & components

1. Hero card, light lilac radius 20, height ~72. Two-tone headline `Your language,` (near-black) /
   `your experience` (indigo) 18px/800. 11px/400 2-line sub. Right: a **56px indigo gradient circle
   containing a large white `A`** with a smaller outlined circle behind showing `अ` — a
   Latin/Devanagari language mark.
2. Section label `Available now` 13px/700 in the gutter, then **one selected row**:
   white card, radius 14, height 60, **2px indigo border (selected state)**.
   - Left: 34×34 **indigo-filled** rounded-square with white `EN` 12px/800.
   - `English` 14px/700; `Default language` 11px/400 `#9A9AAE`.
   - Right: **indigo filled circle with white check**, 22px.
3. Section label `Coming soon`, then **12 disabled rows**, each its own white card,
   radius 12, height 46, margin-bottom 6.
   - Left: 30×30 rounded-square, **light lilac fill `#F1EDFF`** with the script character in
     indigo 12px/700.
   - Native name 12.5px/600 (in its own script) on line 1; **English/roman name 10px/400
     `#9A9AAE` on line 2**.
   - Right: **pill badge `Coming soon`** — bg `#F1EDFF`, text indigo 10px/600, radius 10,
     height 20, horizontal padding 8. No chevron, no radio.
   - Whole row at ~85–90% opacity and non-interactive.
4. Footer card, light lilac radius 16: 30px globe glyph + `More languages on the way!` 12px/700 +
   2-line 10px/400 sub.
5. No bottom tab bar.

**Surprise:** only **one** language is selectable. The list is a long static “coming soon”
manifest of 12 Indian languages — build it as data, not as a functioning language picker.
Each row must render **two scripts** (native + roman transliteration).

---

## 11. `J help and report.png` → “Help & Support” → Settings ▸ Help & support

Sub-title line: `💬 We're here to help`

### Exact visible text

```
←              Help & Support
              💬 We're here to help

How can we help you today?
Tell us what's going on and we'll
get back to you as soon as possible.

Top help topics
  ⚑ Report a bug            ⚠ App not working       ▣ Subscription &      👤 Account help
    Something isn't            Facing crashes,         billing               Login issues,
    working right              errors or loading       Questions about       profile or other
                               issues?                 payments, plans       account support?
                                                       or refunds?

Report a bug or problem
  ✎  Let us know what went wrong
     Help us improve Baymax by sharing
     as much detail as you can.
                                              [ Report an issue → ]

     ⚡ Quick & easy          ⏱ Faster resolution      ♥ We care
       Share in a few            More details help      Your feedback helps
       simple steps              us fix it sooner       make Baymax better

Other ways we can help
  ❓ FAQs                                                          ›
     Find answers to common questions
  ✉ Contact support                                                ›
     Chat or email with our support team
  📖 Help center                                                    ›
     Guides and articles to help you get the most out of Baymax
  💡 Feature request                                                ›
     Have an idea? We'd love to hear it!

🛡 We're here for you
   Our support team typically replies within 24–48 hours.

💜 Your feedback is important and always appreciated.
   Thank you for being a part of Baymax.
```

### Layout & components

1. Hero card, light lilac radius 20, ~78 tall. Two-tone headline `How can we help you today?`
   with **`help you`** in indigo, 18px/800. 11px/400 2-line sub. Baymax mascot on the right with a
   floating `···` chat bubble.
2. `Top help topics` 14px/700, then a **2×2 grid of tiles**, gap 10, each tile ~50% width,
   white, radius 14, padding 12, height ~86:
   - 26px tinted glyph on top (each a different tint: `Report a bug` indigo, `App not working`
     **amber/orange** `#FFF3E0` bg with `#F5A524` glyph, `Subscription & billing` **green**
     `#EAF8F0`/`#1DA860`, `Account help` indigo).
     → **Amber here = “something is broken / warning”, green = “billing/money”.** Neither is an
     error state.
   - Title 12.5px/700, then 10px/400 `#6E6E85` sub (2–3 lines).
3. `Report a bug or problem` 14px/700, then a **highlight card**: light lilac `#F1EDFF`,
   radius 18, padding 14.
   - 32px white rounded-square with a pencil/report glyph.
   - `Let us know what went wrong` 13px/700 + 11px/400 2-line sub.
   - **Solid indigo button `Report an issue →`**, right-aligned, height 36, radius 10,
     13px/600 white, with a trailing arrow glyph.
   - Below, an inset **white sub-card** with a **3-column benefit row**: 16px glyph + 10.5px/600
     title + 9.5px/400 sub — `Quick & easy / Share in a few simple steps`,
     `Faster resolution / More details help us fix it sooner`,
     `We care / Your feedback helps make Baymax better`.
4. `Other ways we can help` 14px/700, then **4 standard settings rows** (same anatomy as the
   Profile list: 30px icon chip, 13px/600 title, 10.5px/400 sub, `›`), each in its own white
   card radius 12, height 54, gap 8.
5. **Footer promise card**: light lilac radius 18, ~66 tall, shield glyph, `We're here for you`
   12px/700, `Our support team typically replies within 24–48 hours.` 10px/400, with Baymax +
   floating purple hearts artwork on the right.
6. Centred footer micro-copy 10px/400 `#9A9AAE`, 2 lines, purple-heart glyph.
7. No bottom tab bar.

---

## 12. `J About baymax screen.png` → “About Baymax” → Settings ▸ About Baymax

Sub-title line: `♥ Your AI health companion`

This is the **longest and most editorial** screen in the set — a marketing/manifesto page, not a
settings list. It has a **sticky bottom bar** that no other J screen has.

### Exact visible text

```
←              About Baymax
            ♥ Your AI health companion

More than answers.
A companion for life. 💜
Baymax is your calm, personalised
health companion that knows you,
remembers what matters, and guides
you like you deserve to be.

  🛡 Safe               👤 Personalised        ♥ Companionship      ✦ Guidance
    You data is           Built around you       Always by            Smart, gentle
    always protected      and your family        your side            steps you can trust

Tired of the medical spiral?
You're not alone.
Every time something feels off, the same cycle begins —
overthinking, searching, worrying.

  ?  You search your symptoms online
  ?  You get confusing and scary information
  ?  You feel more anxious, not reassured

  ✦ Let's break that cycle.
    With Baymax, you get clear answers, calm guidance,
    and peace of mind.

Baymax remembers everything
about you — so you don't have to.
  ✓ Your past medications and allergies
  ✓ Medications, reports and doctor visits
  ✓ Your goals, preferences and symptoms
  ✓ What works for you — and what doesn't
                                        [low-confidence on exact bullet wording]

  💬 The more you share, the better I understand you.
     So I can support you in the most meaningful way.

No more guessing.
No more endless searching.
Skip the generic advice. Get personalised health insights
that are relevant to you, your body and your life.
  ✓ Not guidance. Not you. Feels like it.   [low-confidence]
    ┌ Generic search ┐  vs  ┌ Baymax ┐    ← two-column comparison table
    ✗ One-size-fits-all answers      ✓ Personalised for you
    ✗ You need lots of guesswork     ✓ Clear, trusted insights
    ✗ Never knows your history       ✓ Remembers everything
    ✗ More anxiety, less clarity     ✓ Calm, confident guidance
                                        [low-confidence on exact row wording]

Your health. Your story. Our priority.
  ♥ Private by design        ♥ You're in control       ♥ Always here for you
    Your data is encrypted     Your data, your          Support anytime,
    and never sold             choices, always          from anywhere

┌ STICKY BOTTOM BAR ────────────────────────────────────┐
│ I'm here to listen, support and guide you — every     │
│ step of the way.                                       │  [ Chat with Baymax ]
│ Let's take better care of you, together.               │
└────────────────────────────────────────────────────────┘
Baymax is not a replacement for professional medical advice.
For emergencies, please contact your doctor or local emergency services.
```

### Layout notes

- Page background is a **soft lilac gradient wash** (`#F6F3FF` → white), not flat grey, with faint
  decorative sparkle/particle art behind sections.
- Section rhythm: big two-tone headline (line 1 near-black, line 2 indigo) 20–22px/800,
  then 11px/400 `#6E6E85` body, then a white content card radius 18–20.
- **4-up value grid** near the top: 4 equal columns, 24px indigo glyph, 11px/700 title,
  9.5px/400 2-line sub.
- The “medical spiral” section is a white card with **3 problem rows**, each a 22px circular
  `?` glyph chip + 11px/500 text, followed by an **indigo-tinted resolution strip**
  (`Let's break that cycle.`) with a sparkle glyph.
- The “remembers everything” section pairs a **Baymax + heart illustration on the left** with a
  **4-item green-tick checklist on the right** (ticks are indigo, not green).
- The comparison block is a genuine **2-column table**: left header pill `Generic search`
  (grey/neutral) with **red ✗ marks**, right header pill `Baymax` (indigo) with **green ✓ marks**.
  → **This is the only place red is used, and it means “the bad/old way”, not an error.**
- The closing triad uses 3 columns with purple heart glyphs.
- **Sticky bottom CTA bar**: full-bleed indigo `#5B3DF5` block, radius 16, 20px side margins,
  height ~64, sitting above the safe area with a shadow. Contains 2 lines of white
  10.5px/500 copy on the left and a **white pill button `Chat with Baymax`** (indigo label,
  height 34, radius 17) on the right.
- Under the sticky bar: **medical disclaimer** 9px/400 `#9A9AAE`, centred, 2 lines. This
  disclaimer is legally load-bearing — do not drop it.
- No bottom tab bar (the sticky CTA replaces it).

---

# Things that would surprise a developer working from a written spec

1. **Family features are shown-but-disabled on Solo, not hidden.** The Solo profile renders the
   full family avatar strip in greyscale with a lock badge plus a `Family access is a Premium
feature` upsell card. Free hides the section entirely. Three distinct renderings, not two.
2. **The Solo profile still shows a `Free plan` pill** next to `Account secure`. Only the Family
   state shows `Profile verified`. Either the design intends “free of _family_” or it's a design
   bug — flag it, but build the pill as data-driven.
3. **The upgrade surface changes shape per tier**, not just per label: Free gets a two-card
   side-by-side comparison with outlined buttons; Solo gets a compact banner with a _solid_
   `Upgrade now`; Family gets the same banner with an _outlined_ `View plans`.
4. **The ₹99 and ₹249 paywalls are not the same card count.** ₹99 has a 4-column benefit grid with
   2-line labels; ₹249 has a **5-column** grid with a **third caption line** per column. The ₹249
   screen also swaps the small companion strip for a taller `Better health, together.` feature card.
5. **The two success screens diverge structurally.** ₹99 = a 4-row “What you can do now” list.
   ₹249 = a 2-card “What's next?” block where each card contains its own full-width button
   (one solid, one outlined) plus an avatar stack, and adds a green “subscription is active”
   trust strip.
6. **Green never means “success” on the paywall.** The mint card on the checkout screen carries the
   _auto-renewal billing disclosure_ (`₹99 will be charged automatically every month…`) and the
   compliance/trust strips. Success is communicated in **indigo**, not green.
7. **Red appears exactly twice in this whole set**: the notification count badge on the Family
   profile bell, and the ✗ marks in the About-Baymax comparison table. There is **no red
   destructive styling on the privacy screen** — `Right to be forgotten` looks like any other row.
8. **Privacy & Security has zero toggles and zero consent checkboxes.** Export and delete are
   buried as chevron disclosure rows (`Easy controls`, `Right to be forgotten`). There are no
   dedicated “Export my data” / “Delete my account” buttons on this screen. If the spec promises
   them, the design does not deliver them here.
9. **Two ISO/SOC certification badge assets** (`ISO 27001`, `SOC 2 TYPE II`) are rendered on the
   privacy screen and must be sourced as images.
10. **The Language screen is 13 rows where 12 are inert.** Each coming-soon row needs the native
    script name _and_ a roman transliteration on a second line — a dual-script row component that
    does not exist anywhere else in the app.
11. **The bottom tab bar is inconsistent across the set.** H profile screens show
    `Home · Documents · (+) · Ask Baymax · Profile` with **Profile** active. The Notifications
    screen shows `Home · Ask Baymax · Reports · Family · Settings` with **Settings** active.
    Paywall, success, privacy, language, help and about screens show **no tab bar at all**.
    Resolve the canonical tab set before building; the sub-screens are clearly full-screen pushes.
12. **About Baymax is a marketing page with a sticky indigo CTA bar**, plus a legally required
    medical disclaimer underneath. It is not a version-info screen despite the settings row
    sub-label reading `App version and information`.
13. **Payment-method logo assets are required**: UPI wordmark, GPay, PhonePe, Paytm, BHIM, VISA,
    Mastercard, RuPay. The UPI block also has a nested `Pay with … +More ›` sub-row with its own
    chevron, i.e. two tap targets inside one selectable card.
14. **The date `15 May 2025` is hardcoded in both success mockups** as “Next billing on”. Compute
    it as `today + 1 month` at runtime.
15. **Two-tone headlines are a system-wide pattern** on the J screens (line 1 near-black, the
    emphasised phrase in indigo). Build a shared `<Headline>` that accepts an emphasis span rather
    than hardcoding per screen.
