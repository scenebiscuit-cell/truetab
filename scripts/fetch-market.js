/*
 * Fetches monthly price data from the U.S. Bureau of Labor Statistics public API (government data,
 * free to use automatically) and writes it to a JSON file for scripts/weekly-check.js.
 * This is the only TrueTab script that goes online, and it talks only to api.bls.gov.
 * It never visits a restaurant's site, an ordering page or any app.
 *
 * Usage:  node scripts/fetch-market.js market.json
 * Optional env BLS_API_KEY (free from bls.gov) raises the daily limit; without it the keyless v1 API is used.
 */
const fs = require("fs");

// What each cost driver is measured by. Ingredient prices are U.S. city averages; restaurant meals are the South region.
const SERIES = {
  restaurants: { id: "CUUR0300SEFV", label: "Restaurant meals in the South (price index)" },
  beef: { id: "APU0000703112", label: "Ground beef, per lb" },
  chicken: { id: "APU0000FF1101", label: "Boneless chicken breast, per lb" },
  pork: { id: "APU0000FD3101", label: "Pork chops, per lb" },
  eggs: { id: "APU0000708111", label: "Eggs, grade A large, per dozen" },
  rice: { id: "APU0000701312", label: "White rice, per lb" },
  bread: { id: "APU0000702111", label: "White bread, per lb (stands in for buns and tortillas)" }
};

const API_HOST = "https://api.bls.gov";

// BLS answer -> { driver: { id, label, points: [{ month: "YYYY-MM", value }] oldest first } }
function parseBls(json) {
  if (!json || json.status !== "REQUEST_SUCCEEDED") {
    throw new Error(`BLS request failed: ${(json && json.status) || "no answer"} ${((json && json.message) || []).join(" ")}`);
  }
  const byId = {};
  for (const s of (json.Results && json.Results.series) || []) {
    byId[s.seriesID] = (s.data || [])
      .filter((d) => /^M(0[1-9]|1[0-2])$/.test(d.period) && d.value !== "-" && Number.isFinite(Number(d.value)))
      .map((d) => ({ month: `${d.year}-${d.period.slice(1)}`, value: Number(d.value) }))
      .sort((a, b) => (a.month < b.month ? -1 : 1));
  }
  const out = {};
  for (const [driver, s] of Object.entries(SERIES)) {
    if (byId[s.id] && byId[s.id].length) out[driver] = { id: s.id, label: s.label, points: byId[s.id] };
  }
  return out;
}

async function fetchMarket(now) {
  const year = (now || new Date()).getUTCFullYear();
  const key = process.env.BLS_API_KEY;
  const body = { seriesid: Object.values(SERIES).map((s) => s.id), startyear: String(year - 2), endyear: String(year) };
  if (key) body.registrationkey = key;
  const res = await fetch(`${API_HOST}/publicAPI/${key ? "v2" : "v1"}/timeseries/data/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "TrueTab weekly price-check reminder" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`BLS answered HTTP ${res.status}`);
  return { fetched: new Date().toISOString(), source: "U.S. Bureau of Labor Statistics", series: parseBls(await res.json()) };
}

module.exports = { SERIES, API_HOST, parseBls, fetchMarket };

if (require.main === module) {
  const outFile = process.argv[2] || "market.json";
  fetchMarket()
    .then((m) => {
      fs.writeFileSync(outFile, JSON.stringify(m, null, 2));
      console.log(`Wrote ${outFile}: ${Object.keys(m.series).length} of ${Object.keys(SERIES).length} series.`);
    })
    .catch((e) => {
      console.error(`Couldn't fetch market data: ${e.message}`);
      process.exit(1);
    });
}
