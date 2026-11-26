# TrueTab plan

PLAN.md is the source of truth for milestones and decisions. Tick a milestone only after Nick confirms its check passed.

## Goal

Help people in Austin find the best meal for their money at any budget, from a $12 lunch to a $150 dinner, for one person or a whole family. Every price is all-in and every guess is labeled.

## Milestones

- [ ] **M1 Prototype with sample data.** Budget and family modes, all-in prices, portion sources, dish comparison, both themes.
  *Check:* open `index.html`; set 2 adults, 2 kids, $0–40, any way to order; spots that fit show a green tag, and each card says where its portions came from. `npm test` passes.
- [ ] **M1b Filters, deals and dine-in.** Cuisine checkboxes (remembered), diet tags (as menus state them, never an allergy promise), budget range, day and time picker, time-aware deals (set price, percent off, dollars off, kids eat free), dine-in as a way to order, weekly source checklist (`check.html`).
  *Check:* set Tuesday noon, pickup, 1 adult: Sol y Masa shows "Taco Tuesday" and how much it saves. Set Monday 6 pm, dine-in, 2 adults + 2 kids: Smash Alley shows kids eat free. Untick every cuisine but Thai and Indian: only those two remain.
- [ ] **M2 First real data: 78745.** Started 2026-11-22 with 6 restaurants (El Chilito, Evangeline Cafe, Moreno Burger Co., Somos, Me Con Bistro, Super Bowl) from their own websites and Toast pages; on 2026-11-23 Super Bowl was replaced by Bee Dumpling (its own site); the page now loads `data/austin-78745.js` (sample data stays for tests). Still to do: Nick verifies each one (`verifiedBy`), adds Instagram/Facebook links and hours where missing, and grows the list to 10–20. Candidates whose online menus had no prices or wouldn't load: Nasha South, Polvos truck, Tacos Las Amazonas #3, Umi Sushi, Pizzeria Grata.
  *Check:* every restaurant has `verifiedBy: "nick"`, and every deal has a source and a verified date.
- [ ] **M2b Delivery app estimator.** Built: DoorDash and Uber Eats menu prices are estimated as the restaurant's price plus 20% (`defaultMarkupPct`; no longer adjustable on the page), then typical fees are added; shown only for apps a restaurant is known to be on, and always labeled "est.". Next: check one real checkout per app from a fixed 78745 address and tune the fee defaults; add `onApps` as you confirm which apps each spot uses.
  *Check:* for 3 restaurants, the estimate lands within about 10% of a real app checkout.
- [ ] **M2d Buy-one-get-one.** Built: `bogo` deal type (2-for-1 version of matching items), BOGO badge, summary count, "Deals only" filter, `expires` dates. Two-for-one items on a restaurant's own menu (`promo: "bogo"`) are flagged; no spot in the current data has one, so the tests use a made-up "(sample)" spot. Next: Nick logs app BOGOs seen in DoorDash and Uber Eats for 78745 spots, with end dates. Leads seen on Uber Eats listings near William Cannon: Super Bowl Restaurant, 3 Flames Halal (500 W William Cannon), Wild Peckers South Austin.
  *Check:* tick "Deals only" and only spots with a deal or BOGO remain; an app BOGO past its end date no longer shows.
- [ ] **M2e Deal check ("is it actually a value?").** Built: every deal gets a verdict, Real deal (saves 10%+ with no warning signs), Small saving, or Not worth it, with reasons. It compares the deal with (1) the same order without it, (2) the cheapest way to order with no deal on any channel (so an app BOGO that loses to plain pickup is called out), (3) the typical price per portion for that dish type nearby, and (4) the item's price history, flagging a price rise in the 60 days before the deal. `check.html` now lists "Price changes in the last 30 days" from each item's `history` (`priceChanges` in the engine). Next: build price history by moving old prices into `history` on each weekly check.
  *Check:* an app BOGO that costs more than plain pickup shows "Not worth it" with the pickup price.
