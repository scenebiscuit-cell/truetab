/*
 * Weekly price-check reminder. Reads TrueTab's own data (and, when given, this month's government
 * price data from scripts/fetch-market.js) and writes this week's checklist of what to check BY HAND.
 * It never visits a restaurant's website, ordering page or any app: prices stay hand-checked
 * (CLAUDE.md rule 5, PLAN.md sourcing rules). This file does no web access at all.
 *
 * When is a restaurant due?
 * - Calm market: every BASELINE_DAYS (menu prices rarely change).
 * - Sooner, once a week has passed since its last check, if since that check restaurant prices in the
 *   South rose RESTAURANT_TRIGGER or more, or an ingredient its menu depends on rose INGREDIENT_TRIGGER or more.
 * - No market data this week: every FALLBACK_DAYS, to be safe.
 * Deals are still re-verified weekly. At most BATCH restaurants a week; triggered ones first, then oldest.
 *
 * Run every Monday by .github/workflows/weekly-check.yml, which opens a GitHub issue with the result.
 * Run it yourself:  node scripts/weekly-check.js [--market market.json] [--today YYYY-MM-DD]
 *   --title-file <path>  --body-file <path>  write the issue title and body instead of printing
 */
const BASELINE_DAYS = 60;
const FALLBACK_DAYS = 30;
const MIN_DAYS = 7; // never re-flag a restaurant checked in the last week
const RESTAURANT_TRIGGER = 0.02; // restaurant prices in the South up 2%+
const INGREDIENT_TRIGGER = 0.08; // an ingredient the menu depends on up 8%+
const DEAL_DAYS = 7; // deals are re-verified weekly
const DEAL_SOON_DAYS = 7; // deals ending within this many days get a reminder
const BATCH = 10;

// Which ingredient prices a dish follows, guessed from its name and dish type.
// An item (or a dish type) can set costDrivers: [...] in the data to override the guess.
const DRIVER_WORDS = {
  beef: /\b(beef|asada|steak|burgers?|brisket|barbacoa|bulgogi|smash)\b/i,
  chicken: /\b(chicken|pollo|wings?|tenders?)\b/i,
  pork: /\b(pork|pastor|carnitas|bacon|ham|chorizo|sausage)\b/i,
  eggs: /\b(eggs|egg(?! ?rolls?)|migas|breakfast|omelet)\b/i, // "egg rolls" aren't an egg dish
  rice: /\b(rice|jambalaya|gumbo|cơm)\b/i,
  bread: /\b(burgers?|po-?boy|buns?|bread|sandwich|torta)\b/i
};

function costDrivers(item, dishTypes) {
  if (Array.isArray(item.costDrivers)) return item.costDrivers;
  const type = (dishTypes || {})[item.dishType] || {};
  if (Array.isArray(type.costDrivers)) return type.costDrivers;
  const text = `${item.name} ${type.label || ""}`;
  return Object.keys(DRIVER_WORDS).filter((d) => DRIVER_WORDS[d].test(text));
}

function restaurantDrivers(r, dishTypes) {
  return [...new Set(r.items.flatMap((i) => costDrivers(i, dishTypes)))].sort();
}

function daysBetween(a, b) {
  return Math.round((new Date(b + "T12:00:00Z") - new Date(a + "T12:00:00Z")) / 86400000);
}

