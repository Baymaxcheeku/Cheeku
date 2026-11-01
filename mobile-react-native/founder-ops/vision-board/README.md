# Vision board

The live board is **https://claude.ai/artifact/KUeA2YYdL4CmUKWhK3faAE**. It is private to the owner: share it from its Share menu with Suraj and Deepesh as **editors** (people who can only view the artifact see nothing; the shared data needs edit access).

It is the internal 3 to 5 year plan for Athar, Suraj and Deepesh: what we do, when, who owns it and why, from Q4 2026 (pre-launch) through 2031. Quarters run to the end of 2029, then half-years for 2030 and 2031, matching the financial model.

## What is on it

- **Board.** Nine lanes (product, AI and tech, supply, growth, revenue, employers and B2B, funding, team, trust) as thin bands across 18 columns. Each column header shows that period's users and revenue from the financial model and its events (Series A, employers going live, profitable for good); click a header for the full set: paying accounts, EBITDA, cash, team and companies. Collapse any lane you are not discussing; zoom to the next five quarters, 2027, to 2028 or all.
- **Cards.** Compact by default: title, owner, priority (P0 and P1 only), status when it is not just "planned", tags and dependencies. Two kinds of coloured pill sit on top. **Type** (solid): Feature, Product addition, New product. **Layer** (tinted): App, B2B, Model, Hardware. The eye at the bottom of a card opens why, done-when and confidence in place for that card only; **Expand all** does it for the whole board. Drag a card to move it.
- **Discuss.** Click a card, or press **Discuss** to start from this quarter, and it opens large in the middle of the screen for the conversation. The top shows the type and layer pills, owner, timing, priority, a confidence ring and a status track (idea, planned, in progress, done, with an at-risk or blocked flag). Below that: why it matters, how we'll do it (as numbered steps when it is written as a list), the finish line, the card's place on the five-year timeline, what it needs first and what it unlocks, the risks it reduces, the moat it builds, and votes on decisions. Arrow keys move to the next or previous card, quarter by quarter; **E** edits in place; **Esc** closes back into the board. Made for a laptop or a bigger screen.
- **Cards the model places.** A card can hang off a model event ("Employers go live", "Series B + 3 months") or a number ("monthly users reach 50 lakh"). It shows a lightning mark with its month and glides to its new quarter when the plan changes. These cannot be dragged; change the trigger in the card.
- **Levers.** The same engine as the financial model (`finance/`, base case v2), in the Levers popover. Scenario and levers are a private what-if until someone presses **Save as plan**; the plan is shared.
- **Trajectory.** One month cursor drives the whole page. Press play to watch the five years unfold, drag the scrubber (model events are marked on it), or hover any chart for a breakdown. Six tiles show users, paying accounts, revenue run rate, EBITDA, cash and team at that month, with the change over the year and a sparkline. Click a legend item to hide a series, switch bear, base or bull on the page, and the charts move to the new numbers. Milestones and gates from the board sit under the users chart; click one to open it.
- **Owners, Risks, Moats, Decisions.** One founder's cards in time order; a 5x5 risk heat map whose bars fill as linked cards get done; nine defensibility pillars with a live number each, including insurance risk infrastructure, the connected one-app ecosystem and the pendant for elder parents; open calls with a for, unsure or against from each of us.
- Filters (owner, priority, status, tags, hide done) and search (press **/**), presence (who is looking at or editing which card), a recent-changes feed with a JSON export, and comments on any card.

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
2. `python3 founder-ops/vision-board/sync.py diff <that folder>` to see what the live board has that git does not. Anything there is someone's edit on the page: bring it into the PR first or it is lost.
3. `python3 founder-ops/vision-board/sync.py push <scratch>` writes one file per document and `writes.json`.
4. `ArtifactData` `batch` the writes, 50 at a time, with `if_version` from step 1 for documents that exist.

**Syncing the page back to git.** Ask Claude to "sync the vision board to git": steps 1 and 2 above, then `python3 founder-ops/vision-board/sync.py pull <that folder>` and a PR with the new `board.json`. Do this after each weekly sync so the history of the plan lives in git.

## Changing the page itself

Edit `page.template.html` (or `engine.js` when the model changes), run `python3 founder-ops/vision-board/sync.py build -`, check it renders, and publish it to the same artifact URL. The data lives in the artifact's database, so republishing never loses cards.

The board carries seed terms and round plans. It is internal: keep it out of anything that goes to investors.
