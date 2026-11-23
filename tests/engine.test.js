// Run with: npm test   (uses Node's built-in test runner, no installs)
const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("../src/engine.js");
const data = require("../data/sample-data.js");

const ch = (id) => data.channels.find((c) => c.id === id);
const rest = (id) => data.restaurants.find((r) => r.id === id);

test("pickup all-in is subtotal plus tax, no fees or tip", () => {
  const p = M.allInPrice(20, ch("pickup"), 0.0825);
  assert.equal(p.fees, 0);
  assert.equal(p.tip, 0);
  assert.equal(p.tax, 1.65);
  assert.equal(p.total, 21.65);
});

test("delivery all-in adds delivery fee, service fee, tax and tip", () => {
  // $20 on DoorDash sample fees: 2.99 delivery + max(15% = 3.00, min 3.00) service
  const p = M.allInPrice(20, ch("doordash"), 0.0825, 0.18);
  assert.equal(p.deliveryFee, 2.99);
  assert.equal(p.serviceFee, 3);
  assert.equal(p.smallOrderFee, 0);
  assert.equal(p.tip, 3.6);
  assert.equal(p.total, 31.24); // 20 + 2.99 + 3.00 + 1.65 tax + 3.60 tip
});

test("service fee minimum and small-order fee apply to small orders", () => {
  const p = M.allInPrice(8, ch("doordash"), 0, 0);
  assert.equal(p.serviceFee, 3); // 15% of 8 is 1.20, minimum is 3.00
  assert.equal(p.smallOrderFee, 2.5); // under the $12 threshold
});

test("restaurant overrides: unavailable channel returns null, opt-in channel needs available:true", () => {
  assert.equal(M.channelFor(rest("sol-y-masa"), ch("direct")), null);
  const tn = M.channelFor(rest("tortilla-norte"), ch("direct"));
  assert.equal(tn.deliveryFee, 3.49);
  assert.equal(M.channelFor(rest("smash-alley"), ch("direct")), null);
});

test("portion trust order: restaurant > reports > default estimate", () => {
  const r = rest("tortilla-norte");
  assert.equal(M.servesFor(r.items.find((i) => i.id === "tn-fam"), data.dishTypes).source, "restaurant");
  assert.equal(M.servesFor(r.items.find((i) => i.id === "tn-plate"), data.dishTypes).source, "reports");
  const est = M.servesFor(r.items.find((i) => i.id === "tn-t"), data.dishTypes);
  assert.equal(est.source, "estimate");
  assert.match(est.label, /^Estimated/);
});

test("add-ons like queso don't count as feeding anyone", () => {
  const q = M.servesFor(rest("sol-y-masa").items.find((i) => i.id === "sym-queso"), data.dishTypes);
  assert.equal(q.serves, 0);
  assert.equal(q.source, "none");
});

test("party portions: 2 adults + 2 kids = 3.2 with default appetite", () => {
  assert.equal(M.partyPortions(2, 2, data.appetite), 3.2);
});

test("cheapest order for one adult at pickup picks the cheapest way to one portion", () => {
  // Sol y Masa pickup: 3 breakfast tacos (3 x 3.75 = 11.25) beat a 13.50 plate
  const o = M.cheapestOrder(rest("sol-y-masa"), ch("pickup"), 1, data.dishTypes);
  assert.equal(o.subtotal, 11.25);
  assert.deepEqual(o.lines.map((l) => [l.itemId, l.qty]), [["sym-bt", 3]]);
});

test("family packs win only when they are actually cheaper", () => {
  // Sol y Masa pickup for 4: family pack 42.00 beats 12 breakfast tacos (45.00)
  const f = M.cheapestOrder(rest("sol-y-masa"), ch("pickup"), 4, data.dishTypes);
  assert.deepEqual(f.lines.map((l) => [l.itemId, l.qty]), [["sym-fam", 1]]);
  // Smash Alley pickup: family meal 44.00 for 4 vs 4 burgers 42.00 -> burgers win
  const o = M.cheapestOrder(rest("smash-alley"), ch("pickup"), 4, data.dishTypes);
  assert.equal(o.subtotal, 42);
  // On DoorDash: family meal 56.00 vs 4 x 13.25 = 53.00 -> burgers still win
  const d = M.cheapestOrder(rest("smash-alley"), ch("doordash"), 4, data.dishTypes);
  assert.equal(d.subtotal, 53);
});

