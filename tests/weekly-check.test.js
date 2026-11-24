// Tests for the weekly price-check reminder (scripts/weekly-check.js). Run with: npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const W = require("../scripts/weekly-check.js");
const real = require("../data/austin-78745.js");

const copy = () => JSON.parse(JSON.stringify(real));

test("every restaurant checked 7+ days ago is due, oldest first", () => {
  const out = W.weeklyChecklist(real, "2026-12-01");
  assert.equal(out.due.length, real.restaurants.length);
  for (let i = 1; i < out.due.length; i++) assert.ok(out.due[i - 1].age >= out.due[i].age);
  assert.equal(out.due[out.due.length - 1].r.id, "bee-dumpling", "checked a day later than the rest");
  assert.match(out.title, /^Weekly price check: week of Dec 1, 2026 \(6 restaurants\)$/);
});

test("nothing is due right after a check", () => {
  const out = W.weeklyChecklist(real, "2026-11-24");
  assert.equal(out.batch.length, 0);
  assert.match(out.body, /Nothing is due/);
});

test("a long list is batched: at most 10 a week, the rest counted as waiting", () => {
  const data = copy();
  const base = data.restaurants[0];
  for (let i = 0; i < 19; i++) {
    data.restaurants.push(Object.assign(JSON.parse(JSON.stringify(base)), {
      id: `sample-${i}`, name: `Sample spot ${i} (sample)`, lastChecked: `2026-10-${String(10 + i).padStart(2, "0")}`
    }));
  }
  const out = W.weeklyChecklist(data, "2026-12-01");
  assert.equal(out.due.length, 25);
  assert.equal(out.batch.length, W.BATCH);
  assert.equal(out.later, 15);
  assert.equal(out.batch[0].r.id, "sample-0", "the oldest check comes first");
  assert.match(out.title, /\(10 restaurants, 15 more waiting\)$/);
  assert.equal((out.body.match(/^- \[ \] \*\*/gm) || []).length, 10 + out.deals.length);
});

test("deals that ended, end soon, or weren't verified this week are listed", () => {
  const data = copy();
  data.deals.push({ id: "t-old", restaurantId: "bee-dumpling", title: "Old app deal (test)", type: "bogo", appliesTo: { itemIds: ["bd-dump-pork"] },
    channels: ["doordash"], expires: "2026-11-25", verified: "2026-11-20", source: "Seen in the DoorDash app" });
  data.deals.push({ id: "t-soon", restaurantId: "bee-dumpling", title: "Ending soon (test)", type: "bogo", appliesTo: { itemIds: ["bd-dump-pork"] },
    channels: ["doordash"], expires: "2026-12-04", verified: "2026-11-30" });
  const out = W.weeklyChecklist(data, "2026-12-01");
  const why = Object.fromEntries(out.deals.map((x) => [x.d.id, x.why]));
  assert.match(why["t-old"], /^ended Nov 25, 2026/);
  assert.match(why["t-soon"], /^ends Dec 4, 2026/);
  assert.match(why["ev-lunch-3"], /^last verified Nov 22, 2026/);
});

test("restaurants not verified by Nick are named", () => {
  const out = W.weeklyChecklist(real, "2026-12-01");
  assert.equal(out.unverified.length, real.restaurants.filter((r) => r.verifiedBy !== "nick").length);
  assert.match(out.body, /## Not yet verified by Nick/);
});

test("the reminder never fetches web pages (prices stay hand-checked, CLAUDE.md rule 5)", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "scripts", "weekly-check.js"), "utf8");
  assert.doesNotMatch(src, /require\(\s*["'](?:node:)?(?:https?|http2|net|tls|dgram)["']\s*\)/);
  assert.doesNotMatch(src, /\bfetch\s*\(|XMLHttpRequest|WebSocket/);
  const workflow = fs.readFileSync(path.join(__dirname, "..", ".github", "workflows", "weekly-check.yml"), "utf8");
  assert.doesNotMatch(workflow, /\b(curl|wget)\b/);
});
