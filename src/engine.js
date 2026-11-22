/*
 * Menu Math engine: pure functions, no DOM. Runs in the browser (window.MenuMath)
 * and in Node (require). Every money value is rounded to cents.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MenuMath = api;
})(typeof self !== "undefined" ? self : this, function () {
  const cents = (n) => Math.round(n * 100) / 100;
  const RES = 12; // portion resolution: 1/12 of an adult portion

  // The channel settings for one restaurant, with that restaurant's overrides applied.
  function channelFor(restaurant, channel) {
    const override = (restaurant.channelFees && restaurant.channelFees[channel.id]) || {};
    if (override.available === false) return null;
    if (channel.requiresOptIn && override.available !== true) return null;
    return Object.assign({}, channel, override);
  }

  // Price of one item on one channel, or null if it isn't sold there.
  function itemPrice(item, channel) {
    const p = item.prices && item.prices[channel.priceKey];
    return typeof p === "number" ? p : null;
  }

  // What you actually pay: menu subtotal + delivery fee + service fee + small-order fee + tax + tip.
  // Assumptions (see docs/DATA.md): tax is on the food subtotal only; tip is a share of the subtotal.
  function allInPrice(subtotal, channel, taxRate, tipPct) {
    const tipShare = typeof tipPct === "number" ? tipPct : channel.defaultTipPct || 0;
    const deliveryFee = channel.deliveryFee || 0;
    const serviceFee = channel.serviceFeePct
      ? Math.max(subtotal * channel.serviceFeePct, channel.serviceFeeMin || 0)
      : 0;
    const smallOrderFee =
      channel.smallOrderThreshold && subtotal < channel.smallOrderThreshold ? channel.smallOrderFee || 0 : 0;
    const tax = subtotal * (taxRate || 0);
    const tip = subtotal * tipShare;
    const parts = {
      subtotal: cents(subtotal),
      deliveryFee: cents(deliveryFee),
      serviceFee: cents(serviceFee),
      smallOrderFee: cents(smallOrderFee),
      tax: cents(tax),
      tip: cents(tip)
    };
    parts.fees = cents(parts.deliveryFee + parts.serviceFee + parts.smallOrderFee);
    parts.total = cents(parts.subtotal + parts.fees + parts.tax + parts.tip);
    return parts;
  }

  // How many adult portions an item covers, and how sure we are.
  // Order of trust: restaurant says > customer reports > Nick's default for the dish type.
  function servesFor(item, dishTypes) {
    const p = item.portion || {};
    if (typeof p.serves === "number" && p.source === "restaurant") {
      return { serves: p.serves, source: "restaurant", label: `Serves ${fmtServes(p.serves)} (restaurant says)` };
    }
    if (typeof p.serves === "number" && p.source === "reports") {
      const n = p.reports || 0;
      return {
        serves: p.serves,
        source: "reports",
        label: `Serves about ${fmtServes(p.serves)} (from ${n} customer report${n === 1 ? "" : "s"})`
      };
    }
    const type = dishTypes && dishTypes[item.dishType];
    const d = type ? type.defaultServes : 0;
    if (!d) return { serves: 0, source: "none", label: "Add-on (not counted as a meal)" };
    return { serves: d, source: "estimate", label: `Estimated ${fmtServes(d)} portion (typical for this dish)` };
  }

  // 0.34 -> "1/3", 1.25 -> "1.25", 4 -> "4"
  function fmtServes(n) {
    const thirds = { 1: "1/3", 2: "2/3" };
    const whole = Math.floor(n + 1e-9);
    const t = Math.round((n - whole) * 3);
    if (Math.abs(n - whole - t / 3) < 0.02 && thirds[t]) return (whole ? whole + " " : "") + thirds[t];
    const r = Math.round(n * 100) / 100;
    return Number.isInteger(r) ? String(r) : String(r).replace(/0+$/, "");
  }

  // Portions needed for the group.
  function partyPortions(adults, kids, appetite) {
    const a = appetite || { adult: 1, kid: 0.6 };
    return Math.max(0, adults) * a.adult + Math.max(0, kids) * a.kid;
  }

  /*
   * Cheapest set of menu items that feeds the group, on one channel.
   * Works in twelfths of a portion (RES = 12) so thirds (3 tacos per adult) and quarters
   * both count exactly, and it can mix items (e.g. a family pack + one taco plate).
   * Uses "minimum cost to reach at least N" dynamic programming: for every portion amount,
   * remember the cheapest way to get there, building up one item at a time.
   * Returns null when the restaurant can't feed the group on this channel.
   */
  function cheapestOrder(restaurant, channel, portionsNeeded, dishTypes) {
    const need = Math.ceil(portionsNeeded * RES - 1e-9);
    if (need <= 0) return null;
    const options = [];
    for (const item of restaurant.items) {
      const price = itemPrice(item, channel);
      if (price === null) continue;
      const s = servesFor(item, dishTypes);
      const q = Math.round(s.serves * RES);
      if (q <= 0) continue;
      options.push({ item, price, q, serves: s });
    }
    if (!options.length) return null;
    const maxQ = Math.max(...options.map((o) => o.q));
    const limit = need + maxQ;
    const best = new Array(limit + 1).fill(Infinity);
    const pick = new Array(limit + 1).fill(-1);
    best[0] = 0;
    for (let s = 1; s <= limit; s++) {
      for (let i = 0; i < options.length; i++) {
        const o = options[i];
        if (o.q > s || best[s - o.q] === Infinity) continue;
        const c = best[s - o.q] + o.price;
        if (c < best[s] - 1e-9) {
          best[s] = c;
          pick[s] = i;
        }
      }
    }
    let bestS = -1;
    for (let s = need; s <= limit; s++) {
      if (best[s] === Infinity) continue;
      if (bestS === -1 || best[s] < best[bestS] - 1e-9) bestS = s;
    }
    if (bestS === -1) return null;
    const counts = new Map();
    for (let s = bestS; s > 0; s -= options[pick[s]].q) {
      const i = pick[s];
      counts.set(i, (counts.get(i) || 0) + 1);
    }
    const lines = [...counts.entries()]
      .map(([i, qty]) => ({
        itemId: options[i].item.id,
        name: options[i].item.name,
        qty,
        unitPrice: options[i].price,
        lineTotal: cents(options[i].price * qty),
        servesEach: options[i].serves
      }))
      .sort((a, b) => b.lineTotal - a.lineTotal);
    return { lines, subtotal: cents(best[bestS]), portions: Math.round((bestS / RES) * 100) / 100 };
  }

  // How sure we are about an order overall: the weakest source among its lines.
  function orderConfidence(lines) {
    const rank = { restaurant: 3, reports: 2, estimate: 1, none: 0 };
    let low = "restaurant";
    for (const l of lines) if (rank[l.servesEach.source] < rank[low]) low = l.servesEach.source;
    return low;
  }

  function budgetStatus(total, budget, stretch) {
    if (!budget || budget <= 0) return "fits";
    if (total <= budget + 1e-9) return "fits";
    if (total <= budget + (stretch == null ? 2 : stretch) + 1e-9) return "just-over";
    return "over";
  }

  /*
   * The main search. For each restaurant, find the cheapest order that feeds the group
   * on every allowed channel, price it all-in, and rank the results.
   * query: { adults, kids, budget, stretch, mode: "any"|"pickup"|"delivery", group, sort, tipPct }
   */
  function search(data, query) {
    const portions = partyPortions(query.adults || 0, query.kids || 0, data.appetite);
    const people = (query.adults || 0) + (query.kids || 0);
    const results = [];
    for (const r of data.restaurants) {
      if (query.group && query.group !== "all" && r.group !== query.group) continue;
      const options = [];
      for (const base of data.channels) {
        if (query.mode === "pickup" && base.kind !== "pickup") continue;
        if (query.mode === "delivery" && base.kind !== "delivery") continue;
        const ch = channelFor(r, base);
        if (!ch) continue;
        const order = cheapestOrder(r, ch, portions, data.dishTypes);
        if (!order) continue;
        const tip = ch.kind === "pickup" ? 0 : query.tipPct;
        const price = allInPrice(order.subtotal, ch, data.taxRate, tip);
        options.push({
          channelId: ch.id,
          channelLabel: ch.label,
          kind: ch.kind,
          order,
          price,
          perPerson: people ? cents(price.total / people) : price.total,
          confidence: orderConfidence(order.lines)
        });
      }
      if (!options.length) continue;
      options.sort((a, b) => a.price.total - b.price.total);
      const best = options[0];
      results.push({
        restaurant: r,
        best,
        options,
        status: budgetStatus(best.price.total, query.budget, query.stretch),
        value: valueScore(r.rating, best.perPerson)
      });
    }
    const order = { fits: 0, "just-over": 1, over: 2 };
    results.sort((a, b) => {
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      if (query.sort === "cheapest") return a.best.price.total - b.best.price.total;
      return b.value - a.value;
    });
    return { portions, people, results };
  }

  /*
   * "Best value": rating compared to price. Stars above 3 count (a 3-star place adds no value),
   * divided by the cost per person, times 10 to make a readable number. A higher score is better.
   */
  function valueScore(rating, perPerson) {
    if (!rating || !perPerson) return 0;
    return Math.round((Math.max(0, rating.stars - 3) / perPerson) * 1000) / 100;
  }

  /*
   * Compare one dish type across restaurants on one price channel.
   * Badge each item against the group's median price per portion: within 5% is "same".
   */
  function compareDish(data, dishType, priceKey) {
    const rows = [];
    for (const r of data.restaurants) {
      for (const item of r.items) {
        if (item.dishType !== dishType) continue;
        const price = item.prices && item.prices[priceKey];
        if (typeof price !== "number") continue;
        const s = servesFor(item, data.dishTypes);
        rows.push({
          restaurant: r,
          item,
          price,
          serves: s,
          perPortion: s.serves ? cents(price / s.serves) : null
        });
      }
    }
    const basis = rows.map((x) => (x.perPortion == null ? x.price : x.perPortion)).sort((a, b) => a - b);
    const mid = basis.length ? median(basis) : 0;
    for (const x of rows) {
      const v = x.perPortion == null ? x.price : x.perPortion;
      x.badge = !mid || Math.abs(v - mid) <= mid * 0.05 ? "same" : v < mid ? "cheaper" : "pricier";
    }
    rows.sort((a, b) => (a.perPortion ?? a.price) - (b.perPortion ?? b.price));
    return { median: cents(mid), rows };
  }

  function median(sorted) {
    const m = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
  }

  return {
    cents,
    fmtServes,
    channelFor,
    itemPrice,
    allInPrice,
    servesFor,
    partyPortions,
    cheapestOrder,
    orderConfidence,
    budgetStatus,
    valueScore,
    search,
    compareDish
  };
});
