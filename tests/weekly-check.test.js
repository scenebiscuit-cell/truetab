// Tests for the weekly price-check reminder (scripts/weekly-check.js) and the market-data fetcher
// (scripts/fetch-market.js). Market data here is made up, so each rule is tested exactly. Run with: npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const W = require("../scripts/weekly-check.js");
const F = require("../scripts/fetch-market.js");
const real = require("../data/austin-78745.js");

const copy = () => JSON.parse(JSON.stringify(real));
const r = (data, id) => data.restaurants.find((x) => x.id === id);

// Made-up monthly series: flat at 100 through Sep 2026, then each driver's October value.
function market(octValues) {
  const months = [];
  for (let m = 1; m <= 12; m++) months.push(`2025-${String(m).padStart(2, "0")}`);
  for (let m = 1; m <= 9; m++) months.push(`2026-${String(m).padStart(2, "0")}`);
  const series = {};
  for (const [driver, s] of Object.entries(F.SERIES)) {
    const points = months.map((month) => ({ month, value: 100 }));
    points.push({ month: "2026-10", value: octValues[driver] || 100 });
    series[driver] = { id: s.id, label: s.label, points };
  }
  return { fetched: "2026-11-30T14:00:00Z", source: "test data", series };
}
const calm = market({});

// All restaurants last checked on one date.
function checkedOn(date) {
  const data = copy();
  for (const x of data.restaurants) x.lastChecked = date;
  return data;
}

test("cost drivers are guessed from dish names, and the data can override them", () => {
  const d = (rid, iid) => W.costDrivers(r(real, rid).items.find((i) => i.id === iid), real.dishTypes);
  assert.deepEqual(d("moreno-burger", "mb-smash"), ["beef", "bread"]);
  assert.deepEqual(d("el-chilito", "ec-bt-migas"), ["eggs"]);
  assert.deepEqual(d("el-chilito", "ec-t-pastor"), ["pork"]);
  assert.deepEqual(d("bee-dumpling", "bd-fr-chicken"), ["chicken", "rice"]);
  assert.deepEqual(d("bee-dumpling", "bd-eggroll"), [], "egg rolls aren't an egg dish");
  assert.deepEqual(d("somos", "so-pastor"), [], "lamb: overridden in the data, no series for it");
  assert.deepEqual(W.restaurantDrivers(r(real, "moreno-burger"), real.dishTypes), ["beef", "bread"]);
});

test("changeSince compares the month of the check with the newest month, and waits for new data", () => {
  const s = market({ beef: 110 }).series.beef;
  const c = W.changeSince(s, "2026-08-20");
  assert.equal(c.from.month, "2026-08");
  assert.equal(c.to.month, "2026-10");
  assert.equal(Math.round(c.pct * 100), 10);
  assert.equal(W.changeSince(s, "2026-10-05"), null, "October is the newest month: nothing newer yet");
  assert.equal(W.changeSince(s, "2026-11-22"), null);
});

test("calm market: a menu is due every 60 days", () => {
  const before = W.weeklyChecklist(checkedOn("2026-10-02"), "2026-11-30", { market: calm });
  assert.equal(before.batch.length, 0, "59 days");
  const at = W.weeklyChecklist(checkedOn("2026-10-01"), "2026-11-30", { market: calm });
  assert.equal(at.batch.length, real.restaurants.length, "60 days");
  assert.ok(at.batch.every((x) => x.triggers.length === 0));
});

