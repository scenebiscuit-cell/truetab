# Brief for Claude Code: set up the repo, then build the restaurant report (R1)

Work in `C:\Projects\truetab`. Read `CLAUDE.md`, `README.md`, `PLAN.md`, `docs/DATA.md` and section 3 of `PITCH.md` first. Follow every rule in `CLAUDE.md`. Nick is a beginner programmer on Windows with PowerShell: explain new concepts in one or two plain sentences, start every command block with `cd C:\Projects\truetab`, and end each step with "How to check it worked."

## Step 0: get the project onto GitHub (stop after this step)

The folder came from a zip and already has Git history on branch `m1-prototype` (6 commits). There is no `main` yet and no GitHub repo.

1. Check `git status` and `git log --oneline` on `m1-prototype`.
2. Create a local `main` with one empty commit ("Initial commit"), then rebase `m1-prototype` onto it so the branch has a base to open a pull request against.
3. Create the public repo `scenebiscuit-cell/truetab` with `gh`, push `main` and `m1-prototype`, and open a pull request from `m1-prototype` into `main` titled "TrueTab: prototype, 78745 data, deals, deal check". Summarize the commits in the PR body.
4. Run `npm test` (expect 51 passing) and tell Nick the PR link.
5. **Stop. Do not merge.** Wait for Nick to say "merge." After he says it: merge, turn on GitHub Pages from `main` (root folder), and give him the live link plus how to check it.

## Milestone R1: restaurant report builder

After the merge, create branch `report-builder` from the current `main`.

**Goal:** a page that turns TrueTab's data into the short restaurant report described in `PITCH.md` section 3, so Nick can review it, edit the wording, and print it to PDF to send to a restaurant.

**Build**

1. `src/report.js`: pure functions only, no page code (same pattern as `src/engine.js`, usable from Node for tests). Use the existing engine (`search`, `dealCheck`, `perPortionMedians`, `activeDeals`); don't duplicate its math.
   - `rankFor(data, restaurantId, scenario)`: rank by all-in cost per person among open restaurants, for these scenarios: 1 adult pickup, 1 adult best way, family of 4 (2 adults, 2 kids) pickup, family of 4 best way. Evaluate at a typical lunch time and dinner time on a weekday, and report both. Return rank, out of how many, the restaurant's total, and the cheapest competitor's total.
   - `appGap(data, restaurantId)`: estimated extra cost on each delivery app the restaurant is on, compared with pickup, for both scenarios. Always flagged as an estimate, with the markup used.
   - `promoReport(data, restaurantId)`: every deal for the restaurant, each evaluated at a time it is actually running, with the `dealCheck` verdict and reasons. Include restaurant two-for-one items (`promo: "bogo"`).
   - `portionReport(data, restaurantId)`: share of items with stated portions, whether there's a family pack, whether there are kids' meals, compared with how many nearby restaurants have each.
   - `suggestFixes(data, restaurantId)`: up to 3 candidate changes, each tested by re-running the ranking on a copy of the data with the change applied (never change the real data). Candidates: (a) a family pack priced at the area's median family-pack price per portion, if they have none; (b) a lunch plate priced to match the cheapest nearby price per portion, if they rank in the bottom half for 1 adult; (c) for any promo graded "Not worth it", the pickup special that would beat the app promo. Return the before and after rank and total for each. Only return changes that improve a rank. Label them clearly as suggestions for Nick to review.
2. `report.html`: pick a restaurant and a report date, then render the sections in the order from `PITCH.md` section 3. Include:
   - An **"Anonymize competitors"** checkbox, on by default, which shows competitors as "Nearby spot A, B, C…".
   - A "How this was measured" section: data sources, the date each price was checked, what's estimated (app prices, fees), and the fairness rule from `PLAN.md` (rankings come only from the math; paying doesn't change them).
   - Print styles, so the browser's "Print → Save as PDF" gives a clean 2-page report: no controls, no header, page breaks between sections where needed, body text 11–12 pt.
   - Use the same design system and styles as `index.html`, and link it from `check.html` (not from the public home page).
3. `tests/report.test.js`: tests for each function in `src/report.js` against `data/austin-78745.js`. Include: ranks are 1-based and never exceed the count; a suggested fix always improves the rank it claims to; anonymize hides every competitor name; nothing in `report.js` changes the data passed in (deep-compare before and after).
4. Docs: add R1 to `PLAN.md` with its check, add the new files to the README table, and bump the `?v=` dates.

**Rules**

- Every number in the report must trace back to the data and the engine. Never type a number into the page by hand.
- Anything estimated says "est." or "estimated" next to it.
- No ratings are stored or shown in the report until live ratings exist (`PLAN.md` M2c).
- Run `npm test` and check `report.html` in light and dark with axe-core before opening the PR.
- Open a pull request from `report-builder` into `main`. Don't merge until Nick says "merge."

**Check (how Nick confirms R1 works)**

Open `report.html`, pick **Super Bowl Restaurant**, and print to PDF. The report should:
- fit on about 2 pages;
- show its ranks for 1 adult and a family of 4;
- show its two-for-one plates graded "Real deal" with the reasons;
- show competitors as "Nearby spot A, B…";
- end with "How this was measured," including the date checked.

Untick "Anonymize competitors" and the real names should appear. `npm test` passes.
