# Raise tracker

Live: **https://claude.ai/artifact/HzgvNiduRXdfhC62KjA3eg**. Only editors can see its data, so share it with Deepesh from the Share menu as an **editor**.

The seed funnel for the ₹26 cr round: every investor, who leads the conversation (Athar or Deepesh), every touch, and drafts for warm-ups, outreach, intro requests and follow-ups in email, WhatsApp or LinkedIn voice.

## Views

- **Pipeline**: Target, Warming up, Intro asked, Contacted, Meeting, Diligence, Term sheet, Committed (plus Passed and Not now). Drag cards between stages.
- **List**: sortable table of everyone.
- **Today**: next steps due, conversations going cold, A-tier targets with no lead, latest activity.
- **Long list**: the 934 angels from the paid list that came with a name and contact only, plus the 53 screened out with their reason. "Add to pipeline" promotes one.
- **Our story**: the text every draft is written from. Keep it current.

Open any investor for the record, the fit reasons, a fit memo (the founder-board lenses: why yes, the likely objection, the opening line), contacts and the composer. Drafts are never sent from the page: copy, send from your own account, then **Log as sent**, which records the touch, moves the stage and sets the follow-up.

## Data

Collections in the artifact's database: `investors`, `touches`, `pool`, `meta/context`, `meta/team`. The database is the source of truth.

The uploaded lists and the scored output are **not** in git: they hold personal emails and phone-adjacent contacts from a purchased list, and this repo is visible to the engineering team. `screening/score.py` and `screening/build_docs.py` re-run the screening from the original xlsx files if needed.

## How the screening works (28 Oct 2026)

Three uploads: 99 funds with type, stage and partner emails; 177 funds with a description and portfolio, plus 193 active angels with portfolios; 990 angels with name, city and contacts only.

- **A** (34): health in the thesis or a health portfolio, at seed. Lead or co-lead candidates.
- **B** (~70): early-stage consumer, AI or active seed programmes and accelerators.
- **C** (~265): early generalists and angels with no health or consumer signal.
- **Out** (53): PE, growth or late stage only, venture debt, financial services firms, sectors far from ours, no longer investing, deceased.
- **Unscreened** (934): name and contact only.

Flags call out what the lists cannot know: funds that renamed (Sequoia India is Peak XV, SAIF is Elevation, Matrix India is Z47), investors backing a close competitor (HealthifyMe, Eka Care, Practo), and roles that changed. The lists are dated, so check each fund's current focus before writing.
