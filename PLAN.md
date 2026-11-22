# Menu Math plan

PLAN.md is the source of truth for milestones and decisions. Tick a milestone only after Nick confirms its check passed.

## Goal

Help people in Austin find the best meal for their money at any budget, from a $12 lunch to a $150 dinner, for one person or a whole family. Every price is all-in and every guess is labeled.

## Milestones

- [ ] **M1 Prototype with sample data.** Budget and family modes, all-in prices, portion sources, dish comparison, both themes.
  *Check:* open `index.html`; set 2 adults, 2 kids, $0–40, any way to order; spots that fit show a green tag, and each card says where its portions came from. `npm test` passes.
- [ ] **M1b Filters, deals and dine-in.** Cuisine checkboxes (remembered), diet tags (as menus state them, never an allergy promise), budget range, day and time picker, time-aware deals (set price, percent off, dollars off, kids eat free), dine-in as a way to order, weekly source checklist (`check.html`).
  *Check:* set Tuesday noon, pickup, 1 adult: Sol y Masa shows "Taco Tuesday" and how much it saves. Set Monday 6 pm, dine-in, 2 adults + 2 kids: Smash Alley shows kids eat free. Untick every cuisine but Thai and Indian: only those two remain.
- [ ] **M2 First real data.** One Austin neighborhood, 10–20 restaurants, collected by hand per `docs/DATA.md`, including each restaurant's sources and any deals.
  *Check:* `meta.isSample` is false, the sample notice is gone, every deal has a source and a verified date.
- [ ] **M3 Go live.** Publish on GitHub Pages; add the portfolio card; share the first "biggest gap" post.
  *Check:* the live link works on a phone.
- [ ] **M4 AI-assisted entry.** Paste a menu, caption or screenshot you found; AI turns it into prices or a deal in the data format; Nick approves each one before it's saved, with the source link and date.
  *Check:* 20 pasted examples, with how many came out right before any correction, reported honestly.
- [ ] **M5 Fuzzy dish matching.** AI suggests the `dishType` for new items; Nick approves. Accuracy on items it hasn't seen.
- [ ] **M6 Restaurant submissions.** "Submit your special" form for restaurants; each one is verified, then shown with a "Verified" badge.
- [ ] **M7 Portion reports and change alerts.** "How many people did this feed?" after a visit; flags when a price rises, a portion shrinks or a special disappears between checks.
- [ ] **Later ideas:** pickup-savings callouts with distance, lunch vs. dinner price flags, delivery subscription calculator, leftovers counted as value, drinks and add-ons toggle, catering trays for 10+.

## How data is gathered (sourcing rules)

- **Restaurant's own website and menu:** main proof for every price and deal.
- **Restaurant Instagram and Facebook:** read by hand on a weekly check. Specials often show up here first. With M4, paste what you see and AI fills in the fields for your approval.
- **Do512, happy-hour sites, roundup lists:** a lead list to check against the restaurant, plus a link when a spot isn't verified yet. Ask DoStuff Media (Do512's Austin-based parent company) about a partner data feed.
- **Restaurants:** later, they submit their own specials (M6).
- **Never:** scripts that copy from DoorDash, Uber Eats, Grubhub, Yelp, Instagram, Facebook, Do512 or other listing sites. Automated feeds only with written permission.
- Each restaurant keeps a `sources` list and a `lastChecked` date. `check.html` shows who is due.

## Decisions

- 2026-11-22: Web page first; browser extension and app later, if ever.
- 2026-11-22: No scraping (see sourcing rules). Real prices are collected by hand.
- 2026-11-22: Portions counted in twelfths so 3 tacos per adult works. Breakfast tacos and tacos default to 1/3 portion each. Kids default to 0.6 of an adult. Both are Nick's to confirm.
- 2026-11-22: Tax applies to food only; tip is a share of food. Pickup has no tip; delivery and dine-in use the tip setting. Revisit with real checkouts.
- 2026-11-22: Deals apply only when a day and time is set ("Now" by default on the page). The app always compares the deal price with the normal price and uses the cheaper one.
- 2026-11-22: Kids eat free covers up to `perAdult` kids per paying adult; the kids' portions aren't bought.
- 2026-11-22: Diet tags are what the menu says. The page tells people to confirm allergies with the restaurant.
- 2026-11-22: Budget minimum hides spots under it and says how many were hidden.
- 2026-11-22: Working name "Menu Math", repo `menu-math`. Not final.

## Money ideas (not built)

Restaurant price reports (fastest), content plus newsletter, sponsors, restaurant partnerships for direct ordering and featured specials. Affiliate links only if disclosed and never allowed to change rankings.