test("cheapest order never leaves the group short", () => {
  for (const r of data.restaurants) {
    for (const portions of [1, 2.2, 3.2, 5, 7.4]) {
      const o = M.cheapestOrder(r, ch("pickup"), portions, data.dishTypes);
      if (o) assert.ok(o.portions >= portions - 1e-9, `${r.id} short at ${portions}`);
    }
  }
});

test("items missing on a channel are skipped (no Uber Eats family pack at Sol y Masa)", () => {
  const o = M.cheapestOrder(rest("sol-y-masa"), ch("ubereats"), 4, data.dishTypes);
  assert.ok(o.lines.every((l) => l.itemId !== "sym-fam"));
});

test("budget status: fits, just over (within $2), over", () => {
  assert.equal(M.budgetStatus(19.99, 20), "fits");
  assert.equal(M.budgetStatus(21.5, 20), "just-over");
  assert.equal(M.budgetStatus(22.5, 20), "over");
  assert.equal(M.budgetStatus(99, 0), "fits"); // no budget set
});

test("search ranks fitting results first and picks each restaurant's cheapest channel", () => {
  const out = M.search(data, { adults: 1, kids: 0, budget: 15, mode: "any", group: "all", sort: "value" });
  assert.ok(out.results.length > 0);
  const statuses = out.results.map((r) => r.status);
  const rank = { fits: 0, "just-over": 1, over: 2 };
  for (let i = 1; i < statuses.length; i++) assert.ok(rank[statuses[i - 1]] <= rank[statuses[i]]);
  for (const r of out.results) {
    const min = Math.min(...r.options.map((o) => o.price.total));
    assert.equal(r.best.price.total, min);
  }
});

test("pickup-only mode never returns delivery options", () => {
  const out = M.search(data, { adults: 2, kids: 2, budget: 60, mode: "pickup", group: "all" });
  for (const r of out.results) for (const o of r.options) assert.equal(o.kind, "pickup");
});

test("per-person cost splits the all-in total across everyone", () => {
  const out = M.search(data, { adults: 2, kids: 2, budget: 0, mode: "delivery", group: "burgers" });
  for (const r of out.results) assert.equal(r.best.perPerson, M.cents(r.best.price.total / 4));
});

test("compare a dish: badges against the median price per portion", () => {
  const out = M.compareDish(data, "breakfast-taco", "direct");
  assert.equal(out.rows.length, 2);
  // per portion at 0.34 each: 3.25 -> 9.56, 3.75 -> 11.03; median 10.29 -> cheaper / pricier
  assert.deepEqual(out.rows.map((r) => r.badge), ["cheaper", "pricier"]);
});

test("value score rewards rating and punishes price", () => {
  assert.ok(M.valueScore({ stars: 4.6 }, 10) > M.valueScore({ stars: 4.6 }, 20));
  assert.ok(M.valueScore({ stars: 4.6 }, 10) > M.valueScore({ stars: 4.0 }, 10));
  assert.equal(M.valueScore({ stars: 3 }, 10), 0);
});

test("portion labels read as people would say them", () => {
  assert.equal(M.fmtServes(0.34), "1/3");
  assert.equal(M.fmtServes(1.25), "1.25");
  assert.equal(M.fmtServes(4), "4");
  assert.equal(M.fmtServes(2.67), "2 2/3");
});

/* ---------- Deals, filters, dine-in ---------- */

const TUE_NOON = { day: 2, minutes: 12 * 60 };
const MON_6PM = { day: 1, minutes: 18 * 60 };
const SAT_6PM = { day: 6, minutes: 18 * 60 };

test("deals only run on their days, hours and channels", () => {
  assert.equal(M.activeDeals(data, "sol-y-masa", "pickup", TUE_NOON).length, 1);
  assert.equal(M.activeDeals(data, "sol-y-masa", "doordash", TUE_NOON).length, 0); // not on delivery
  assert.equal(M.activeDeals(data, "sol-y-masa", "pickup", SAT_6PM).length, 0); // not Saturday
  assert.equal(M.activeDeals(data, "post-oak-smoke", "pickup", { day: 3, minutes: 14 * 60 }).length, 0); // ends at 2 pm
  assert.equal(M.activeDeals(data, "post-oak-smoke", "pickup", { day: 3, minutes: 13 * 60 + 59 }).length, 1);
});

