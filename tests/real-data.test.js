// Checks on the real 78745 data and the features it needs. Run with: npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("../src/engine.js");
const real = require("../data/austin-78745.js");

const r = (id) => real.restaurants.find((x) => x.id === id);
const ch = (id) => real.channels.find((c) => c.id === id);

test("every restaurant is in 78745 and has a source link and a checked date", () => {
  for (const x of real.restaurants) {
    assert.match(x.address, /78745$/, x.id);
    const links = Object.values(x.sources).filter(Boolean);
    assert.ok(links.length >= 1, `${x.id} has no source link`);
    assert.match(x.lastChecked, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(x.rating, null, "ratings are not stored");
  }
});

test("no app prices are stored; every item has a restaurant price", () => {
  for (const x of real.restaurants) {
    for (const i of x.items) {
      assert.equal(typeof i.prices.direct, "number", `${i.id} missing direct price`);
      assert.deepEqual(Object.keys(i.prices), ["direct"], `${i.id} has app prices`);
    }
  }
});

test("app prices are estimated from the restaurant price with the markup", () => {
  const items = M.itemsForChannel(r("el-chilito").items, ch("ubereats"), 0.2);
  const taco = items.find((i) => i.id === "ec-t-pastor");
  assert.equal(taco.prices.ubereats, M.cents(3.8 * 1.2));
  assert.equal(taco.estimatedPrice, true);
});

test("apps only show for restaurants known to be on them", () => {
  assert.ok(M.channelFor(r("el-chilito"), ch("ubereats")));
  assert.equal(M.channelFor(r("el-chilito"), ch("doordash")), null);
  assert.equal(M.channelFor(r("moreno-burger"), ch("ubereats")), null);
});

test("delivery results are flagged as estimated and change with the markup", () => {
  const q = { adults: 1, kids: 0, mode: "delivery", tipPct: 0.18 };
  const lo = M.search(real, Object.assign({ markupPct: 0 }, q)).results.find((x) => x.restaurant.id === "me-con-bistro");
  const hi = M.search(real, Object.assign({ markupPct: 0.3 }, q)).results.find((x) => x.restaurant.id === "me-con-bistro");
  assert.equal(hi.best.estimated, true);
  assert.ok(hi.best.price.total > lo.best.price.total);
});

test("kids' meals: kids get a kids' meal when that's cheaper, and kids' items never feed adults", () => {
  const out = M.search(real, { adults: 2, kids: 2, mode: "pickup" });
  const ev = out.results.find((x) => x.restaurant.id === "evangeline-cafe");
  const kidLine = ev.best.order.lines.find((l) => l.itemId === "ev-kids");
  assert.ok(kidLine, "Evangeline should use $6.99 kids' meals");
  assert.equal(kidLine.qty, 2);
  const adultsOnly = M.search(real, { adults: 3, kids: 0, mode: "pickup" });
  for (const x of adultsOnly.results) {
    for (const l of x.best.order.lines) {
      const item = x.restaurant.items.find((i) => i.id === l.itemId);
      assert.ok(!item.kidsOnly, `${l.itemId} is kids-only`);
    }
  }
});

test("Moreno adds its 3% card surcharge; Evangeline adds 40 cents per to-go item", () => {
  const out = M.search(real, { adults: 1, kids: 0, mode: "pickup" });
  const mb = out.results.find((x) => x.restaurant.id === "moreno-burger");
  assert.equal(mb.best.price.cardSurcharge, M.cents(mb.best.price.subtotal * 0.03));
  const ev = out.results.find((x) => x.restaurant.id === "evangeline-cafe");
  const items = ev.best.order.lines.reduce((n, l) => n + l.qty, 0);
  assert.equal(ev.best.price.toGoFee, M.cents(0.4 * items));
  const dine = M.search(real, { adults: 1, kids: 0, mode: "dine-in" }).results.find((x) => x.restaurant.id === "evangeline-cafe");
  assert.equal(dine.best.price.toGoFee, 0);
});

test("closed restaurants are hidden and counted", () => {
  const monday = { day: 1, minutes: 12 * 60 };
  const out = M.search(real, { adults: 1, kids: 0, when: monday });
  assert.ok(!out.results.some((x) => x.restaurant.id === "moreno-burger")); // closed Mondays
  assert.ok(!out.results.some((x) => x.restaurant.id === "somos")); // closed Mon/Tue
  assert.equal(out.closedNow, 2);
});

test("Evangeline lunch special lowers jambalaya to $10.99 weekdays 11-3, not Sundays", () => {
  const sat = { day: 6, minutes: 12 * 60 };
  const items = M.itemsWithDeals(r("evangeline-cafe").items, M.activeDeals(real, "evangeline-cafe", "pickup", sat), "direct");
  assert.equal(items.find((i) => i.id === "ev-jamb").prices.direct, 10.99);
  assert.equal(M.activeDeals(real, "evangeline-cafe", "pickup", { day: 0, minutes: 12 * 60 }).length, 0);
});

test("El Chilito family meal counts as feeding 4 (menu says 4-6)", () => {
  const s = M.servesFor(r("el-chilito").items.find((i) => i.id === "ec-fam-brentwood"), real.dishTypes);
  assert.equal(s.serves, 4);
  assert.equal(s.source, "restaurant");
});

test("with no ratings, results sort by price", () => {
  const out = M.search(real, { adults: 2, kids: 0, sort: "value" });
  for (let i = 1; i < out.results.length; i++) {
    if (out.results[i - 1].status === out.results[i].status) {
      assert.ok(out.results[i - 1].best.price.total <= out.results[i].best.price.total);
    }
  }
});

// No real 78745 spot has its own two-for-one item right now, so these tests add a made-up "(sample)" spot to a copy of the data.
function withTwinPlate() {
  const data = JSON.parse(JSON.stringify(real));
  data.restaurants.push({
    id: "twin-plate", name: "Twin Plate (sample)", neighborhood: "Sample", address: "Sample address, Austin, TX 78745",
    group: "plates", cuisines: ["Chinese"], onApps: [], hours: null, sources: {}, lastChecked: "2026-11-23", rating: null, channelFees: {},
    items: [
      { id: "tp-plate", name: "Chicken plate (sample)", dishType: "entree", prices: { direct: 9.49 } },
      { id: "tp-bogo", promo: "bogo", pairOf: "tp-plate", name: "Chicken plate, 2 orders, buy one get one (sample)", dishType: "meal-for-2",
        portion: { serves: 2, source: "restaurant" }, prices: { direct: 12.95 } }
    ]
  });
  return data;
}

test("a restaurant's own two-for-one item is flagged as BOGO", () => {
  const out = M.search(withTwinPlate(), { adults: 2, kids: 2, mode: "pickup" });
  const tp = out.results.find((x) => x.restaurant.id === "twin-plate");
  assert.ok(tp.best.bogo);
});

test("a restaurant's own two-for-one is checked against buying two singles", () => {
  const out = M.search(withTwinPlate(), { adults: 2, kids: 2, mode: "pickup" });
  const tp = out.results.find((x) => x.restaurant.id === "twin-plate");
  const line = tp.best.order.lines.find((l) => l.itemId === "tp-bogo");
  assert.equal(line.promoWas, M.cents(9.49 * 2));
  assert.ok(tp.best.check.saving > 0);
  assert.equal(tp.best.check.verdict, "real");
});

test("Bee Dumpling: open daily, on DoorDash, every portion marked as an estimate", () => {
  const bd = r("bee-dumpling");
  assert.ok(M.isOpen(bd, { day: 1, minutes: M.toMinutes("12:00") }));
  assert.ok(!M.isOpen(bd, { day: 1, minutes: M.toMinutes("23:00") }));
  assert.ok(M.channelFor(bd, ch("doordash")));
  assert.equal(M.channelFor(bd, ch("ubereats")), null);
  for (const i of bd.items) assert.notEqual(M.servesFor(i, real.dishTypes).source, "restaurant", i.id);
});

test("no price history on the real data yet, so no price changes are listed", () => {
  assert.deepEqual(M.priceChanges(real, "2026-11-24", 30), []);
});
