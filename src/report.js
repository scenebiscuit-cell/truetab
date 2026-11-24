/*
 * TrueTab restaurant report: pure functions, no DOM. Runs in the browser (window.TrueTabReport)
 * and in Node (require). All math comes from src/engine.js; this file only asks it questions
 * and arranges the answers. Nothing here changes the data passed in.
 */
(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const api = factory(node ? require("./engine.js") : root.TrueTab);
  if (node) module.exports = api;
  else root.TrueTabReport = api;
})(typeof self !== "undefined" ? self : this, function (T) {
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  // A typical weekday. Wednesday: every 78745 spot on file is open at both times.
  const WEEKDAY = 3;
  const TIMES = { lunch: "12:00", dinner: "18:00" };
  const SCENARIOS = {
    "adult-pickup": { label: "1 adult, pickup", group: "adult", adults: 1, kids: 0, mode: "pickup" },
    "adult-best": { label: "1 adult, cheapest way to order", group: "adult", adults: 1, kids: 0, mode: "any" },
    "family-pickup": { label: "Family of 4 (2 adults, 2 kids), pickup", group: "family", adults: 2, kids: 2, mode: "pickup" },
    "family-best": { label: "Family of 4 (2 adults, 2 kids), cheapest way to order", group: "family", adults: 2, kids: 2, mode: "any" }
  };
  // Group sizes tried, smallest first, when checking whether a deal gets used.
  const PARTIES = [
    { adults: 1, kids: 0, label: "1 adult" },
    { adults: 2, kids: 0, label: "2 adults" },
    { adults: 2, kids: 2, label: "2 adults, 2 kids" }
  ];

  const money = (n) => "$" + n.toFixed(2);
  const clone = (x) => JSON.parse(JSON.stringify(x));

  function clock(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${h < 12 || h === 24 ? "am" : "pm"}`;
  }

  function whenAt(time, date) {
    return { day: WEEKDAY, minutes: T.toMinutes(TIMES[time]), date: date || undefined };
  }

  function restaurantOf(data, id) {
    const r = data.restaurants.find((x) => x.id === id);
    if (!r) throw new Error(`No restaurant with id "${id}"`);
    return r;
  }

  /* ---------- Ranking ---------- */

  // Rank among the restaurants open at that time that can feed the group, by all-in cost.
  // Same group everywhere, so cheapest total = cheapest per person.
  function rankAt(data, restaurantId, scenario, when) {
    const s = SCENARIOS[scenario];
    const results = T.search(data, { adults: s.adults, kids: s.kids, mode: s.mode, when, budget: 0 }).results;
    const table = results
      .map((x) => ({
        id: x.restaurant.id,
        name: x.restaurant.name,
        total: x.best.price.total,
        perPerson: x.best.perPerson,
        channelLabel: x.best.channelLabel
      }))
      .sort((a, b) => a.total - b.total);
    const self = table.find((x) => x.id === restaurantId);
    if (!self) return { open: false, of: table.length, table };
    const others = table.filter((x) => x.id !== restaurantId);
    return {
      open: true,
      rank: 1 + others.filter((x) => x.total < self.total - 0.005).length,
      of: table.length,
      total: self.total,
      perPerson: self.perPerson,
      channelLabel: self.channelLabel,
      cheapestOther: others[0] || null,
      table
    };
  }

  // scenario: "adult-pickup" | "adult-best" | "family-pickup" | "family-best". opts.date: "YYYY-MM-DD" (deal end dates).
  function rankFor(data, restaurantId, scenario, opts) {
    if (!SCENARIOS[scenario]) throw new Error(`Unknown scenario "${scenario}"`);
    restaurantOf(data, restaurantId);
    const date = opts && opts.date;
    return {
      scenario,
      label: SCENARIOS[scenario].label,
      lunch: rankAt(data, restaurantId, scenario, whenAt("lunch", date)),
      dinner: rankAt(data, restaurantId, scenario, whenAt("dinner", date))
    };
  }

  // Every scenario at lunch and dinner, flattened.
  function allRanks(data, restaurantId, date) {
    const out = [];
    for (const scenario of Object.keys(SCENARIOS)) {
      const r = rankFor(data, restaurantId, scenario, { date });
      for (const time of ["lunch", "dinner"]) out.push(Object.assign({ scenario, time }, r[time]));
    }
    return out;
  }

  /* ---------- App vs. pickup ---------- */

  // Extra cost on each delivery app vs. pickup, without deals, at weekday dinner. Always an estimate.
  function appGap(data, restaurantId, opts) {
    restaurantOf(data, restaurantId);
    const when = whenAt("dinner", opts && opts.date);
    const out = [];
    for (const scenario of ["adult-pickup", "family-pickup"]) {
      const s = SCENARIOS[scenario];
      const hit = T.search(data, { adults: s.adults, kids: s.kids, mode: "any", when }).results
        .find((x) => x.restaurant.id === restaurantId);
      const pickup = hit && hit.options.find((o) => o.channelId === "pickup");
      if (!pickup) continue;
      for (const o of hit.options) {
        const ch = data.channels.find((c) => c.id === o.channelId);
        if (!ch || !ch.requiresApp) continue;
        const extra = T.cents(o.normalTotal - pickup.normalTotal);
        out.push({
          scenario,
          group: s.group === "adult" ? "1 adult" : "Family of 4",
          channelId: o.channelId,
          channelLabel: o.channelLabel,
          pickup: pickup.normalTotal,
          app: o.normalTotal,
          extra,
          extraPct: pickup.normalTotal ? Math.round((extra / pickup.normalTotal) * 100) : 0,
          markupPct: o.markupPct,
          estimated: true
        });
      }
    }
    return out;
  }

  /* ---------- Promo check ---------- */

  // A day and time the deal is running and the restaurant is open. Weekdays first.
  function runningTime(deal, restaurant, date) {
    const days = (deal.days || [0, 1, 2, 3, 4, 5, 6]).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    const start = deal.start ? T.toMinutes(deal.start) : T.toMinutes(TIMES.lunch);
    const end = deal.end ? T.toMinutes(deal.end) : 24 * 60;
    for (const day of days) {
      for (let m = start; m < end; m += 30) {
        const when = { day, minutes: m, date: date || undefined };
        if (T.isOpen(restaurant, when)) return when;
      }
    }
    return null;
  }

  // A copy of the data where this restaurant sells only the items `keep` allows (the real data is untouched).
  function trimmed(data, restaurantId, keep) {
    return Object.assign({}, data, {
      restaurants: data.restaurants.map((x) =>
        x.id === restaurantId ? Object.assign({}, x, { items: x.items.filter(keep) }) : x)
    });
  }

  // Smallest group whose cheapest order on this channel actually uses the promo.
  function checkPromo(data, restaurantId, when, channelId, medians, uses) {
    for (const p of PARTIES) {
      const hit = T.search(data, { adults: p.adults, kids: p.kids, mode: "any", when, medians }).results
        .find((x) => x.restaurant.id === restaurantId);
      const o = hit && hit.options.find((x) => x.channelId === channelId);
      if (o && o.check && uses(o)) return { party: p.label, option: o };
    }
    return null;
  }

  // Plain-English reasons for a deal-check result (same wording as the main page).
  function dealReasons(c) {
    const reasons = [];
    reasons.push(c.saving > 0.005
      ? `Saves ${money(c.saving)} (${c.pct}%) compared with the same order without the deal.`
      : "Saves nothing compared with the same order without the deal.");
    if (c.vsNoDeal < -0.005) reasons.push(`${c.noDealLabel} without any deal is ${money(-c.vsNoDeal)} cheaper.`);
    else if (c.noDealSameChannel) reasons.push("Cheaper than any way of ordering without a deal.");
    else reasons.push(`${money(c.vsNoDeal)} cheaper than the best way to order without a deal (${c.noDealLabel}).`);
    for (const n of c.nearby) {
      const how = n.status === "cheaper" ? "below" : n.status === "pricier" ? "above" : "about the same as";
      reasons.push(`${n.name}: ${money(n.perPortion)} per portion with the deal, ${how} the typical ${money(n.median)} for similar dishes nearby (${n.count} compared).`);
    }
    for (const r of c.raised) {
      reasons.push(`Watch out: ${r.name} went from ${money(r.from)} to ${money(r.to)} after ${r.date}, shortly before this deal started.`);
    }
    return reasons;
  }

  function promoResult(base, found) {
    if (!found) {
      return Object.assign(base, {
        verdict: null,
        reasons: ["It didn't lower the cheapest order for 1 adult, 2 adults or a family of 4 at that time, so there was nothing to grade."]
      });
    }
    const o = found.option;
    return Object.assign(base, {
      party: found.party,
      channelLabel: o.channelLabel,
      total: o.price.total,
      verdict: o.check.verdict,
      check: o.check,
      reasons: dealReasons(o.check)
    });
  }

  // Every deal and every two-for-one menu item at this restaurant, graded at a time it is running.
  function promoReport(data, restaurantId, opts) {
    const date = opts && opts.date;
    const r = restaurantOf(data, restaurantId);
    const medians = T.perPortionMedians(data);
    const out = [];
    for (const d of (data.deals || []).filter((x) => x.restaurantId === restaurantId)) {
      const base = { id: d.id, kind: "deal", title: d.title, note: d.note || null, source: d.source || null, verified: d.verified || null };
      if (date && d.expires && date > d.expires) {
        out.push(Object.assign(base, { verdict: null, expired: true, reasons: [`Ended ${d.expires}.`] }));
        continue;
      }
      const when = runningTime(d, r, date);
      if (!when) {
        out.push(Object.assign(base, { verdict: null, reasons: ["The restaurant isn't open while this deal runs."] }));
        continue;
      }
      const a = d.appliesTo || {};
      const keep = a.itemIds || a.dishTypes
        ? (i) => (a.itemIds || []).includes(i.id) || (a.dishTypes || []).includes(i.dishType)
        : () => true;
      const channelId = (d.channels && d.channels[0]) || "pickup";
      base.whenLabel = `${DAYS[when.day]} ${clock(when.minutes)}`;
      out.push(promoResult(base, checkPromo(trimmed(data, restaurantId, keep), restaurantId, when, channelId, medians,
        (o) => o.deals.some((x) => x.id === d.id))));
    }
    for (const item of r.items.filter((i) => i.promo === "bogo")) {
      const when = whenAt("lunch", date);
      const base = { id: item.id, kind: "menu-bogo", title: item.name, note: null, whenLabel: `${DAYS[when.day]} ${clock(when.minutes)}` };
      const keep = (i) => i.id === item.id || i.id === item.pairOf;
      out.push(promoResult(base, checkPromo(trimmed(data, restaurantId, keep), restaurantId, when, "pickup", medians,
        (o) => o.order.lines.some((l) => l.itemId === item.id))));
    }
    return out;
  }

  /* ---------- Portions ---------- */

  function portionFacts(r, dishTypes) {
    const meals = r.items.filter((i) => !i.kidsOnly && T.servesFor(i, dishTypes).serves > 0);
    const stated = meals.filter((i) => ["restaurant", "reports"].includes(T.servesFor(i, dishTypes).source)).length;
    return {
      mealItems: meals.length,
      stated,
      statedPct: meals.length ? Math.round((stated / meals.length) * 100) : 0,
      familyPack: meals.some((i) => T.servesFor(i, dishTypes).serves >= 4),
      kidsMeals: r.items.some((i) => i.kidsOnly)
    };
  }

  function portionReport(data, restaurantId) {
    const self = portionFacts(restaurantOf(data, restaurantId), data.dishTypes);
    const others = data.restaurants.filter((x) => x.id !== restaurantId).map((x) => portionFacts(x, data.dishTypes));
    return Object.assign(self, {
      nearby: {
        count: others.length,
        statePortions: others.filter((x) => x.stated > 0).length,
        familyPack: others.filter((x) => x.familyPack).length,
        kidsMeals: others.filter((x) => x.kidsMeals).length
      }
    });
  }

  /* ---------- Suggested changes ---------- */

  // Restaurant price per portion for every meal item (not kids' meals, not add-ons).
  function perPortionList(restaurants, dishTypes, filter) {
    const list = [];
    for (const x of restaurants) {
      for (const i of x.items) {
        if (i.kidsOnly || typeof (i.prices || {}).direct !== "number") continue;
        const s = T.servesFor(i, dishTypes);
        if (s.serves > 0 && (!filter || filter(s))) list.push(i.prices.direct / s.serves);
      }
    }
    return list.sort((a, b) => a - b);
  }

  function medianOf(sorted) {
    const m = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
  }

  /*
   * Up to 3 candidate changes, each tested by re-running the ranking on a copy of the data.
   * Only changes that move a rank up are returned. These are suggestions for Nick to review.
   */
  function suggestFixes(data, restaurantId, opts) {
    return testFixes(data, restaurantId, opts).fixes;
  }

  // The fixes that help, plus the titles of every candidate tried (for "what we tested").
  function testFixes(data, restaurantId, opts) {
    const date = opts && opts.date;
    const r = restaurantOf(data, restaurantId);
    const before = allRanks(data, restaurantId, date);
    const facts = portionFacts(r, data.dishTypes);
    const candidates = [];

    // (a) A family pack at the area's median family-pack price per portion.
    if (!facts.familyPack) {
      const packs = perPortionList(data.restaurants, data.dishTypes, (s) => s.serves >= 4);
      if (packs.length) {
        const price = T.cents(medianOf(packs) * 4);
        candidates.push({
          id: "family-pack",
          title: `Add a family pack that feeds 4 for ${money(price)}`,
          detail: `Priced at the area's typical family-pack price per portion (${money(T.cents(price / 4))}, median of ${packs.length} family packs nearby). Say on the menu that it feeds 4.`,
          scenarios: ["family-pickup", "family-best"],
          times: ["lunch", "dinner"],
          apply: (copy) => restaurantOf(copy, restaurantId).items.push({
            id: restaurantId + "--suggested-family-pack", name: "Family pack (suggested)", dishType: "entree",
            portion: { serves: 4, source: "restaurant" }, prices: { direct: price }
          })
        });
      }
    }

    // (b) A lunch plate matching the cheapest price per portion nearby, if 1 adult ranks in the bottom half.
    const adultLunch = before.find((x) => x.scenario === "adult-pickup" && x.time === "lunch");
    if (adultLunch.open && adultLunch.rank > adultLunch.of / 2) {
      const others = data.restaurants.filter((x) => x.id !== restaurantId);
      const cheapest = perPortionList(others, data.dishTypes)[0];
      if (cheapest) {
        const price = T.cents(cheapest);
        candidates.push({
          id: "lunch-plate",
          title: `Add a one-person lunch plate for ${money(price)}`,
          detail: `Matches the cheapest price per portion at any nearby spot (${money(price)}). Say on the menu that it's a full meal for one.`,
          scenarios: ["adult-pickup", "adult-best"],
          times: ["lunch"],
          apply: (copy) => restaurantOf(copy, restaurantId).items.push({
            id: restaurantId + "--suggested-lunch-plate", name: "Lunch plate (suggested)", dishType: "entree",
            portion: { serves: 1, source: "restaurant" }, prices: { direct: price }
          })
        });
      }
    }

    // (c) For an app promo graded "Not worth it", run the same deal for pickup.
    for (const p of promoReport(data, restaurantId, { date }).filter((x) => x.kind === "deal" && x.verdict === "not-worth-it")) {
      const deal = data.deals.find((d) => d.id === p.id);
      candidates.push({
        id: "pickup-special-" + deal.id,
        title: `Offer "${deal.title}" for pickup too`,
        detail: `The ${p.channelLabel} version loses to ordering without a deal. The same deal for pickup skips the app markup and fees.`,
        scenarios: Object.keys(SCENARIOS),
        times: ["lunch", "dinner"],
        apply: (copy) => copy.deals.push(Object.assign(clone(deal), { id: deal.id + "--suggested-pickup", channels: ["pickup"], expires: undefined }))
      });
    }

    const fixes = [];
    for (const c of candidates) {
      const copy = clone(data);
      c.apply(copy);
      const after = allRanks(copy, restaurantId, date);
      let best = null;
      for (const b of before) {
        if (!b.open || !c.scenarios.includes(b.scenario) || !c.times.includes(b.time)) continue;
        const a = after.find((x) => x.scenario === b.scenario && x.time === b.time);
        if (!a.open || a.rank >= b.rank) continue;
        const gain = b.rank - a.rank;
        if (!best || gain > best.gain || (gain === best.gain && b.total - a.total > best.drop)) {
          best = { gain, drop: b.total - a.total, b, a };
        }
      }
      if (!best) continue;
      fixes.push({
        id: c.id,
        suggestion: true,
        title: c.title,
        detail: c.detail,
        scenario: best.b.scenario,
        scenarioLabel: SCENARIOS[best.b.scenario].label,
        time: best.b.time,
        before: { rank: best.b.rank, of: best.b.of, total: best.b.total },
        after: { rank: best.a.rank, of: best.a.of, total: best.a.total },
        gain: best.gain
      });
    }
    return { fixes: fixes.sort((x, y) => y.gain - x.gain).slice(0, 3), tested: candidates.map((c) => c.title) };
  }

  /* ---------- The whole report ---------- */

  function letter(i) {
    let s = "";
    for (let n = i; n >= 0; n = Math.floor(n / 26) - 1) s = String.fromCharCode(65 + (n % 26)) + s;
    return s;
  }

  // Name shown for every restaurant: the real name, or "Nearby spot A, B…" for competitors when anonymized.
  function competitorLabels(data, restaurantId, anonymize) {
    const labels = {};
    let i = 0;
    for (const x of data.restaurants) {
      labels[x.id] = x.id === restaurantId || !anonymize ? x.name : "Nearby spot " + letter(i++);
    }
    return labels;
  }

  function ordinal(n) {
    const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
    return n + s;
  }

  function place(rank) {
    return rank === 1 ? "the best value" : `the ${ordinal(rank)}-best value`;
  }

  function headline(name, area, family, adult) {
    if (!family.open && !adult.open) return `${name} wasn't open at the weekday lunch and dinner times we checked.`;
    const parts = [];
    if (family.open) parts.push(`${place(family.rank)} for a family of four out of ${family.of} spots in ${area} (pickup, weekday dinner)`);
    if (adult.open) parts.push(`${place(adult.rank)} for one adult out of ${adult.of} (pickup, weekday lunch)`);
    return `${name} is ${parts.join(", and ")}.`;
  }

  /*
   * Everything the report page shows, as plain data. With anonymize on, competitors appear only
   * as "Nearby spot A, B…": no names or ids.
   * opts: { date: "YYYY-MM-DD", anonymize: true }
   */
  function buildReport(data, restaurantId, opts) {
    const o = Object.assign({ anonymize: true }, opts);
    const r = restaurantOf(data, restaurantId);
    const labels = competitorLabels(data, restaurantId, o.anonymize);
    const area = (data.meta && data.meta.area) || "the area";
    const row = (x) => ({ label: labels[x.id], self: x.id === restaurantId, total: x.total, perPerson: x.perPerson, channelLabel: x.channelLabel });
    const shape = (x) => ({
      open: x.open,
      rank: x.rank,
      of: x.of,
      total: x.total,
      perPerson: x.perPerson,
      channelLabel: x.channelLabel,
      cheapestOther: x.cheapestOther ? row(x.cheapestOther) : null,
      table: x.table.map(row)
    });
    const ranks = {};
    for (const s of Object.keys(SCENARIOS)) {
      const x = rankFor(data, restaurantId, s, { date: o.date });
      ranks[s] = { label: x.label, lunch: shape(x.lunch), dinner: shape(x.dinner) };
    }
    const portions = portionReport(data, restaurantId);
    const tested = testFixes(data, restaurantId, { date: o.date });
    const appChannels = data.channels.filter((c) => c.requiresApp);
    return {
      restaurant: { name: r.name, address: r.address || null, neighborhood: r.neighborhood || null },
      date: o.date || null,
      area,
      anonymized: o.anonymize,
      times: { lunch: `${DAYS[WEEKDAY]} ${clock(T.toMinutes(TIMES.lunch))}`, dinner: `${DAYS[WEEKDAY]} ${clock(T.toMinutes(TIMES.dinner))}` },
      headline: headline(r.name, area, ranks["family-pickup"].dinner, ranks["adult-pickup"].lunch),
      ranks,
      appGap: appGap(data, restaurantId, { date: o.date }),
      onApps: appChannels.filter((c) => T.channelFor(r, c)).map((c) => c.label),
      promos: promoReport(data, restaurantId, { date: o.date }),
      portions,
      fixes: tested.fixes,
      fixesTested: tested.tested,
      method: {
        collected: (data.meta && data.meta.collected) || null,
        note: (data.meta && data.meta.note) || null,
        checked: data.restaurants.map((x) => ({ label: labels[x.id], self: x.id === restaurantId, lastChecked: x.lastChecked || null })),
        taxRate: data.taxRate,
        markupPct: typeof data.defaultMarkupPct === "number" ? data.defaultMarkupPct : 0.2,
        appFees: appChannels.map((c) => ({
          label: c.label, deliveryFee: c.deliveryFee, serviceFeePct: c.serviceFeePct, serviceFeeMin: c.serviceFeeMin, tipPct: c.defaultTipPct
        })),
        kidPortion: (data.appetite || { kid: 0.6 }).kid
      }
    };
  }

  return {
    SCENARIOS,
    TIMES,
    WEEKDAY,
    rankFor,
    appGap,
    promoReport,
    portionReport,
    suggestFixes,
    competitorLabels,
    dealReasons,
    buildReport
  };
});