test("item deals lower the price and remember the original", () => {
  const deals = M.activeDeals(data, "sol-y-masa", "pickup", TUE_NOON);
  const items = M.itemsWithDeals(rest("sol-y-masa").items, deals, "direct");
  const taco = items.find((i) => i.id === "sym-at");
  assert.equal(taco.prices.direct, 2);
  assert.equal(taco.deal.was, 3.95);
  assert.equal(items.find((i) => i.id === "sym-bt").deal, undefined); // breakfast tacos not included
});

test("Taco Tuesday makes $2 tacos the cheapest pickup order and reports the savings", () => {
  const out = M.search(data, { adults: 1, kids: 0, mode: "pickup", when: TUE_NOON });
  const sym = out.results.find((r) => r.restaurant.id === "sol-y-masa");
  assert.deepEqual(sym.best.order.lines.map((l) => [l.itemId, l.qty]), [["sym-at", 3]]);
  assert.equal(sym.best.deals[0].id, "sym-taco-tue");
  // without the deal: 3 breakfast tacos 11.25 + tax; with it: 6.00 + tax
  assert.equal(sym.best.savings, M.cents(11.25 * 1.0825) - M.cents(6 * 1.0825));
});

test("no deals without a time, so the base price is used", () => {
  const out = M.search(data, { adults: 1, kids: 0, mode: "pickup" });
  const sym = out.results.find((r) => r.restaurant.id === "sol-y-masa");
  assert.equal(sym.best.deals.length, 0);
  assert.equal(sym.best.savings, 0);
});

test("kids eat free: dine-in only pays for the adults' portions", () => {
  const out = M.search(data, { adults: 2, kids: 2, mode: "dine-in", tipPct: 0.18, when: MON_6PM });
  const sa = out.results.find((r) => r.restaurant.id === "smash-alley");
  assert.equal(sa.best.freeKids, 2);
  assert.equal(sa.best.order.subtotal, 21); // 2 burgers, kids free
  assert.ok(sa.best.savings > 0);
  // Saturday: no deal, so kids' portions are paid for
  const sat = M.search(data, { adults: 2, kids: 2, mode: "dine-in", tipPct: 0.18, when: SAT_6PM });
  assert.equal(sat.results.find((r) => r.restaurant.id === "smash-alley").best.freeKids, 0);
});

test("kids eat free needs at least one adult", () => {
  const out = M.search(data, { adults: 0, kids: 2, mode: "dine-in", when: MON_6PM });
  const sa = out.results.find((r) => r.restaurant.id === "smash-alley");
  assert.equal(sa.best.freeKids, 0);
});

test("dine-in has no fees but does include tip", () => {
  const out = M.search(data, { adults: 1, kids: 0, mode: "dine-in", tipPct: 0.2 });
  for (const r of out.results) {
    assert.equal(r.best.kind, "dine-in");
    assert.equal(r.best.price.fees, 0);
    assert.equal(r.best.price.tip, M.cents(r.best.price.subtotal * 0.2));
  }
});

test("takeout mode means pickup or delivery, never dine-in", () => {
  const out = M.search(data, { adults: 2, kids: 0, mode: "takeout" });
  for (const r of out.results) for (const o of r.options) assert.notEqual(o.kind, "dine-in");
});

test("cuisine filter keeps only chosen cuisines; an empty list shows nothing", () => {
  const out = M.search(data, { adults: 1, kids: 0, cuisines: ["Thai", "Indian"] });
  assert.deepEqual(out.results.map((r) => r.restaurant.id).sort(), ["lemongrass-lane", "saffron-tiffin"]);
  assert.equal(M.search(data, { adults: 1, kids: 0, cuisines: [] }).results.length, 0);
});

test("diet filter builds the meal only from items tagged for that diet", () => {
  const out = M.search(data, { adults: 2, kids: 0, diet: ["vegan"] });
  assert.ok(out.results.length >= 2);
  for (const r of out.results) {
    for (const l of r.best.order.lines) {
      const item = r.restaurant.items.find((i) => i.id === l.itemId);
      assert.ok(item.tags.includes("vegan"), `${l.itemId} is not tagged vegan`);
    }
  }
  // Smash Alley has nothing tagged vegan, so it drops out
  assert.ok(!out.results.some((r) => r.restaurant.id === "smash-alley"));
});

