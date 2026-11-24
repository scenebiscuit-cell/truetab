// Tests for the restaurant report (src/report.js) on the real 78745 data. Run with: npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../src/report.js");
const real = require("../data/austin-78745.js");

const DATE = "2026-11-23";
const ids = real.restaurants.map((x) => x.id);
const snapshot = () => JSON.parse(JSON.stringify(real));

test("ranks are 1-based, never exceed the count, and name the cheapest competitor", () => {
  for (const id of ids) {
    for (const s of Object.keys(R.SCENARIOS)) {
      const r = R.rankFor(real, id, s, { date: DATE });
      for (const t of ["lunch", "dinner"]) {
        const x = r[t];
        assert.ok(x.of >= 1, `${id} ${s} ${t}: nobody ranked`);
        if (!x.open) continue;
        assert.ok(Number.isInteger(x.rank) && x.rank >= 1 && x.rank <= x.of, `${id} ${s} ${t}: rank ${x.rank} of ${x.of}`);
        assert.ok(x.total > 0);
        assert.notEqual(x.cheapestOther.id, id);
        // Rank = 1 + how many competitors are cheaper.
        const cheaper = x.table.filter((y) => y.id !== id && y.total < x.total - 0.005).length;
        assert.equal(x.rank, cheaper + 1);
      }
    }
  }
});

test("Super Bowl ranks 2nd of 6 for 1 adult and a family of 4 at pickup", () => {
  const adult = R.rankFor(real, "super-bowl", "adult-pickup", { date: DATE });
  const family = R.rankFor(real, "super-bowl", "family-pickup", { date: DATE });
  for (const x of [adult.lunch, adult.dinner, family.lunch, family.dinner]) {
    assert.equal(x.rank, 2);
    assert.equal(x.of, 6);
    assert.equal(x.cheapestOther.id, "el-chilito");
  }
});

test("app gap is estimated, uses the markup, and only covers apps the spot is on", () => {
  const gaps = R.appGap(real, "super-bowl", { date: DATE });
  assert.equal(gaps.length, 2, "1 adult and family of 4 on Uber Eats");
  for (const g of gaps) {
    assert.equal(g.channelId, "ubereats");
    assert.equal(g.estimated, true);
    assert.equal(g.markupPct, 0.2);
    assert.ok(g.extra > 0, "the app costs more than pickup");
    assert.equal(Math.round((g.app - g.pickup) * 100), Math.round(g.extra * 100));
  }
  assert.deepEqual(R.appGap(real, "moreno-burger", { date: DATE }), [], "not on any app");
});

test("promo report grades Super Bowl's two-for-one plates as real deals, with reasons", () => {
  const promos = R.promoReport(real, "super-bowl", { date: DATE });
  const bogos = promos.filter((p) => p.kind === "menu-bogo");
  assert.equal(bogos.length, 3);
  for (const p of bogos) {
    assert.equal(p.verdict, "real", p.title);
    assert.ok(p.reasons.length >= 2);
    assert.match(p.reasons[0], /^Saves \$\d+\.\d\d/);
  }
});

test("promo report checks every deal at a time it is running", () => {
  for (const id of ids) {
    const deals = real.deals.filter((d) => d.restaurantId === id);
    const promos = R.promoReport(real, id, { date: DATE }).filter((p) => p.kind === "deal");
    assert.equal(promos.length, deals.length, id);
    for (const p of promos) {
      assert.ok(["real", "small", "not-worth-it"].includes(p.verdict), `${p.id} was graded`);
      const d = deals.find((x) => x.id === p.id);
      assert.ok(d.channels.map((c) => real.channels.find((x) => x.id === c).label).includes(p.channelLabel));
    }
  }
  const evangeline = R.promoReport(real, "evangeline-cafe", { date: DATE })[0];
  assert.match(evangeline.whenLabel, /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday) 11:00 am$/);
});

