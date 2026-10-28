# Raise tracker

Live: **https://claude.ai/artifact/HzgvNiduRXdfhC62KjA3eg**. Only editors can see its data, so share it with Deepesh from the Share menu as an **editor**.

The seed funnel for the ₹26 cr round: every investor, who leads the conversation (Athar or Deepesh), every touch, and drafts for warm-ups, outreach, intro requests and follow-ups in email, WhatsApp or LinkedIn voice.

## Views

- **Pipeline**: Target, Warming up, Intro asked, Contacted, Meeting, Diligence, Term sheet, Committed (plus Passed and Not now). Drag cards between stages.
- **List**: sortable table of everyone.
- **Today**: next steps due, conversations going cold, A-tier targets with no lead, latest activity.
- **Grants**: government grants, subsidies and incentives, each with our fit, their rules, what we need first, how to apply and the official link. Track each one through To check, Preparing, Applied, Shortlisted, Won, Rejected or Skip, with an owner, next step and notes. Grants won show in the meter strip.
- **Long list**: the 934 angels from the paid list that came with a name and contact only, plus the 53 screened out with their reason. "Add to pipeline" promotes one.
- **Our story**: the text every draft is written from. Keep it current.

Open any investor for the record, the fit reasons, a fit memo (the founder-board lenses: why yes, the likely objection, the opening line), contacts and the composer. Drafts are never sent from the page: copy, send from your own account, then **Log as sent**, which records the touch, moves the stage and sets the follow-up.

## Data

Collections in the artifact's database: `investors`, `touches`, `pool`, `grants`, `meta/context`, `meta/team`, `meta/nightly`. The database is the source of truth.

The uploaded lists and the scored output are **not** in git: they hold personal emails and phone-adjacent contacts from a purchased list, and this repo is visible to the engineering team. `screening/score.py` and `screening/build_docs.py` re-run the screening from the original xlsx files if needed.

## How the screening works (28 Oct 2026)

Three uploads: 99 funds with type, stage and partner emails; 177 funds with a description and portfolio, plus 193 active angels with portfolios; 990 angels with name, city and contacts only.

- **A** (34): health in the thesis or a health portfolio, at seed. Lead or co-lead candidates.
- **B** (~70): early-stage consumer, AI or active seed programmes and accelerators.
- **C** (~265): early generalists and angels with no health or consumer signal.
- **Out** (53): PE, growth or late stage only, venture debt, financial services firms, sectors far from ours, no longer investing, deceased.
- **Unscreened** (934): name and contact only.

Flags call out what the lists cannot know: funds that renamed (Sequoia India is Peak XV, SAIF is Elevation, Matrix India is Z47), investors backing a close competitor (HealthifyMe, Eka Care, Practo), and roles that changed. The lists are dated, so check each fund's current focus before writing.

## Researching an investor

In any investor's sheet, fill in **Role**, **Firm or company** and **Who is this?** (a past company or a LinkedIn link is enough to pin the person down), then press **Research**.

- **With Parallel Search connected** (free, claude.ai Settings, Connectors), the page runs two web searches through the connector, then asks Claude to turn the results into the profile below. It takes about 30 seconds and writes straight to the record. Each founder connects it on their own account; the first run asks for permission.
- **Without it**, or if the search fails, the record is marked `research.status: "queued"` and shows under Today, "Waiting for research", for the nightly run.

To clear the queue, ask Claude in a session to **"run tracker research"**. Claude then:

1. Queries `investors` where `research.status == "queued"`.
2. For each one, searches the public web for the person and their firm: role, companies, funding, angel or fund investments, health or consumer bets, and anything that links them to us.
3. Writes back with `if_version` set: `title`, `firm`, `why`, `flags`, `tier`, `fit`, `angle`, `angleText` (the opening angle for drafts), and `research` with `summary`, `background`, `investing`, `signals`, `gaps` and `sources` (title and URL).
4. Reports only what a source supports. Anything it could not confirm goes in `gaps`, and conflicting figures go in `flags`.

Drafts and fit memos read the research automatically.

## Nightly run

A Claude routine, "Cheeku nightly investor research" (`trig_015GgGQFXhzA5gbDYx3Uv59C`), runs every night at 00:37 IST in a fresh session. It:

1. Researches everything queued with the Research button.
2. Adds up to 8 new investors a night who show recent public seed activity in health, wellness or consumer AI in India. They are tagged `sources: ["nightly research"]`, appear under Today as "Found overnight", and are checked against the full list so there are no duplicates.
3. On Sundays, re-checks every grant we could reach (status, deadlines, amounts) and adds up to 4 new central or Haryana schemes a week. It never touches the stage, owner, next step or notes the founders set.
4. Writes a run log to `meta/nightly`.

It uses the built-in web search, so it needs no paid connector. Pause or change it from claude.ai's Routines page.

## Finding more on demand

Today, **Find new investors**: an optional focus (for example "women's health angels" or "longevity funds") and a count of 3, 5 or 8. The page runs two Parallel Search searches, Claude proposes candidates named in those results as investing, and the page removes anyone already in `investors` or `pool`. The check ignores case, punctuation and titles, strips fund suffixes (Ventures, Capital, Partners and so on), and treats renames as the same firm (Peak XV and Sequoia India, Elevation and SAIF, Z47 and Matrix India, Chiratae and IDG, IAN). Candidates show with sources; **Add** or **Add all** puts them in Target with `sources: ["found in tracker"]`, and they appear under "Newly found". The nightly run uses the same rules.

## Grants

Seeded on 28 Oct 2026 with 13 schemes, each with its sources. The fit is set against where we are today: V1 built, not yet incorporated, Gurugram.

| Fit | Schemes |
|---|---|
| After incorporation | Startup India Seed Fund (SISFS), Haryana seed grant, Haryana lease rental and patent reimbursement, NIDHI-SSP, ABDM DHIS |
| After seed | IndiaAI compute subsidy, Haryana matching grant (announced, not yet notified) |
| Long shot | BIRAC BIG (next call 1 Jan 2027), MeitY SAMRIDH |
| Not eligible | MeitY GENESIS and TIDE 2.0 (Tier 2 and 3 cities), NIDHI PRAYAS (hardware), IndiaAI BuildAI (closed) |

Nothing is open to us until three things are done: incorporate the private limited company, get DPIIT startup recognition, and register with Startup Haryana. Most schemes also pay through an incubator, so picking one with a health or AI track is the next real step.

**Check for grants** on the Grants view runs two Parallel Search searches and adds only schemes that are not already listed and that come with a source. Parallel Search's free tier has a rate limit, so press it once and wait.
