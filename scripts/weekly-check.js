/*
 * Weekly price-check reminder. Reads TrueTab's own data and writes this week's checklist of what to
 * check BY HAND: the restaurants checked longest ago (a batch, oldest first), deals to re-verify,
 * and restaurants not yet verified. It never visits a restaurant's website, ordering page or any app:
 * prices stay hand-checked (CLAUDE.md rule 5, PLAN.md sourcing rules).
 *
 * Run every Monday by .github/workflows/weekly-check.yml, which opens a GitHub issue with the result.
 * Run it yourself:  node scripts/weekly-check.js
 *   --title-file <path>  --body-file <path>  write the issue title and body instead of printing
 *   --today YYYY-MM-DD   pretend it's another day
 */
const DUE_DAYS = 7; // a restaurant is due when its lastChecked is this many days old
const BATCH = 10; // at most this many restaurants per week, oldest first; the rest wait for next week
const DEAL_SOON_DAYS = 7; // deals ending within this many days get a reminder

function daysBetween(a, b) {
  return Math.round((new Date(b + "T12:00:00Z") - new Date(a + "T12:00:00Z")) / 86400000);
}

function longDate(iso) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

const SOURCE_NAMES = { website: "Website", toast: "Ordering page", instagram: "Instagram", facebook: "Facebook", do512: "Do512" };

/*
 * The checklist as data and Markdown. today: "YYYY-MM-DD".
 * opts: { dueDays, batch, siteUrl }
 */
function weeklyChecklist(data, today, opts) {
  const o = Object.assign({ dueDays: DUE_DAYS, batch: BATCH, siteUrl: null }, opts);
  const ages = data.restaurants.map((r) => ({ r, age: r.lastChecked ? daysBetween(r.lastChecked, today) : Infinity }));
  const due = ages.filter((x) => x.age >= o.dueDays).sort((a, b) => b.age - a.age || a.r.name.localeCompare(b.r.name));
  const batch = due.slice(0, o.batch);
  const later = due.length - batch.length;
  const names = Object.fromEntries(data.restaurants.map((r) => [r.id, r.name]));

  const deals = [];
  for (const d of data.deals || []) {
    const where = names[d.restaurantId] || d.restaurantId;
    if (d.expires && today > d.expires) deals.push({ d, where, why: `ended ${longDate(d.expires)}: remove it, or update it if it's still running` });
    else if (d.expires && daysBetween(today, d.expires) <= DEAL_SOON_DAYS) deals.push({ d, where, why: `ends ${longDate(d.expires)}: check whether it's extended` });
    else if (!d.verified || daysBetween(d.verified, today) >= o.dueDays) {
      deals.push({ d, where, why: d.verified ? `last verified ${longDate(d.verified)}` : "never verified" });
    }
  }
  const unverified = data.restaurants.filter((r) => r.verifiedBy !== "nick").map((r) => r.name);

  const title = `Weekly price check: week of ${longDate(today)} (${batch.length} restaurant${batch.length === 1 ? "" : "s"}${later ? `, ${later} more waiting` : ""})`;
  const lines = [];
  lines.push(`Check these by hand on each restaurant's own menu. Oldest checks first, up to ${o.batch} a week.`);
  lines.push("");
  lines.push(`## Restaurants (${batch.length} of ${due.length} due)`);
  lines.push("");
  if (!batch.length) lines.push(`Nothing is due: every restaurant was checked in the last ${o.dueDays} days.`);
  for (const { r, age } of batch) {
    const links = Object.entries(SOURCE_NAMES)
      .filter(([k]) => r.sources && r.sources[k])
      .map(([k, label]) => `[${label}](${r.sources[k]})`);
    const when = age === Infinity ? "never checked" : `last checked ${longDate(r.lastChecked)} (${age} days ago)`;
    lines.push(`- [ ] **${r.name}**, ${when}. ${links.length ? links.join(" · ") : "No source link on file: add one."}`);
  }
  if (later) {
    lines.push("");
    lines.push(`${later} more ${later === 1 ? "is" : "are"} due and will come up in the next weeks, oldest first.`);
  }
  if (deals.length) {
    lines.push("");
    lines.push("## Deals to re-check");
    lines.push("");
    for (const { d, where, why } of deals) {
      lines.push(`- [ ] **${where}**: "${d.title}", ${why}.${d.source && /^https?:/.test(d.source) ? ` [Source](${d.source})` : d.source ? ` (${d.source})` : ""}`);
    }
  }
  if (unverified.length) {
    lines.push("");
    lines.push(`## Not yet verified by Nick (${unverified.length})`);
    lines.push("");
    lines.push(`${unverified.join(", ")}. When you've checked a whole menu against the data, set \`verifiedBy: "nick"\`.`);
  }
  lines.push("");
  lines.push("## How to update");
  lines.push("");
  lines.push("1. Open each link above and compare prices, portions, hours and deals with `data/austin-78745.js`.");
  lines.push("2. If a price changed, move the old price and its date into the item's `history` first, then update it (docs/DATA.md). It then shows under \"Price changes\" on the data checklist.");
  lines.push("3. Set `lastChecked` to today. For each deal you re-checked, set `verified` to today.");
  lines.push("4. Run `npm test`, then open a pull request.");
  lines.push("");
  lines.push("Never copy from DoorDash, Uber Eats, Grubhub or Yelp, and don't run scripts against any of these pages.");
  if (o.siteUrl) lines.push(`Data checklist: ${o.siteUrl.replace(/\/?$/, "/")}check.html`);
  return { title, body: lines.join("\n") + "\n", due, batch, later, deals, unverified };
}

module.exports = { weeklyChecklist, DUE_DAYS, BATCH };

if (require.main === module) {
  const fs = require("fs");
  const path = require("path");
  const args = process.argv.slice(2);
  const arg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  // Today in Austin, so a Monday-morning run is dated Monday.
  const today = arg("--today") || new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
  const data = require(path.join(__dirname, "..", "data", "austin-78745.js"));
  const out = weeklyChecklist(data, today, { siteUrl: process.env.SITE_URL || null });
  if (arg("--title-file")) fs.writeFileSync(arg("--title-file"), out.title);
  if (arg("--body-file")) fs.writeFileSync(arg("--body-file"), out.body);
  if (!arg("--title-file") && !arg("--body-file")) process.stdout.write(`${out.title}\n\n${out.body}`);
}