test("an expired deal is reported as ended, not graded", () => {
  const data = snapshot();
  data.deals.push({ id: "test-old", restaurantId: "super-bowl", title: "Old app BOGO (test)", type: "bogo",
    appliesTo: { itemIds: ["sb-sesame"] }, channels: ["ubereats"], expires: "2026-11-01", verified: "2026-10-25" });
  const p = R.promoReport(data, "super-bowl", { date: DATE }).find((x) => x.id === "test-old");
  assert.equal(p.verdict, null);
  assert.equal(p.expired, true);
});

test("portion report counts stated portions, family packs and kids' meals against nearby spots", () => {
  const sb = R.portionReport(real, "super-bowl");
  assert.equal(sb.familyPack, false);
  assert.equal(sb.kidsMeals, false);
  assert.ok(sb.stated >= 4 && sb.stated <= sb.mealItems);
  assert.equal(sb.nearby.count, 5);
  assert.equal(sb.nearby.familyPack, 1, "El Chilito");
  const ec = R.portionReport(real, "el-chilito");
  assert.equal(ec.familyPack, true);
  assert.equal(ec.kidsMeals, true);
});

test("a suggested fix always improves the rank it claims to, and the claim matches a re-run", () => {
  let seen = 0;
  for (const id of ids) {
    const fixes = R.suggestFixes(real, id, { date: DATE });
    assert.ok(fixes.length <= 3);
    for (const f of fixes) {
      seen++;
      assert.equal(f.suggestion, true);
      assert.ok(f.after.rank < f.before.rank, `${id} ${f.id}: ${f.before.rank} -> ${f.after.rank}`);
      assert.ok(f.after.rank >= 1 && f.after.rank <= f.after.of);
      const now = R.rankFor(real, id, f.scenario, { date: DATE })[f.time];
      assert.equal(f.before.rank, now.rank, "before matches the real ranking");
      assert.equal(f.before.total, now.total);
    }
  }
  assert.ok(seen > 0, "at least one restaurant gets a suggestion");
});

test("Moreno, last for 1 adult, is offered a lunch plate that moves it up", () => {
  const f = R.suggestFixes(real, "moreno-burger", { date: DATE }).find((x) => x.id === "lunch-plate");
  assert.ok(f);
  assert.equal(f.time, "lunch");
  assert.equal(f.before.rank, 6);
  assert.ok(f.after.rank < 6);
});

test("anonymize hides every competitor name and id; turning it off shows them", () => {
  for (const id of ids) {
    const text = JSON.stringify(R.buildReport(real, id, { date: DATE, anonymize: true }));
    for (const other of real.restaurants.filter((x) => x.id !== id)) {
      assert.ok(!text.includes(other.name), `${id} report shows ${other.name}`);
      assert.ok(!text.includes(`"${other.id}"`), `${id} report shows id ${other.id}`);
    }
    assert.match(text, /Nearby spot A/);
  }
  const open = JSON.stringify(R.buildReport(real, "super-bowl", { date: DATE, anonymize: false }));
  assert.ok(open.includes("El Chilito"));
  assert.ok(!open.includes("Nearby spot"));
});

test("report headline and sections come from the engine", () => {
  const rep = R.buildReport(real, "super-bowl", { date: DATE });
  assert.equal(rep.headline,
    "Super Bowl Restaurant is the 2nd-best value for a family of four out of 6 spots in 78745 (pickup, weekday dinner), and the 2nd-best value for one adult out of 6 (pickup, weekday lunch).");
  assert.deepEqual(rep.onApps, ["Uber Eats"]);
  assert.ok(rep.fixesTested.length >= 1);
  assert.equal(rep.method.collected, real.meta.collected);
  assert.equal(rep.method.checked.length, real.restaurants.length);
  assert.ok(!/rating|stars/i.test(JSON.stringify(rep)), "no ratings in the report");
});

test("nothing in report.js changes the data passed in", () => {
  const before = snapshot();
  for (const id of ids) {
    R.rankFor(real, id, "family-best", { date: DATE });
    R.appGap(real, id, { date: DATE });
    R.promoReport(real, id, { date: DATE });
    R.portionReport(real, id);
    R.suggestFixes(real, id, { date: DATE });
    R.buildReport(real, id, { date: DATE, anonymize: true });
  }
  assert.deepEqual(snapshot(), before);
});
