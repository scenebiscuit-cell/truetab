# TrueTab

**What does your budget actually get you?** TrueTab compares Austin restaurants across dine-in, pickup, the restaurant's own delivery, DoorDash and Uber Eats, using the **all-in price**: menu prices plus delivery fee, service fee, small-order fee, tax and tip. Set a budget range, who you're feeding, when, and what you like, and it finds the best meal for your money at each spot, including any deal running at that time. Cheap lunch or nice dinner: the range decides.

Created by Nick Lax.

> **Status: real data for 78745 (6 restaurants), collected 2026-11-22 from restaurants' own websites and Toast ordering pages.** DoorDash and Uber Eats prices are estimated, not collected. `data/sample-data.js` is fictional and used only by the tests.

## Features

- **Feed my group:** budget range (minimum and maximum), adults, kids, how you'll eat (dine-in, pickup, delivery), when, tip. Each restaurant shows its cheapest order that feeds everyone, the cheapest way to get it, cost per person, and a Fits / Just over / Over budget tag.
- **Cuisine and diet filters:** untick cuisines you never want (remembered on your device); vegetarian, vegan and gluten-free meals built only from items the menu tags that way. Not an allergy guarantee, and the page says so.
- **Deals:** set prices, percent off, dollars off and kids eat free, applied only on their days, hours and ways to order. Each card shows the deal and how much it saves.
- **App price estimator:** DoorDash and Uber Eats menu prices estimated from the restaurant's price plus an adjustable markup (default 20%), then typical fees. Always labeled "est."
- **Deal check:** every deal is graded Real deal, Small saving or Not worth it, with reasons: savings versus the same order, versus the cheapest way to order without any deal, versus similar dishes nearby, and versus the item's recent prices.
- **Kids' meals, card surcharges, to-go fees and opening hours** are counted when the menu states them.
- **Reviews side by side:** links to each restaurant's Google, Yelp and Tripadvisor pages. Live ratings are planned.
- **Restaurant report** (`report.html`, linked from the checklist): a 2-page value check for one restaurant, with ranks, app vs. pickup, promo verdicts, portions and tested suggestions. Competitors are anonymized by default. Print it to PDF.
- **Data checklist** (`check.html`): which restaurants are due for a weekly check, with links to their website and social pages.
- **Honest portions:** every item says where its portion size came from: the restaurant, customer reports, or a typical amount for that kind of dish. Cards say "Some portions estimated" when any guess was used.
- **Price breakdown** for every order, and a comparison of every way to order from that spot.
- **Compare a dish:** the same kind of dish across restaurants, with price per portion and a Cheaper / About the same / Pricier tag against the typical price.
- Light and dark themes, keyboard friendly, no accessibility issues found by axe-core.

## How the math works

- **All-in price** (`allInPrice` in `src/engine.js`): subtotal + delivery fee + service fee (a percentage with a minimum) + small-order fee (under a threshold) + tax on the food + tip on the food. Pickup has no fees or tip.
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
| `src/report.js` | Restaurant report math: ranks, app gap, promo check, portions, tested suggestions. No page code |
| `report.html` | Restaurant report builder (print to PDF) |
| `src/styles.css` | Styles, from the Nick Lax 2026 Design System |
| `data/austin-78745.js` | Real 78745 data the page uses |
| `data/sample-data.js` | Fictional sample data for tests |
| `check.html` | Weekly data checklist |
| `tests/engine.test.js` | 38 engine tests (sample data) |
| `tests/real-data.test.js` | 13 checks on the real data |
| `tests/report.test.js` | 12 restaurant report tests (real data) |
| `docs/DATA.md` | The data format and how to collect real data |
| `PLAN.md` | Milestones, decisions and the money plan |
| `PITCH.md` | Restaurant report listing, outreach message and sample report |
