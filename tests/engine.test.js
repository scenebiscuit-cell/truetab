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