test("no market data: a menu is due every 30 days, and the issue says why", () => {
  const out = W.weeklyChecklist(checkedOn("2026-10-31"), "2026-11-30", { market: null });
  assert.equal(out.baseline, W.FALLBACK_DAYS);
  assert.equal(out.batch.length, real.restaurants.length);
  assert.match(out.body, /Market data couldn't be loaded this week/);
  assert.equal(W.weeklyChecklist(checkedOn("2026-11-01"), "2026-11-30", { market: null }).batch.length, 0);
});

test("restaurant prices in the South up 2% pulls every menu forward, once a week has passed", () => {
  const m = market({ restaurants: 102 });
  const out = W.weeklyChecklist(checkedOn("2026-09-10"), "2026-09-20", { market: m });
  assert.equal(out.batch.length, real.restaurants.length);
  assert.match(out.body, /\*\*Why now:\*\* restaurant prices in the South up 2% \(Sep 2026 to Oct 2026\)/);
  const tooSoon = W.weeklyChecklist(checkedOn("2026-09-15"), "2026-09-20", { market: m });
  assert.equal(tooSoon.batch.length, 0, "checked 5 days ago");
  const under = W.weeklyChecklist(checkedOn("2026-09-10"), "2026-09-20", { market: market({ restaurants: 101.9 }) });
  assert.equal(under.batch.length, 0, "1.9% is under the bar");
});

test("an ingredient up 8% pulls forward only the menus that use it", () => {
  const out = W.weeklyChecklist(checkedOn("2026-09-10"), "2026-09-20", { market: market({ beef: 108 }) });
  const ids = out.batch.map((x) => x.r.id);
  assert.ok(ids.includes("moreno-burger"));
  assert.ok(ids.includes("el-chilito"), "carne asada");
  assert.ok(!ids.includes("evangeline-cafe"), "no beef on the menu");
  assert.match(out.body, /\*\*Moreno Burger Co\.\*\*[^\n]*Why now:\*\* beef up 8%/);
  const falling = W.weeklyChecklist(checkedOn("2026-09-10"), "2026-09-20", { market: market({ beef: 80 }) });
  assert.equal(falling.batch.length, 0, "a price drop doesn't trigger a check");
});

test("triggered menus come first, then the oldest; at most 10 a week", () => {
  const data = checkedOn("2026-09-10");
  r(data, "evangeline-cafe").lastChecked = "2026-06-01"; // overdue on the baseline, no beef
  const base = r(data, "evangeline-cafe"); // no beef: these copies are due on the baseline only
  for (let i = 0; i < 12; i++) {
    data.restaurants.push(Object.assign(JSON.parse(JSON.stringify(base)), { id: `sample-${i}`, name: `Sample spot ${i} (sample)`, lastChecked: "2026-05-01" }));
  }
  const out = W.weeklyChecklist(data, "2026-09-20", { market: market({ beef: 112 }) });
  assert.equal(out.batch.length, W.BATCH);
  assert.ok(out.batch[0].triggers.length > 0, "a beef menu leads");
  const firstUntriggered = out.batch.findIndex((x) => !x.triggers.length);
  assert.ok(firstUntriggered > 0, "some triggered, then some on the baseline");
  assert.ok(out.batch.slice(firstUntriggered).every((x) => !x.triggers.length), "triggered ones are all first");
  const rest = out.batch.slice(firstUntriggered);
  for (let i = 1; i < rest.length; i++) assert.ok(rest[i - 1].age >= rest[i].age, "then oldest first");
  assert.equal(out.later, out.due.length - W.BATCH);
  assert.match(out.title, /more waiting\)$/);
});

test("deals that ended, end soon, or weren't verified this week are listed", () => {
  const data = copy();
  data.deals.push({ id: "t-old", restaurantId: "bee-dumpling", title: "Old app deal (test)", type: "bogo", appliesTo: { itemIds: ["bd-dump-pork"] },
    channels: ["doordash"], expires: "2026-11-25", verified: "2026-11-20", source: "Seen in the DoorDash app" });
  data.deals.push({ id: "t-soon", restaurantId: "bee-dumpling", title: "Ending soon (test)", type: "bogo", appliesTo: { itemIds: ["bd-dump-pork"] },
    channels: ["doordash"], expires: "2026-12-04", verified: "2026-11-30" });
  const out = W.weeklyChecklist(data, "2026-12-01", { market: calm });
  const why = Object.fromEntries(out.deals.map((x) => [x.d.id, x.why]));
  assert.match(why["t-old"], /^ended Nov 25, 2026/);
  assert.match(why["t-soon"], /^ends Dec 4, 2026/);
  assert.match(why["ev-lunch-3"], /^last verified Nov 22, 2026/);
});

test("the issue shows a market watch table and names unverified restaurants", () => {
  const out = W.weeklyChecklist(real, "2026-12-01", { market: market({ beef: 105 }) });
  assert.match(out.body, /## Market watch/);
  assert.match(out.body, /\| Ground beef, per lb \| \$105\.00 \(Oct 2026\) \| up 5% \| up 5% \|/);
  assert.match(out.body, /## Not yet verified by Nick/);
});

test("parseBls reads a BLS answer: monthly values only, oldest first", () => {
  const out = F.parseBls({ status: "REQUEST_SUCCEEDED", Results: { series: [
    { seriesID: "APU0000703112", data: [
      { year: "2026", period: "M10", value: "6.755" },
      { year: "2026", period: "M13", value: "6.5" },
      { year: "2026", period: "M09", value: "-" },
      { year: "2026", period: "M08", value: "6.80" }
    ] }
  ] } });
  assert.deepEqual(Object.keys(out), ["beef"]);
  assert.deepEqual(out.beef.points, [{ month: "2026-08", value: 6.8 }, { month: "2026-10", value: 6.755 }]);
  assert.throws(() => F.parseBls({ status: "REQUEST_NOT_PROCESSED", message: ["Daily threshold reached"] }), /Daily threshold/);
});

test("the reminder never fetches web pages; the market fetcher talks only to api.bls.gov (rule 5)", () => {
  const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
  const reminder = read("scripts/weekly-check.js");
  assert.doesNotMatch(reminder, /require\(\s*["'](?:node:)?(?:https?|http2|net|tls|dgram)["']\s*\)/);
  assert.doesNotMatch(reminder, /\bfetch\s*\(|XMLHttpRequest|WebSocket/);
  const fetcher = read("scripts/fetch-market.js");
  const hosts = [...fetcher.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map((m) => m[1].toLowerCase());
  assert.ok(hosts.length > 0);
  assert.deepEqual([...new Set(hosts)], ["api.bls.gov"]);
  assert.equal(F.API_HOST, "https://api.bls.gov");
  assert.doesNotMatch(read(".github/workflows/weekly-check.yml"), /\b(curl|wget)\b/);
});