function longDate(iso) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function monthName(ym) {
  return new Date(ym + "-15T12:00:00Z").toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

/*
 * How much a series moved after a date: from the last month published on or before that date's
 * month to the newest month. null when no newer month has been published yet.
 */
function changeSince(series, isoDate) {
  if (!series || !series.points || !series.points.length) return null;
  const pts = series.points;
  const month = isoDate.slice(0, 7);
  const base = pts.filter((p) => p.month <= month).pop();
  const latest = pts[pts.length - 1];
  if (!base || latest.month <= base.month) return null;
  return { from: base, to: latest, pct: (latest.value - base.value) / base.value };
}

const pctText = (p) => `${p >= 0 ? "up" : "down"} ${Math.abs(Math.round(p * 1000) / 10)}%`;

// Reasons the market says this restaurant's prices may have moved since it was checked.
function marketTriggers(r, dishTypes, market) {
  if (!market || !market.series || !r.lastChecked) return [];
  const out = [];
  const meals = changeSince(market.series.restaurants, r.lastChecked);
  if (meals && meals.pct >= RESTAURANT_TRIGGER) {
    out.push({ driver: "restaurants", pct: meals.pct, text: `restaurant prices in the South ${pctText(meals.pct)} (${monthName(meals.from.month)} to ${monthName(meals.to.month)})` });
  }
  for (const d of restaurantDrivers(r, dishTypes)) {
    const c = changeSince(market.series[d], r.lastChecked);
    if (c && c.pct >= INGREDIENT_TRIGGER) {
      out.push({ driver: d, pct: c.pct, text: `${d} ${pctText(c.pct)} (${monthName(c.from.month)} to ${monthName(c.to.month)})` });
    }
  }
  return out.sort((a, b) => b.pct - a.pct);
}

const SOURCE_NAMES = { website: "Website", toast: "Ordering page", instagram: "Instagram", facebook: "Facebook", do512: "Do512" };

/*
 * The checklist as data and Markdown. today: "YYYY-MM-DD".
 * opts: { market (from fetch-market.js, or null), batch, siteUrl }
 */
function weeklyChecklist(data, today, opts) {
  const o = Object.assign({ market: null, batch: BATCH, siteUrl: null }, opts);
  const hasMarket = !!(o.market && o.market.series && Object.keys(o.market.series).length);
  const baseline = hasMarket ? BASELINE_DAYS : FALLBACK_DAYS;

  const rows = data.restaurants.map((r) => {
    const age = r.lastChecked ? daysBetween(r.lastChecked, today) : Infinity;
    const triggers = hasMarket ? marketTriggers(r, data.dishTypes, o.market) : [];
    const isDue = age >= baseline || (triggers.length > 0 && age >= MIN_DAYS);
    return { r, age, triggers, isDue };
  });
  const due = rows.filter((x) => x.isDue).sort((a, b) =>
    (b.triggers.length ? b.triggers[0].pct : -1) - (a.triggers.length ? a.triggers[0].pct : -1) ||
    b.age - a.age || a.r.name.localeCompare(b.r.name));
  const batch = due.slice(0, o.batch);
  const later = due.length - batch.length;
  const names = Object.fromEntries(data.restaurants.map((r) => [r.id, r.name]));

  const deals = [];
  for (const d of data.deals || []) {
    const where = names[d.restaurantId] || d.restaurantId;
    if (d.expires && today > d.expires) deals.push({ d, where, why: `ended ${longDate(d.expires)}: remove it, or update it if it's still running` });
    else if (d.expires && daysBetween(today, d.expires) <= DEAL_SOON_DAYS) deals.push({ d, where, why: `ends ${longDate(d.expires)}: check whether it's extended` });
    else if (!d.verified || daysBetween(d.verified, today) >= DEAL_DAYS) {
      deals.push({ d, where, why: d.verified ? `last verified ${longDate(d.verified)}` : "never verified" });
    }
  }
  const unverified = data.restaurants.filter((r) => r.verifiedBy !== "nick").map((r) => r.name);

  const title = `Weekly price check: week of ${longDate(today)} (${batch.length} restaurant${batch.length === 1 ? "" : "s"}${later ? `, ${later} more waiting` : ""})`;
  const lines = [];
  lines.push(hasMarket
    ? `Check these by hand on each restaurant's own menu. A menu is due every ${BASELINE_DAYS} days, or sooner when ingredient or restaurant prices jump; those come first. Up to ${o.batch} a week.`
    : `Check these by hand on each restaurant's own menu. Market data couldn't be loaded this week, so a menu is due every ${FALLBACK_DAYS} days. Up to ${o.batch} a week, oldest first.`);
  lines.push("");
  lines.push(`## Restaurants (${batch.length} of ${due.length} due)`);
  lines.push("");
  if (!batch.length) lines.push(`Nothing is due this week.`);
  for (const { r, age, triggers } of batch) {
    const links = Object.entries(SOURCE_NAMES)
      .filter(([k]) => r.sources && r.sources[k])
      .map(([k, label]) => `[${label}](${r.sources[k]})`);
    const when = age === Infinity ? "never checked" : `last checked ${longDate(r.lastChecked)} (${age} days ago)`;
    const why = triggers.length ? ` **Why now:** ${triggers.map((t) => t.text).join("; ")}.` : "";
    lines.push(`- [ ] **${r.name}**, ${when}.${why} ${links.length ? links.join(" · ") : "No source link on file: add one."}`);
  }
  if (later) {
    lines.push("");
    lines.push(`${later} more ${later === 1 ? "is" : "are"} due and will come up in the next weeks.`);
  }
  if (deals.length) {
    lines.push("");
    lines.push("## Deals to re-check");
    lines.push("");
    for (const { d, where, why } of deals) {
      lines.push(`- [ ] **${where}**: "${d.title}", ${why}.${d.source && /^https?:/.test(d.source) ? ` [Source](${d.source})` : d.source ? ` (${d.source})` : ""}`);
    }
  }
  if (hasMarket) {
    lines.push("");
    lines.push("## Market watch");
    lines.push("");
    lines.push("| Price | Latest | Last 3 months | Last 12 months |");
    lines.push("|---|---|---|---|");
    for (const s of Object.values(o.market.series)) {
      const p = s.points;
      const latest = p[p.length - 1];
      // n calendar months before the latest (a skipped month, like Oct 2025, falls back to the month before it).
      const ago = (n) => {
        const [y, mo] = latest.month.split("-").map(Number);
        const t = new Date(Date.UTC(y, mo - 1 - n, 15));
        const target = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
        return p.filter((x) => x.month <= target).pop();
      };
      const move = (n) => (ago(n) ? pctText((latest.value - ago(n).value) / ago(n).value) : "n/a");
      const value = s.id.startsWith("APU") ? `$${latest.value.toFixed(2)}` : latest.value.toFixed(1);
      lines.push(`| ${s.label} | ${value} (${monthName(latest.month)}) | ${move(3)} | ${move(12)} |`);
    }
    lines.push("");
    lines.push(`Source: ${o.market.source || "U.S. Bureau of Labor Statistics"}. Ingredients are U.S. averages; restaurant prices are the South region. Monthly, published about 2 weeks after each month ends.`);
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
  return { title, body: lines.join("\n") + "\n", due, batch, later, deals, unverified, baseline, hasMarket };
}

module.exports = {
  weeklyChecklist, costDrivers, restaurantDrivers, changeSince, marketTriggers,
  BASELINE_DAYS, FALLBACK_DAYS, MIN_DAYS, RESTAURANT_TRIGGER, INGREDIENT_TRIGGER, BATCH
};

if (require.main === module) {
  const fs = require("fs");
  const path = require("path");
  const args = process.argv.slice(2);
  const arg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  // Today in Austin, so a Monday-morning run is dated Monday.
  const today = arg("--today") || new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
  const data = require(path.join(__dirname, "..", "data", "austin-78745.js"));
  let market = null;
  if (arg("--market")) {
    try { market = JSON.parse(fs.readFileSync(arg("--market"), "utf8")); } catch (e) { market = null; }
  }
  const out = weeklyChecklist(data, today, { market, siteUrl: process.env.SITE_URL || null });
  if (arg("--title-file")) fs.writeFileSync(arg("--title-file"), out.title);
  if (arg("--body-file")) fs.writeFileSync(arg("--body-file"), out.body);
  if (!arg("--title-file") && !arg("--body-file")) process.stdout.write(`${out.title}\n\n${out.body}`);
}
