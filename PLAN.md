# Menu Math plan

PLAN.md is the source of truth for milestones and decisions. Tick a milestone only after Nick confirms its check passed.

## Milestones

- [ ] **M1 Prototype with sample data.** Budget and family modes, all-in prices, portion sources, dish comparison, both themes.
  *Check:* open `index.html`; set 2 adults, 2 kids, $40 budget; see 3 of 6 spots fit, each card showing where its portions came from. `npm test` shows 18 passing.
- [ ] **M2 First real data.** One Austin neighborhood, one food group, 8–10 restaurants, collected by hand per `docs/DATA.md`.
  *Check:* `meta.isSample` is false, the sample notice is gone, and at least one real "biggest gap" is worth posting.
- [ ] **M3 Go live.** Publish on GitHub Pages; add the portfolio card.
  *Check:* the live link works on a phone.
- [ ] **M4 Fuzzy dish matching.** AI suggests the `dishType` for new items; Nick approves each suggestion. Measure accuracy on items it hasn't seen, like Pharos.
  *Check:* an accuracy figure on held-out items, reported honestly.
- [ ] **M5 Portion reports.** "How many people did this feed?" after a visit, stored and shown as `source: "reports"`.
- [ ] **M6 Shrinkflation alerts.** Flag when an item's count or size drops at the same price between collections.

## Decisions

- 2026-11-22: Web page first; browser extension and app later, if ever.
- 2026-11-22: No scraping of delivery apps or Yelp. Real prices are collected by hand.
- 2026-11-22: Portions counted in twelfths so 3 tacos per adult works. Breakfast tacos and tacos default to 1/3 portion each (3 per adult). Kids default to 0.6 of an adult. Both are Nick's to confirm.
- 2026-11-22: Tax applies to food only; tip is a share of food. Revisit with real checkouts.
- 2026-11-22: Working name "Menu Math", repo `menu-math`. Not final.

## Money ideas (not built)

Restaurant price reports (fastest), content plus newsletter, sponsors, restaurant partnerships for direct ordering. Affiliate links only if disclosed and never allowed to change rankings.