test("budget minimum hides spots that come in under it and counts them", () => {
  const all = M.search(data, { adults: 2, kids: 0 });
  const ranged = M.search(data, { adults: 2, kids: 0, budgetMin: 40 });
  assert.ok(ranged.hiddenBelow > 0);
  assert.equal(ranged.results.length + ranged.hiddenBelow, all.results.length);
  for (const r of ranged.results) assert.ok(r.best.price.total >= 40);
});

/* ---------- Buy one, get one ---------- */

const NOV = { day: 3, minutes: 12 * 60, date: "2026-11-25" };

test("app BOGO adds a 2-for-1 item that feeds two for the price of one", () => {
  const deals = M.activeDeals(data, "bun-n-done", "ubereats", NOV);
  const items = M.itemsWithDeals(rest("bun-n-done").items, deals, "ubereats");
  const two = items.find((i) => i.id === "bd-b--bogo");
  assert.equal(two.prices.ubereats, 9.95);
  assert.equal(two.deal.was, 19.9);
  assert.equal(M.servesFor(two, data.dishTypes).serves, 1.5); // 2 x 0.75 from reports
});

test("BOGO only applies on its app, and stops after it expires", () => {
  assert.equal(M.activeDeals(data, "bun-n-done", "doordash", NOV).length, 0);
  assert.equal(M.activeDeals(data, "bun-n-done", "ubereats", { day: 3, minutes: 720, date: "2027-01-01" }).length, 0);
});

test("search uses the BOGO on Uber Eats and flags it", () => {
  const out = M.search(data, { adults: 2, kids: 0, mode: "delivery", tipPct: 0.18, when: NOV });
  const bd = out.results.find((r) => r.restaurant.id === "bun-n-done");
  const ue = bd.options.find((o) => o.channelId === "ubereats");
  assert.ok(ue.bogo);
  assert.ok(ue.savings > 0);
});

test("deals-only filter keeps only spots whose best option has a deal or BOGO", () => {
  const out = M.search(data, { adults: 2, kids: 0, mode: "delivery", tipPct: 0.18, when: NOV, dealsOnly: true });
  assert.ok(out.results.length > 0);
  for (const r of out.results) assert.ok(r.best.deals.length || r.best.bogo);
});

/* ---------- Is the deal actually a value? ---------- */

test("an app BOGO that costs more than plain pickup is 'not worth it'", () => {
  const out = M.search(data, { adults: 1, kids: 0, mode: "any", tipPct: 0.18, when: NOV });
  const bd = out.results.find((r) => r.restaurant.id === "bun-n-done");
  const ue = bd.options.find((o) => o.channelId === "ubereats");
  assert.ok(ue.bogo);
  assert.equal(ue.check.verdict, "not-worth-it");
  assert.ok(ue.check.vsNoDeal < 0);
  assert.equal(ue.check.noDealLabel, "Pickup");
});

test("a deal that saves 10%+ with no warning signs is a 'real deal'", () => {
  const out = M.search(data, { adults: 1, kids: 0, mode: "pickup", when: TUE_NOON });
  const sym = out.results.find((r) => r.restaurant.id === "sol-y-masa");
  assert.equal(sym.best.check.verdict, "real");
  assert.ok(sym.best.check.pct >= 10);
});

test("a price rise shortly before the deal is caught and downgrades the verdict", () => {
  const out = M.search(data, { adults: 2, kids: 0, mode: "delivery", tipPct: 0.18, when: NOV });
  const ue = out.results.find((r) => r.restaurant.id === "bun-n-done").options.find((o) => o.channelId === "ubereats");
  assert.equal(ue.check.raised.length, 1);
  assert.deepEqual([ue.check.raised[0].from, ue.check.raised[0].to], [7, 8]);
  assert.notEqual(ue.check.verdict, "real");
});

test("no check on options without deals", () => {
  const out = M.search(data, { adults: 1, kids: 0, mode: "pickup" });
  for (const r of out.results) assert.equal(r.best.check, null);
});

test("typical price per portion needs at least two items of that dish type", () => {
  const med = M.perPortionMedians(data);
  assert.ok(med["burger"]);
  assert.equal(med["burger-family"], undefined); // only one in the sample
});