- [ ] **M2c Reviews side by side.** Built: each card links to the restaurant's Google, Yelp and Tripadvisor pages. Next: show live star ratings and review counts side by side through a small Cloudflare Worker (like Pharos's) calling each site's official API with its required branding and caching limits. Google Places API (usage-based billing), Yelp Fusion API (paid plans only), Tripadvisor Content API (apply for access). Ratings are never copied into the data files.
  *Check:* a card shows three ratings, each with its site's logo and a link, and the data files still contain no ratings.
- [ ] **R1 Restaurant report builder.** Built: `report.html` + `src/report.js` (linked from `check.html`, not the home page): ranks for 1 adult and a family of 4 at Wednesday lunch (12 pm) and dinner (6 pm), pickup and cheapest way; app vs. pickup gap (estimated); promo check with verdicts and reasons, each deal tested on its own items at a time it runs; portion clarity vs. nearby spots; up to 3 suggestions (family pack, lunch plate, kids' meal, pickup version of a losing app promo), each tested by re-running the ranking on a copy of the data. Competitors are anonymized by default. Prints to 2 pages. Brief for Claude Code: `docs/briefs/R1-report-builder.md`. Built before the pitch in `PITCH.md` goes out. Next: Nick reviews the wording and the lunch-plate suggestion price (it matches the cheapest price per portion nearby, which today is a two-for-one plate).
  *Check:* print Bee Dumpling's report to PDF: about 2 pages, ranks shown for 1 adult and a family of 4, the promo check says no specials are on file, competitors anonymized, "How this was measured" at the end with both check dates. `npm test` passes (it covers a two-for-one graded "Real deal").
- [ ] **M3 Go live.** Publish on GitHub Pages; add the portfolio card; share the first "biggest gap" post. Done: live on GitHub Pages (https://scenebiscuit.com/truetab/). Built: `post.html` drafts the weekly "78745 Real Deals" post (cheapest spots, biggest app markup, every deal's verdict) with a "check before posting" list; Nick edits and posts it himself. Still to do: the portfolio card, and posting.
  *Check:* the live link works on a phone.
- [ ] **M4 AI-assisted entry.** Paste a menu, caption or screenshot you found; AI turns it into prices or a deal in the data format; Nick approves each one before it's saved, with the source link and date.
  *Check:* 20 pasted examples, with how many came out right before any correction, reported honestly.
- [ ] **M5 Fuzzy dish matching.** AI suggests the `dishType` for new items; Nick approves. Accuracy on items it hasn't seen.
- [ ] **M6 Restaurant submissions.** "Submit your special" form for restaurants; each one is verified, then shown with a "Verified" badge.
- [ ] **M7 Portion reports and change alerts.** "How many people did this feed?" after a visit; flags when a price rises, a portion shrinks or a special disappears between checks. Built so far: price rises and drops between checks, on `check.html`. Still to do: portion and special changes (need a history format for them), and visitor portion reports (need somewhere to store submissions).
- [ ] **D1 Drinks (later).** Happy hours as time-based deals (Do512 and happy-hour sites as leads, verified with the restaurant); an optional "add a drink each" to the all-in total; the deal check for drink specials; drinks compared per drink or per ounce, not food portions. Framing stays on value ("best happy-hour deals with food"), never on volume. Never counted for kids. Dine-in and pickup first; look up Texas rules on alcohol delivery before adding delivery prices for drinks.
  *Check:* a weekday 4–6 pm search shows happy-hour specials with verdicts, and "add a drink each" changes the all-in total.
- [ ] **Later ideas:** pickup-savings callouts with distance, lunch vs. dinner price flags, delivery subscription calculator, leftovers counted as value, drinks and add-ons toggle, catering trays for 10+.

## How data is gathered (sourcing rules)

- **Restaurant's own website and menu:** main proof for every price and deal.
- **Restaurant Instagram and Facebook:** read by hand on a weekly check. Specials often show up here first. With M4, paste what you see and AI fills in the fields for your approval.
- **Do512, happy-hour sites, roundup lists:** a lead list to check against the restaurant, plus a link when a spot isn't verified yet. Ask DoStuff Media (Do512's Austin-based parent company) about a partner data feed.
- **Restaurants:** later, they submit their own specials (M6).
- **Never:** scripts that copy from DoorDash, Uber Eats, Grubhub, Yelp, Instagram, Facebook, Do512 or other listing sites. Automated feeds only with written permission.
- Each restaurant keeps a `sources` list and a `lastChecked` date. `check.html` shows who is due, and every Monday a GitHub issue (from `scripts/weekly-check.js`) lists up to 10 restaurants to check plus deals to re-verify. Menus are due every 60 days, or sooner when U.S. Bureau of Labor Statistics price data (fetched by `scripts/fetch-market.js`, government data, free to use automatically) shows restaurant prices in the South up 2%+ or an ingredient the menu uses up 8%+ since its last check.

## Decisions

- 2026-11-22: Web page first; browser extension and app later, if ever.
- 2026-11-22: No scraping (see sourcing rules). Real prices are collected by hand.
- 2026-11-22: Portions counted in twelfths so 3 tacos per adult works. Breakfast tacos and tacos default to 1/3 portion each. Kids default to 0.6 of an adult. Both are Nick's to confirm.
- 2026-11-22: Tax applies to food only; tip is a share of food. Pickup has no tip; delivery and dine-in use the tip setting. Revisit with real checkouts.
- 2026-11-22: Deals apply only when a day and time is set ("Now" by default on the page). The app always compares the deal price with the normal price and uses the cheaper one.
- 2026-11-22: Kids eat free covers up to `perAdult` kids per paying adult; the kids' portions aren't bought.
- 2026-11-22: Diet tags are what the menu says. The page tells people to confirm allergies with the restaurant.
- 2026-11-22: Budget minimum hides spots under it and says how many were hidden.
- 2026-11-22: Working name "Menu Math".
- 2026-11-23: Renamed to **TrueTab** ("the true total of your tab"), repo `truetab`. "Tab" also points toward bars, which fits Austin and leaves room for drinks (D1). Before launch: check the domain on Cloudflare and run a USPTO trademark search.
- 2026-11-22: Real data starts in 78745. Prices come only from restaurants' own websites and Toast ordering pages. Menus that don't list prices are left out, never guessed.
- 2026-11-22: Family meals that say "feeds 4–6" count as 4 (the low end), with the menu's wording kept in a note.
- 2026-11-22: Kids-only items (kids' meals) are used one per kid when that's cheaper, and never count toward feeding adults.
- 2026-11-22: Restaurant-specific charges the menu states are included: Moreno's 3% card surcharge, Evangeline's 40¢ per-item to-go container fee.
- 2026-11-22: App markup default 20%, based on a 2023 industry study (average app premium about 20%; quick-service 26%, casual dining 11%). Adjustable on the page (until 2026-11-25; now fixed, see below).
- 2026-11-22: Ratings aren't stored (Google, Yelp and Tripadvisor terms). "Best value" sorting is hidden until live ratings exist; results sort by price.
- 2026-11-22: Deal verdict thresholds: "Real deal" needs 10%+ savings with no warning signs; a price rise in the 60 days before the deal, or a deal price above the typical price for similar dishes, drops it to "Small saving"; anything that loses to ordering without a deal is "Not worth it". "Typical" needs at least two items of that dish type.
- 2026-11-22: Restaurants are hidden when closed at the chosen time; ones without hours on file are shown.
- 2026-11-24: Feed my group is step by step (1 Budget & group, 2 When & how, 3 Diet, 4 Costs) with Show results on every step (Nick's request). "Spend at least" moved to step 4: it's for nicer meals and works against the value pitch for most searches. Cuisine is now a filter on the results that starts at All and is no longer remembered between visits (replaces M1b's remembered cuisine checkboxes).
- 2026-11-24: Re-checks follow the market (Nick's idea): 60-day baseline per menu; brought forward after 7+ days when, since the last check, restaurant prices in the South (BLS CUUR0300SEFV) rise 2%+ or an ingredient the menu uses rises 8%+ (BLS average prices: ground beef, boneless chicken breast, pork chops, eggs, white rice, white bread). Price drops don't trigger. No market data that week: 30 days. Data is monthly and about 2 weeks behind, so it catches trends, not one restaurant's sudden change. Thresholds are Nick's to tune.
- 2026-11-24: Automatic price checks: Nick chose a weekly reminder over automated price copying (copying would break rule 5 and the ordering platforms' terms). A GitHub Action opens a Monday issue with up to 10 restaurants, oldest checks first. To scale past a few dozen restaurants: check menus on a rotation rather than all weekly, AI-assisted entry (M4), and restaurants submitting their own prices (M6).
- 2026-11-24: New look, the "guest check" (green diner order pad), chosen by Nick so TrueTab no longer looks like his other sites. Replaces the Nick Lax 2026 Design System for TrueTab only. Fonts: Archivo, Public Sans, Courier Prime.
- 2026-11-24: Home page redesigned around tabs so less shows at once (Nick's request): page tabs (Feed my group, Compare a dish, How it works), search settings in 4 tabs with an always-visible settings line, and each result card's details in tabs. The hero's small label above the headline was removed.
- 2026-11-23: Replaced Super Bowl Restaurant with Bee Dumpling (1901 W William Cannon Dr #115) at Nick's choice. Song La (Thicket Food Park, 7800 S 1st St) is a candidate with full prices on its own Square ordering page; held for later.
- 2026-11-23: Bee Dumpling's 8-piece dumplings and pot stickers count as 1 portion, soup dumplings as 0.75 (estimates; the menu gives piece counts only). Nick to confirm.
- 2026-11-25: Tip is opt-in. Totals are before tip unless the visitor checks "Add a tip to the totals" (15/18/20%); each result's Price breakdown shows what a usual tip would add. The app markup control is removed from the search: it confused visitors. Apps stay at 20% above the restaurant's prices, explained on each estimated result and in How it works.

## Making money

**The rule that protects everything:** rankings and deal verdicts come only from the published math (all-in price per person, portions, deals, ratings once live). Money never changes a ranking, a verdict or a price. Anything paid is labeled. A paying restaurant's deal can still be called "Not worth it."

**Why this isn't bias:** the app openly favors the best value per person, by one written rule applied to every restaurant the same way. That's the product, like a review site favoring good food. Bias would be pay-to-rank, which the rule above forbids.

**Who buys:** mostly restaurants that rank *low*. The report shows them exactly why and how to move up (a family pack, a pickup deal, fixing a promo that loses to their own pickup price). Restaurants that already rank well buy featured placement or referrals later.

| Order | Stream | What it is | Needs |
|---|---|---|---|
| 1 | Weekly content | "78745 Real Deals" post or newsletter: real deals and deal traps, from the verdicts | Nothing; free. Builds the audience |
| 2 | Restaurant reports | One-time report: menu value vs. 5 nearby spots, app vs. pickup pricing, promo check, 3 specific fixes. Sold on Upwork/Contra and by direct outreach (`PITCH.md`) | Verified data for the area |
| 3 | Re-check | Monthly re-check after changes: did the fixes move them up? | Report customers |
| 4 | Direct-ordering referrals | Monthly fee or per-referral fee for sending customers to the restaurant's own ordering page (tracked links) | Traffic |
| 5 | Featured verified deals | Labeled "Featured" spot for a verified special; same deal check applies | Traffic |
| 6 | Local price trends | "South Austin menu price index" and shrinkflation stories for local media; data for restaurant groups | Months of price history |

**Not doing:** DoorDash/Uber Eats affiliate money (the app regularly says their deals lose to pickup), paid consumer subscriptions (low willingness to pay), selling higher rankings.

**Prices:** not set. Suggested to test: an intro report price for the first 2–3 restaurants in exchange for a testimonial, then a standard price. Nick decides.
