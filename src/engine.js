/*
 * TrueTab engine: pure functions, no DOM. Runs in the browser (window.TrueTab)
 * and in Node (require). Every money value is rounded to cents.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TrueTab = api;
})(typeof self !== "undefined" ? self : this, function () {
  const cents = (n) => Math.round(n * 100) / 100;
  const RES = 12; // portion resolution: 1/12 of an adult portion

  // The channel settings for one restaurant, with that restaurant's overrides applied.
  function channelFor(restaurant, channel) {
    const override = (restaurant.channelFees && restaurant.channelFees[channel.id]) || {};
    if (override.available === false) return null;
    if (channel.requiresOptIn && override.available !== true) return null;
    if (channel.requiresApp) {
      const listed = (restaurant.onApps || []).includes(channel.id) ||
        restaurant.items.some((i) => typeof (i.prices || {})[channel.priceKey] === "number");
      if (!listed) return null;
    }
    return Object.assign({}, channel, override);
  }

  // Price of one item on one channel, or null if it isn't sold there.
  function itemPrice(item, channel) {
    const p = item.prices && item.prices[channel.priceKey];
    return typeof p === "number" ? p : null;
  }

  // What you actually pay: menu subtotal + delivery fee + service fee + small-order fee + tax + tip.
  // Assumptions (see docs/DATA.md): tax is on the food subtotal only; tip is a share of the subtotal.
  // extras (optional): { surchargePct, toGoFee, itemCount } for restaurant-level charges.
  function allInPrice(subtotal, channel, taxRate, tipPct, extras) {
    const x = extras || {};
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
    parts.cardSurcharge = cents(x.surchargePct ? subtotal * x.surchargePct : 0);
    parts.toGoFee = cents(x.toGoFee ? x.toGoFee * (x.itemCount || 0) : 0);
    parts.fees = cents(parts.deliveryFee + parts.serviceFee + parts.smallOrderFee + parts.cardSurcharge + parts.toGoFee);
    parts.total = cents(parts.subtotal + parts.fees + parts.tax + parts.tip);
    return parts;
  }

  // How many adult portions an item covers, and how sure we are.
  // Order of trust: restaurant says > customer reports > Nick's default for the dish type.
  function servesFor(item, dishTypes) {
    const base = baseServes(item, dishTypes);
    const m = item.servesMultiplier || 1;
    if (m === 1 || !base.serves) return base;
    return Object.assign({}, base, { serves: base.serves * m, label: `${m} orders: ${base.label.charAt(0).toLowerCase()}${base.label.slice(1)}` });
  }

  function baseServes(item, dishTypes) {
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
        servesEach: options[i].serves,
        deal: options[i].item.deal || null,
        estimated: !!options[i].item.estimatedPrice,
        promo: options[i].item.promo || (options[i].item.deal && options[i].item.deal.type === "bogo" ? "bogo" : null),
        promoWas: pairRegular(restaurant, options[i].item, channel),
        dishType: pairDishType(restaurant, options[i].item),
        baseItemId: options[i].item.baseItemId || options[i].item.id
      }))
      .sort((a, b) => b.lineTotal - a.lineTotal);
    return { lines, subtotal: cents(best[bestS]), portions: Math.round((bestS / RES) * 100) / 100 };
  }

  // For a restaurant's own two-for-one item (pairOf: the single item), the price of buying two singly.
  function pairRegular(restaurant, item, channel) {
    if (!item.pairOf) return null;
    const single = restaurant.items.find((i) => i.id === item.pairOf);
    const p = single ? itemPrice(single, channel) : null;
    return p === null ? null : cents(p * 2);
  }

  // Two-for-one items are compared with the single item's dish type (e.g. a regular entrée).
  function pairDishType(restaurant, item) {
    if (!item.pairOf) return item.dishType;
    const single = restaurant.items.find((i) => i.id === item.pairOf);
    return single ? single.dishType : item.dishType;
  }

  // How sure we are about an order overall: the weakest source among its lines.
  function orderConfidence(lines) {
    const rank = { restaurant: 3, kids: 3, reports: 2, estimate: 1, none: 0 };
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

  /* ---------- Time and deals ---------- */

  // "15:30" -> 930 minutes after midnight.
  function toMinutes(hhmm) {
    const [h, m] = String(hhmm).split(":").map(Number);
    return h * 60 + (m || 0);
  }

  // Deals running at this restaurant, on this channel, at this day and time.
  // when: { day: 0-6 (Sunday = 0), minutes: minutes after midnight }
  function activeDeals(data, restaurantId, channelId, when) {
    if (!data.deals || !when) return [];
    return data.deals.filter((d) => {
      if (d.restaurantId !== restaurantId) return false;
      if (d.expires && when.date && when.date > d.expires) return false;
      if (d.channels && !d.channels.includes(channelId)) return false;
      if (d.days && !d.days.includes(when.day)) return false;
      const start = d.start ? toMinutes(d.start) : 0;
      const end = d.end ? toMinutes(d.end) : 24 * 60;
      return when.minutes >= start && when.minutes < end;
    });
  }

  function dealMatchesItem(deal, item) {
    const a = deal.appliesTo || {};
    if (a.itemIds) return a.itemIds.includes(item.id);
    if (a.dishTypes) return a.dishTypes.includes(item.dishType);
    return false;
  }

  function dealPrice(deal, price) {
    if (deal.type === "price") return Math.min(price, deal.value);
    if (deal.type === "percent") return price * (1 - deal.value);
    if (deal.type === "amountOff") return Math.max(0, price - deal.value);
    return price;
  }

  // Copies of the items with item deals applied to this channel's price.
  // Each discounted copy remembers which deal it used.
  function itemsWithDeals(items, deals, priceKey) {
    const bogos = deals.filter((d) => d.type === "bogo");
    const itemDeals = deals.filter((d) => d.type !== "kids-free" && d.type !== "bogo");
    const priced = itemDeals.length ? priceItemDeals(items, itemDeals, priceKey) : items;
    if (!bogos.length) return priced;
    // Buy one, get one: add a "2 for the price of 1" version of each matching item.
    const extra = [];
    for (const item of priced) {
      const base = item.prices && item.prices[priceKey];
      if (typeof base !== "number" || item.kidsOnly) continue;
      const d = bogos.find((b) => dealMatchesItem(b, item));
      if (!d) continue;
      extra.push(Object.assign({}, item, {
        id: item.id + "--bogo",
        baseItemId: item.id,
        name: item.name + ", buy one get one",
        servesMultiplier: 2,
        prices: Object.assign({}, item.prices, { [priceKey]: base }),
        deal: { id: d.id, title: d.title, was: cents(base * 2), type: "bogo" }
      }));
    }
    return priced.concat(extra);
  }

  function priceItemDeals(items, itemDeals, priceKey) {
    return items.map((item) => {
      const base = item.prices && item.prices[priceKey];
      if (typeof base !== "number") return item;
      let best = base;
      let used = null;
      for (const d of itemDeals) {
        if (!dealMatchesItem(d, item)) continue;
        const p = dealPrice(d, base);
        if (p < best - 1e-9) { best = p; used = d; }
      }
      if (!used) return item;
      return Object.assign({}, item, {
        prices: Object.assign({}, item.prices, { [priceKey]: cents(best) }),
        deal: { id: used.id, title: used.title, was: base, type: used.type }
      });
    });
  }

  /* ---------- Hours, app prices, kids' meals ---------- */

  // Open at this day and time? Restaurants without hours on file count as open.
  function isOpen(restaurant, when) {
    if (!when || !restaurant.hours) return true;
    const spans = restaurant.hours[when.day];
    if (!spans) return true;
    return spans.some(([s, e]) => when.minutes >= toMinutes(s) && when.minutes < toMinutes(e));
  }

  // For apps with no collected prices: estimate each item as restaurant price x (1 + markup).
  function itemsForChannel(items, channel, markupPct) {
    if (!channel.estimateFromDirect) return items;
    return items.map((item) => {
      const p = item.prices || {};
      if (typeof p[channel.priceKey] === "number" || typeof p.direct !== "number") return item;
      return Object.assign({}, item, {
        prices: Object.assign({}, p, { [channel.priceKey]: cents(p.direct * (1 + markupPct)) }),
        estimatedPrice: true
      });
    });
  }

  /*
   * Cheapest way to feed the group, trying two plans and keeping the cheaper:
   * A) everyone eats from the regular menu; B) each kid gets the cheapest kids' meal
   * and the adults eat from the regular menu. Kids-only items never feed adults.
   */
  function bestOrder(restaurant, items, channel, adults, kids, appetite, dishTypes) {
    const adultItems = items.filter((i) => !i.kidsOnly);
    const kidItems = items.filter((i) => i.kidsOnly && itemPrice(i, channel) !== null);
    const forAdults = Object.assign({}, restaurant, { items: adultItems });
    const total = partyPortions(adults, kids, appetite);
    const a = total > 0 ? cheapestOrder(forAdults, channel, total, dishTypes) : null;
    let b = null;
    if (kids > 0 && kidItems.length) {
      const k = kidItems.slice().sort((x, y) => itemPrice(x, channel) - itemPrice(y, channel))[0];
      const adultPart = adults > 0
        ? cheapestOrder(forAdults, channel, adults * appetite.adult, dishTypes)
        : { lines: [], subtotal: 0, portions: 0 };
      if (adultPart) {
        const kp = itemPrice(k, channel);
        const line = {
          itemId: k.id, name: k.name, qty: kids, unitPrice: kp, lineTotal: cents(kp * kids),
          servesEach: { serves: appetite.kid, source: "kids", label: "Kids' meal, one per kid" },
          deal: k.deal || null, estimated: !!k.estimatedPrice
        };
        b = {
          lines: adultPart.lines.concat([line]),
          subtotal: cents(adultPart.subtotal + kp * kids),
          portions: Math.round((adultPart.portions + kids * appetite.kid) * 100) / 100
        };
      }
    }
    if (a && b) return b.subtotal < a.subtotal - 1e-9 ? b : a;
    return a || b;
  }

  /* ---------- Filters ---------- */

  // Items allowed by the diet filter: an item must carry every tag asked for.
  function dietItems(items, diet) {
    if (!diet || !diet.length) return items;
    return items.filter((i) => diet.every((t) => (i.tags || []).includes(t)));
  }

  function cuisineAllowed(restaurant, cuisines) {
    if (!cuisines) return true; // no filter set: show everything
    return (restaurant.cuisines || []).some((c) => cuisines.includes(c));
  }

  /*
   * The main search. For each restaurant, find the cheapest order that feeds the group
   * on every allowed channel, apply any deal running at that time, price it all-in, and rank.
   * query: { adults, kids, budget, budgetMin, stretch, mode, cuisines, diet, sort, tipPct, when }
   * mode: "any" | "takeout" (pickup or delivery) | "pickup" | "delivery" | "dine-in"
   */
  function search(data, query) {
    const adults = query.adults || 0;
    const kids = query.kids || 0;
    const appetite = data.appetite || { adult: 1, kid: 0.6 };
    const portions = partyPortions(adults, kids, appetite);
    const people = adults + kids;
    const results = [];
    let hiddenBelow = 0;
    const markupPct = typeof query.markupPct === "number" ? query.markupPct
      : typeof data.defaultMarkupPct === "number" ? data.defaultMarkupPct : 0.2;
    let closedNow = 0;
    // query.medians: typical prices from the full data, so a trimmed copy (one deal's items) is still compared with the whole area.
    const medians = query.medians || perPortionMedians(data);
    for (const r of data.restaurants) {
      if (!cuisineAllowed(r, query.cuisines)) continue;
      if (!isOpen(r, query.when)) { closedNow++; continue; }
      const allowedItems = dietItems(r.items, query.diet);
      const options = [];
      for (const base of data.channels) {
        const inMode = modeAllows(query.mode, base.kind);
        const ch = channelFor(r, base);
        if (!ch) continue;
        const chItems = itemsForChannel(allowedItems, ch, markupPct);
        const baseOrder = bestOrder(r, chItems, ch, adults, kids, appetite, data.dishTypes);
        if (!baseOrder) continue;
        const tip = ch.kind === "pickup" ? 0 : query.tipPct;
        const extrasFor = (order) => ({
          surchargePct: ch.priceKey === "direct" ? r.cardSurchargePct || 0 : 0,
          toGoFee: ch.kind === "pickup" || ch.id === "direct" ? r.toGoItemFee || 0 : 0,
          itemCount: order.lines.reduce((n, l) => n + l.qty, 0)
        });
        const basePrice = allInPrice(baseOrder.subtotal, ch, data.taxRate, tip, extrasFor(baseOrder));

        // Try again with any deals running right now.
        let order = baseOrder;
        let price = basePrice;
        let usedDeals = [];
        let freeKids = 0;
        const deals = activeDeals(data, r.id, ch.id, query.when);
        if (deals.length) {
          const kidsDeal = deals.find((d) => d.type === "kids-free");
          freeKids = kidsDeal && adults > 0 ? Math.min(kids, adults * (kidsDeal.perAdult || 1)) : 0;
          const dealItems = itemsWithDeals(chItems, deals, ch.priceKey);
          const dealOrder = bestOrder(r, dealItems, ch, adults, kids - freeKids, appetite, data.dishTypes);
          if (dealOrder) {
            const dealPrice = allInPrice(dealOrder.subtotal, ch, data.taxRate, tip, extrasFor(dealOrder));
            if (dealPrice.total < basePrice.total - 0.005) {
              order = dealOrder;
              price = dealPrice;
              const lineDeals = dealOrder.lines.filter((l) => l.deal).map((l) => l.deal.id);
              usedDeals = deals.filter((d) => lineDeals.includes(d.id) || (d === kidsDeal && freeKids > 0));
            } else {
              freeKids = 0;
            }
          } else {
            freeKids = 0;
          }
        }
        options.push({
          inMode,
          normalTotal: basePrice.total,
          channelId: ch.id,
          channelLabel: ch.label,
          kind: ch.kind,
          order,
          price,
          perPerson: people ? cents(price.total / people) : price.total,
          confidence: orderConfidence(order.lines),
          deals: usedDeals.map((d) => ({ id: d.id, title: d.title, note: d.note || null, type: d.type, channels: d.channels || null })),
          bogo: order.lines.some((l) => l.promo === "bogo"),
          freeKids,
          savings: cents(basePrice.total - price.total),
          estimated: order.lines.some((l) => l.estimated),
          markupPct: ch.estimateFromDirect ? markupPct : null
        });
      }
      const allOptions = options.slice();
      const shown = options.filter((o) => o.inMode).sort((a, b) => a.price.total - b.price.total);
      if (!shown.length) continue;
      for (const o of allOptions) o.check = dealCheck(o, allOptions, r, medians, data);
      const best = shown[0];
      if (query.dealsOnly && !best.deals.length && !best.bogo) continue;
      if (query.budgetMin && best.price.total < query.budgetMin - 1e-9) {
        hiddenBelow++;
        continue;
      }
      results.push({
        restaurant: r,
        best,
        options: shown,
        status: budgetStatus(best.price.total, query.budget, query.stretch),
        value: valueScore(r.rating, best.perPerson)
      });
    }
    const order = { fits: 0, "just-over": 1, over: 2 };
    results.sort((a, b) => {
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      if (query.sort === "cheapest" || a.value == null || b.value == null) return a.best.price.total - b.best.price.total;
      return b.value - a.value;
    });
    return { portions, people, results, hiddenBelow, closedNow };
  }

  /* ---------- Is the deal actually a value? ---------- */

  // Typical restaurant price per adult portion for each dish type (median across the data).
  function perPortionMedians(data) {
    const byType = {};
    for (const r of data.restaurants) {
      for (const item of r.items) {
        if (item.kidsOnly || typeof (item.prices || {}).direct !== "number") continue;
        const s = servesFor(item, data.dishTypes);
        if (!s.serves) continue;
        (byType[item.dishType] = byType[item.dishType] || []).push(item.prices.direct / s.serves);
      }
    }
    const out = {};
    for (const [t, list] of Object.entries(byType)) {
      if (list.length < 2) continue; // need at least two to call anything "typical"
      list.sort((a, b) => a - b);
      out[t] = { median: cents(median(list)), count: list.length };
    }
    return out;
  }

  function daysBetween(a, b) {
    return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);
  }

  /*
   * For an option that uses a deal (or a restaurant's own two-for-one item), answer:
   * 1) How much does it save versus the same order without the deal?
   * 2) Is any way of ordering WITHOUT a deal cheaper (e.g. plain pickup beats an app BOGO)?
   * 3) Even at the deal price, is the dish cheaper or pricier than similar dishes nearby?
   * 4) Did the regular price go up in the 60 days before the deal started?
   * Verdict: "real" (saves 10%+ with no warning signs), "small", or "not-worth-it".
   */
  function dealCheck(opt, allOptions, restaurant, medians, data) {
    const promoSaving = opt.order.lines.reduce(
      (n, l) => n + (l.promoWas ? Math.max(0, l.promoWas * l.qty - l.lineTotal) : 0), 0);
    if (!opt.deals.length && promoSaving <= 0.005) return null;
    const saving = cents(opt.savings + promoSaving);
    const before = opt.price.total + saving;
    const pct = before > 0 ? saving / before : 0;

    const noDeal = allOptions.slice().sort((a, b) => a.normalTotal - b.normalTotal)[0];
    const vsNoDeal = cents(noDeal.normalTotal - opt.price.total); // negative: plain ordering is cheaper

    const nearby = [];
    for (const l of opt.order.lines) {
      if (!l.deal && !l.promoWas) continue;
      const m = medians[l.dishType];
      if (!m || !l.servesEach.serves) continue;
      const per = cents(l.unitPrice / l.servesEach.serves);
      const status = per < m.median * 0.95 ? "cheaper" : per > m.median * 1.05 ? "pricier" : "same";
      nearby.push({ name: l.name, perPortion: per, median: m.median, count: m.count, status });
    }

    const raised = [];
    for (const l of opt.order.lines) {
      if (!l.deal) continue;
      const deal = (data.deals || []).find((d) => d.id === l.deal.id);
      const start = deal && (deal.starts || deal.verified);
      const item = restaurant.items.find((i) => i.id === l.baseItemId);
      if (!start || !item || !item.history || typeof (item.prices || {}).direct !== "number") continue;
      const now = item.prices.direct;
      const earlier = item.history
        .filter((h) => typeof h.direct === "number" && h.direct < now - 0.005)
        .filter((h) => { const d = daysBetween(h.date, start); return d >= 0 && d <= 60; })
        .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
      if (earlier) raised.push({ name: item.name, from: earlier.direct, to: now, date: earlier.date });
    }

    let verdict;
    if (vsNoDeal < -0.005 || saving <= 0.005) verdict = "not-worth-it";
    else {
      verdict = pct >= 0.1 ? "real" : "small";
      if (verdict === "real" && (nearby.some((n) => n.status === "pricier") || raised.length)) verdict = "small";
    }
    return {
      verdict,
      saving,
      pct: Math.round(pct * 1000) / 10,
      vsNoDeal,
      noDealLabel: noDeal.channelLabel,
      noDealSameChannel: noDeal.channelId === opt.channelId,
      nearby,
      raised
    };
  }

  function modeAllows(mode, kind) {
    if (!mode || mode === "any") return true;
    if (mode === "takeout") return kind === "pickup" || kind === "delivery";
    return mode === kind;
  }

  /*
   * "Best value": rating compared to price. Stars above 3 count (a 3-star place adds no value),
   * divided by the cost per person, times 10 to make a readable number. A higher score is better.
   */
  function valueScore(rating, perPerson) {
    if (!rating || typeof rating.stars !== "number") return null;
    if (!perPerson) return 0;
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
    toMinutes,
    isOpen,
    itemsForChannel,
    bestOrder,
    activeDeals,
    itemsWithDeals,
    dietItems,
    cuisineAllowed,
    search,
    dealCheck,
    perPortionMedians,
    compareDish
  };
});
