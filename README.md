# TrueTab

**What does your budget actually get you?** TrueTab compares Austin restaurants across dine-in, pickup, the restaurant's own delivery, DoorDash and Uber Eats, using the **all-in price**: menu prices plus delivery fee, service fee, small-order fee and tax, plus a tip if you choose to add one. Set a budget range, who you're feeding, when, and what you like, and it finds the best meal for your money at each spot, including any deal running at that time. Cheap lunch or nice dinner: the range decides.

Created by Nick Lax.

> **Status: real data for 78745 (6 restaurants), collected 2026-11-22 and 2026-11-23 from restaurants' own websites and Toast ordering pages.** DoorDash and Uber Eats prices are estimated, not collected. `data/sample-data.js` is fictional and used only by the tests.

## Features

- **Feed my group, step by step:** 1 Budget & group, 2 When & how, 3 Diet, 4 Costs (spend at least, sort, and an optional "Add a tip to the totals" checkbox), with Back and Next, and **Show results** on every step so you can search as soon as you've said what matters. Each restaurant shows its cheapest order that feeds everyone, the cheapest way to get it, cost per person, and a Fits / Just over / Over budget tag.
- **Cuisine filter and diet:** results start with every cuisine; chips above the results (with counts) narrow them, and All brings everything back. Vegetarian, vegan and gluten-free meals are built only from items the menu tags that way. Not an allergy guarantee, and the page says so.
- **Deals:** set prices, percent off, dollars off and kids eat free, applied only on their days, hours and ways to order. Each card shows the deal and how much it saves.
- **App price estimator:** DoorDash and Uber Eats menu prices estimated from the restaurant's price plus 20% (set by `defaultMarkupPct` in the data file, explained on each result), then typical fees. Always labeled "est."
- **Deal check:** every deal is graded Real deal, Small saving or Not worth it, with reasons: savings versus the same order, versus the cheapest way to order without any deal, versus similar dishes nearby, and versus the item's recent prices.
- **Kids' meals, card surcharges, to-go fees and opening hours** are counted when the menu states them.
- **Reviews side by side:** links to each restaurant's Google, Yelp and Tripadvisor pages. Live ratings are planned.
- **Restaurant report** (`report.html`, linked from the checklist): a 2-page value check for one restaurant, with ranks, app vs. pickup, promo verdicts, portions and tested suggestions. Competitors are anonymized by default. Print it to PDF.
- **Weekly post draft** (`post.html`, linked from the checklist): "78745 Real Deals" written from the data, with a list of things to check before posting. Copy, edit, post.
- **Weekly reminder, driven by market prices:** every Monday a GitHub issue lists what to check by hand that week. A menu is due every 60 days, or sooner when government price data shows restaurant prices in the South up 2% or an ingredient it uses (beef, chicken, pork, eggs, rice, bread) up 8% since its last check. Up to 10 a week, deals re-verified weekly. Only `scripts/fetch-market.js` goes online, and only to the U.S. Bureau of Labor Statistics; nothing visits a restaurant's site or an app.
- **Data checklist** (`check.html`): which restaurants are due for a weekly check, with links to their website and social pages, plus menu price changes found in the last 30 days.
- **Honest portions:** every item says where its portion size came from: the restaurant, customer reports, or a typical amount for that kind of dish. Cards say "Some portions estimated" when any guess was used.
- **Price breakdown** for every order, and a comparison of every way to order from that spot.
- **Compare a dish:** the same kind of dish across restaurants, with price per portion and a Cheaper / About the same / Pricier tag against the typical price.
- **One thing at a time:** the home page uses tabs for its views, the search settings, How it works, and each result card's details. A one-line summary always shows the settings in other tabs.
- Light and dark themes, keyboard friendly, no accessibility issues found by axe-core.

## How the math works

- **All-in price** (`allInPrice` in `src/engine.js`): subtotal + delivery fee + service fee (a percentage with a minimum) + small-order fee (under a threshold) + tax on the food + tip on the food (only when the visitor adds one; otherwise the breakdown shows what a usual tip would add, not counted). Pickup has no fees or tip.
- **Feeding a group** (`cheapestOrder`): adults count as 1 portion, kids as 0.6. The engine finds the cheapest mix of menu items that covers the group, counting in twelfths of a portion so "3 tacos per adult" and "serves 1.25" both work. Sides and add-ons don't count toward feeding anyone.
- **Deals** (`activeDeals`, `itemsWithDeals`): the engine prices the order with and without the deals running at that day and time and keeps the cheaper one. Kids eat free removes those kids' portions from what gets bought.
- **Best value** (`valueScore`): stars above 3, divided by cost per person. A 3-star place adds no value.
- **Limits:** fees change with distance, time and promotions, so every total is an estimate and is labeled "est." Tax is applied to the food only.

## Run it

No build step and no installs. Open `index.html` in a browser, or serve the folder with GitHub Pages.

Tests use Node's built-in test runner:

```powershell
cd C:\Projects\truetab
npm test
```

## Files

| Path | What it does |
|---|---|
| `index.html` | The page |
| `src/engine.js` | All the math. No page code, so it can be tested in Node |
| `src/app.js` | The only file that touches the main page |
| `src/report.js` | Restaurant report and weekly post: ranks, app gap, promo check, portions, tested suggestions, post text. No page code |
| `report.html` | Restaurant report builder (print to PDF) |
| `post.html` | Weekly "Real Deals" post draft |
| `src/styles.css` | Styles: TrueTab's "guest check" look (see DESIGN.md) |
| `data/austin-78745.js` | Real 78745 data the page uses |
| `data/sample-data.js` | Fictional sample data for tests |
| `check.html` | Weekly data checklist |
| `tests/engine.test.js` | 41 engine tests (sample data) |
| `tests/real-data.test.js` | 15 checks on the real data |
| `scripts/fetch-market.js` | Fetches monthly price data from the BLS public API (its only web access) |
| `scripts/weekly-check.js` | Writes the weekly hand-check list from the data and the price data (no web access) |
| `.github/workflows/weekly-check.yml` | Runs it every Monday and opens the GitHub issue |
| `tests/weekly-check.test.js` | 11 tests for the weekly list and market triggers, including that only the BLS is ever contacted |
| `tests/report.test.js` | 15 restaurant report and weekly post tests (real data) |
| `docs/DATA.md` | The data format and how to collect real data |
| `PLAN.md` | Milestones, decisions and the money plan |
| `PITCH.md` | Restaurant report listing, outreach message and sample report |
