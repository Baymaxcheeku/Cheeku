# Vision board

The live board is **https://claude.ai/artifact/KUeA2YYdL4CmUKWhK3faAE**. It is private to the owner: share it from its Share menu with Suraj and Deepesh as **editors** (people who can only view the artifact see nothing; the shared data needs edit access).

It is the internal 3 to 5 year plan for Athar, Suraj and Deepesh: what we do, when, who owns it and why, from Q4 2026 (pre-launch) through 2031. Quarters run to the end of 2029, then half-years for 2030 and 2031, matching the financial model.

## What is on it

- **Board.** Nine lanes (product, AI and tech, supply, growth, revenue, employers and B2B, funding, team, trust) across 18 columns. Every column header carries the financial model for that period: users, revenue, EBITDA, cash, team and companies at period end, plus the model's events (Series A, employers going live, profitable for good).
- **Cards.** Kind (milestone, initiative, bet, decision, gate), owner, priority, status, tags, why, how, a "done when" line, confidence, dependencies and the moat pillar it builds. Drag a card to move it.
- **Cards the model places.** A card can hang off a model event ("Employers go live", "Series B + 3 months") or a number ("monthly users reach 50 lakh"). It then shows a lightning mark and moves on its own when the plan changes. These cannot be dragged; change the trigger in the card.
- **Model levers.** The same engine as the financial model (`finance/`, base case v2). Scenario and levers are a private what-if until someone presses **Make it the plan**; the plan is shared.
- **Owners, Trajectory, Risks, Moats, Decisions.** One founder's cards in time order; users by joining cohort, revenue by engine, cash and a quarterly cohort table; a 5x5 risk heat map whose bars fill as linked cards get done; defensibility pillars with a live number each; open calls with a for, unsure or against from each of us.
- Presence (who is looking, who is editing a card), a recent-changes feed, comments on any card, and an export of the whole board as JSON.

## Files

| File | What it is |
|---|---|
| `board.json` | The board's data, as of the last sync. Cards, risks, moat pillars, tags and the shared plan levers. |
| `page.template.html` | The page source. `/*ENGINE*/` is replaced by `engine.js` to build `page.html`. |
| `engine.js` | The financial model engine (v2, base case and the bear and bull cases), the same code the model page and workbook are checked against. |
| `page.html` | Exactly what is published. |
| `seed.py` | The first fill of the board (28 Oct 2026), from the plan, the decks, the launch tracker and the model. |
| `sync.py` | Moves data between the live board and `board.json`. |

## Changing the board

**In the page.** Anyone with edit access edits cards, risks and levers directly. Changes are live for everyone.

**Through Claude.** Ask in a session, for example "move the insurer pilot to Q2 2029 and mark it at risk". Claude uses the `ArtifactData` tool on the artifact above: read the document to get its `version`, then `update` with `if_version`. Collections: `items`, `risks`, `moats`, `tags`, `board` (one document, `plan`), `activity` (one document, `feed`).

**Through git.** Edit `board.json` in a PR. After it merges, ask Claude to push it to the board:

1. `ArtifactData` `list` each collection with `out_dir` set to a scratch folder.
2. `python3 docs/vision-board/sync.py diff <that folder>` to see what the live board has that git does not. Anything there is someone's edit on the page: bring it into the PR first or it is lost.
3. `python3 docs/vision-board/sync.py push <scratch>` writes one file per document and `writes.json`.
4. `ArtifactData` `batch` the writes, 50 at a time, with `if_version` from step 1 for documents that exist.

**Syncing the page back to git.** Ask Claude to "sync the vision board to git": steps 1 and 2 above, then `python3 docs/vision-board/sync.py pull <that folder>` and a PR with the new `board.json`. Do this after each weekly sync so the history of the plan lives in git.

## Changing the page itself

Edit `page.template.html` (or `engine.js` when the model changes), run `python3 docs/vision-board/sync.py build -`, check it renders, and publish it to the same artifact URL. The data lives in the artifact's database, so republishing never loses cards.

The board carries seed terms and round plans. It is internal: keep it out of anything that goes to investors.
