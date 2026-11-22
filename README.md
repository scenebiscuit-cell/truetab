# Menu Math

**What does your budget actually get you?** Menu Math compares Austin restaurants across pickup, the restaurant's own delivery, DoorDash and Uber Eats, using the **all-in price**: menu prices plus delivery fee, service fee, small-order fee, tax and tip. Set a budget and how many adults and kids you're feeding, and it finds the cheapest way to feed everyone at each spot.

Created by Nick Lax.

> **Status: prototype with sample data.** Every restaurant, price, fee and rating in `data/sample-data.js` is invented. The neighborhoods are real Austin areas; the restaurants are not.

## Features

- **Feed my group:** budget, adults, kids, pickup/delivery, food type, tip. Each restaurant shows its cheapest order that feeds everyone, the cheapest way to get it, cost per person, and a Fits / Just over / Over budget tag.
- **Honest portions:** every item says where its portion size came from: the restaurant, customer reports, or a typical amount for that kind of dish. Cards say "Some portions estimated" when any guess was used.
- **Price breakdown** for every order, and a comparison of every way to order from that spot.
- **Compare a dish:** the same kind of dish across restaurants, with price per portion and a Cheaper / About the same / Pricier tag against the typical price.
- Light and dark themes, keyboard friendly, no accessibility issues found by axe-core.

## How the math works

- **All-in price** (`allInPrice` in `src/engine.js`): subtotal + delivery fee + service fee (a percentage with a minimum) + small-order fee (under a threshold) + tax on the food + tip on the food. Pickup has no fees or tip.
- **Feeding a group** (`cheapestOrder`): adults count as 1 portion, kids as 0.6. The engine finds the cheapest mix of menu items that covers the group, counting in twelfths of a portion so "3 tacos per adult" and "serves 1.25" both work. Sides and add-ons don't count toward feeding anyone.
- **Best value** (`valueScore`): stars above 3, divided by cost per person. A 3-star place adds no value.
- **Limits:** fees change with distance, time and promotions, so every total is an estimate and is labeled "est." Tax is applied to the food only.

## Run it

No build step and no installs. Open `index.html` in a browser, or serve the folder with GitHub Pages.

Tests use Node's built-in test runner:

```powershell
cd C:\Projects\menu-math
npm test
```

## Files

| Path | What it does |
|---|---|
| `index.html` | The page |
| `src/engine.js` | All the math. No page code, so it can be tested in Node |
| `src/app.js` | The only file that touches the page |
| `src/styles.css` | Styles, from the Nick Lax 2026 Design System |
| `data/sample-data.js` | Fictional sample data |
| `tests/engine.test.js` | 18 engine tests |
| `docs/DATA.md` | The data format and how to collect real data |
| `PLAN.md` | Milestones and decisions |
