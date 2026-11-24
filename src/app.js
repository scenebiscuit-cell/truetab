/* TrueTab page script: the only file that touches the page. Math lives in engine.js. */
(function () {
  const data = window.MENU_DATA;
  const M = window.TrueTab;
  const $ = (id) => document.getElementById(id);
  const money = (n) => "$" + n.toFixed(2);

  // Build an element safely (text is always set as text, never as HTML).
  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") node.className = v;
      else node.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) {
      if (c === null || c === undefined || c === false) continue;
      node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return node;
  }

  const STATUS = {
    fits: { text: "Fits budget", cls: "tag-fits" },
    "just-over": { text: "Just over", cls: "tag-just-over" },
    over: { text: "Over budget", cls: "tag-over" }
  };
  const CONFIDENCE = {
    restaurant: "Portions stated by the restaurant",
    reports: "Portions from customer reports",
    estimate: "Some portions estimated"
  };

  /* ---------- Theme ---------- */
  const themeBtn = $("theme-toggle");
  function syncThemeButton() {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    themeBtn.textContent = dark ? "Light theme" : "Dark theme";
    themeBtn.setAttribute("aria-pressed", String(dark));
  }
  themeBtn.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("truetab-theme", next); } catch (e) {}
    syncThemeButton();
  });
  syncThemeButton();

  /* ---------- Tabs (page, search settings, How it works, each result card) ---------- */
  // Click, or Left/Right/Home/End on a focused tab, shows its panel. Returns select(i).
  function wireTabs(tabEls, panelEls, onSelect) {
    function select(i, focus) {
      tabEls.forEach((t, j) => {
        const on = i === j;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        panelEls[j].hidden = !on;
      });
      if (focus) tabEls[i].focus();
      if (onSelect) onSelect(i);
    }
    tabEls.forEach((t, i) => {
      t.addEventListener("click", () => select(i));
      t.addEventListener("keydown", (e) => {
        const n = tabEls.length;
        const to = { ArrowRight: (i + 1) % n, ArrowLeft: (i + n - 1) % n, Home: 0, End: n - 1 }[e.key];
        if (to === undefined) return;
        e.preventDefault();
        select(to, true);
      });
    });
    select(Math.max(0, tabEls.findIndex((t) => t.getAttribute("aria-selected") === "true")));
    return select;
  }
  // A tablist already in the page: its tabs name their panels with aria-controls.
  function wireStaticTabs(list) {
    const tabEls = [...list.querySelectorAll('[role="tab"]')];
    return wireTabs(tabEls, tabEls.map((t) => $(t.getAttribute("aria-controls"))));
  }
  const showView = wireStaticTabs(document.querySelector('.tabs[role="tablist"]'));
  document.querySelectorAll('.subtabs[role="tablist"]').forEach(wireStaticTabs);
  $("notice-how").addEventListener("click", (e) => {
    e.preventDefault();
    showView(2, true);
  });

  /* ---------- Feed my group ---------- */
  const hasRatings = data.restaurants.some((r) => r.rating && typeof r.rating.stars === "number");
  if (!hasRatings) {
    const sortSel = $("sort");
    sortSel.querySelector('option[value="value"]').remove();
    sortSel.value = "cheapest";
    sortSel.closest(".field").append(el("p", { class: "help" }, "Best value returns once ratings are added."));
  }
  /* Cuisine and diet checkboxes. Hidden cuisines are remembered on this device. */
  const CUISINE_KEY = "truetab-hidden-cuisines";
  const allCuisines = [...new Set(data.restaurants.flatMap((r) => r.cuisines || []))].sort();
  let hiddenCuisines = [];
  try { hiddenCuisines = JSON.parse(localStorage.getItem(CUISINE_KEY) || "[]"); } catch (e) { hiddenCuisines = []; }

  function checkbox(name, value, label, checked) {
    return el("label", {}, el("input", { type: "checkbox", name, value, checked: checked ? true : null }), label);
  }
  const cuisineList = $("cuisine-list");
  for (const c of allCuisines) cuisineList.append(checkbox("cuisine", c, c, !hiddenCuisines.includes(c)));
  const dietList = $("diet-list");
  for (const [id, label] of Object.entries(data.dietTags || {})) dietList.append(checkbox("diet", id, label, false));

  function saveHidden() {
    const hidden = [...cuisineList.querySelectorAll("input")].filter((i) => !i.checked).map((i) => i.value);
    try { localStorage.setItem(CUISINE_KEY, JSON.stringify(hidden)); } catch (e) {}
  }
  function setAllCuisines(on) {
    cuisineList.querySelectorAll("input").forEach((i) => (i.checked = on));
    saveHidden();
    renderFeed();
  }
  $("cuisine-all").addEventListener("click", () => setAllCuisines(true));
  $("cuisine-none").addEventListener("click", () => setAllCuisines(false));

  /* When: "Right now" uses the visitor's clock; a chosen day shows a time box. */
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  function readWhen() {
    const day = $("when-day").value;
    const timeField = $("when-time-field");
    if (day === "now") {
      timeField.hidden = true;
      const d = new Date();
      $("when-help").textContent = `Deals running now (${DAYS[d.getDay()]} ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}) are included.`;
      return { day: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes(), date: isoDate(d) };
    }
    timeField.hidden = false;
    $("when-help").textContent = "Deals running then are included.";
    const t = $("when-time").value || "18:00";
    // The next date that falls on the chosen day, so deals past their end date drop off.
    const next = new Date();
    next.setDate(next.getDate() + ((Number(day) - next.getDay() + 7) % 7));
    return { day: Number(day), minutes: M.toMinutes(t), date: isoDate(next) };
  }
  function isoDate(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function readQuery() {
    const num = (id, fallback) => {
      const v = parseFloat($(id).value);
      return Number.isFinite(v) && v >= 0 ? v : fallback;
    };
    const checked = (list) => [...list.querySelectorAll("input:checked")].map((i) => i.value);
    return {
      budgetMin: num("budget-min", 0),
      budget: num("budget", 0),
      adults: Math.floor(num("adults", 0)),
      kids: Math.floor(num("kids", 0)),
      mode: $("mode").value,
      cuisines: checked(cuisineList),
      diet: checked(dietList),
      sort: $("sort").value,
      tipPct: parseFloat($("tip").value),
      markupPct: parseFloat($("markup").value),
      dealsOnly: $("deals-only").checked,
      when: readWhen()
    };
  }

  // One line that always shows the settings tucked away in the other search tabs.
  function settingsLine(q) {
    const label = (id) => $(id).selectedOptions[0].textContent.replace(/\s*\(.*\)$/, "");
    const parts = [label("mode"), $("when-day").value === "now" ? "right now" : `${DAYS[q.when.day]} at ${clock(q.when.minutes)}`];
    if (q.cuisines.length < allCuisines.length) parts.push(`${q.cuisines.length} of ${allCuisines.length} cuisines`);
    if (q.diet.length) parts.push(q.diet.map((d) => data.dietTags[d].toLowerCase()).join(" and ") + " only");
    if (q.dealsOnly) parts.push("deals only");
    parts.push(q.tipPct ? `tip ${label("tip")}` : "no tip", `app markup ${label("markup")}`);
    $("settings-line").replaceChildren(el("strong", {}, "Search settings: "), parts.join(" · "));
  }
  function clock(minutes) {
    const h = Math.floor(minutes / 60);
    const m = String(minutes % 60).padStart(2, "0");
    return `${h % 12 || 12}:${m} ${h < 12 ? "am" : "pm"}`;
  }

  function renderFeed() {
    const q = readQuery();
    settingsLine(q);
    const box = $("results");
    box.replaceChildren();
    if (q.adults + q.kids === 0) {
      $("feed-summary").textContent = "";
      box.append(el("div", { class: "empty" }, el("p", {}, "Add at least one adult or kid to see what fits.")));
      return;
    }
    const out = M.search(data, q);
    const fits = out.results.filter((r) => r.status === "fits").length;
    const who = [q.adults && `${q.adults} adult${q.adults === 1 ? "" : "s"}`, q.kids && `${q.kids} kid${q.kids === 1 ? "" : "s"}`]
      .filter(Boolean).join(" and ");
    const summary = $("feed-summary");
    const range = q.budgetMin > 0 && q.budget > 0 ? `${money(q.budgetMin)}–${money(q.budget)}`
      : q.budget > 0 ? `${money(q.budget)}` : null;
    summary.replaceChildren(
      "Feeding ", el("strong", {}, who), ` (${fmt(out.portions)} adult portions). `,
      ...(range
        ? [el("strong", {}, `${fits} of ${out.results.length}`), ` spots fit ${range} all-in.`]
        : [`${out.results.length} spots.`]),
      out.hiddenBelow ? ` ${out.hiddenBelow} cheaper spot${out.hiddenBelow === 1 ? "" : "s"} hidden by your minimum.` : "",
      out.closedNow ? ` ${out.closedNow} closed then.` : "",
      (() => {
        const n = out.results.filter((x) => x.best.bogo).length;
        return n ? el("strong", { class: "bogo-count" }, ` ${n} with buy-one-get-one.`) : "";
      })()
    );
    if (!out.results.length) {
      const why = q.cuisines.length === 0 ? "No cuisines are selected."
        : q.dealsOnly ? "No deals or buy-one-get-one offers match right now." : "Nothing matches.";
      box.append(el("div", { class: "empty" }, el("p", {}, `${why} Try more cuisines, a different diet setting, or another way to eat.`)));
      return;
    }
    out.results.forEach((r, i) => box.append(card(r, out, q, i === 0 && r.status === "fits", i)));
  }

  function card(r, out, q, topPick, n) {
    const b = r.best;
    const st = STATUS[r.status];
    const rating = r.restaurant.rating;
    const lines = el("ul", { class: "lines", "aria-label": "Order" },
      b.order.lines.map((l) =>
        el("li", {},
          el("span", {}, `${l.qty} × ${l.name}`),
          el("span", { class: "num" },
            l.deal ? el("span", { class: "was" }, money(l.deal.was * l.qty))
              : l.promoWas ? el("span", { class: "was" }, money(l.promoWas * l.qty)) : null,
            (l.estimated ? "est. " : "") + money(l.lineTotal)),
          el("span", { class: `src src-${l.servesEach.source}` }, l.servesEach.label)
        )
      )
    );
    const p = b.price;
    const rows = [
      ["Food", p.subtotal],
      p.deliveryFee ? ["Delivery fee", p.deliveryFee] : null,
      p.serviceFee ? ["Service fee", p.serviceFee] : null,
      p.smallOrderFee ? ["Small-order fee", p.smallOrderFee] : null,
      p.cardSurcharge ? ["Card surcharge (restaurant's)", p.cardSurcharge] : null,
      p.toGoFee ? ["To-go container fee (restaurant's)", p.toGoFee] : null,
      ["Tax", p.tax],
      p.tip ? ["Tip", p.tip] : null
    ].filter(Boolean);
    const breakdown = [
      el("table", { class: "breakdown" },
        el("tbody", {},
          rows.map(([k, v]) => el("tr", {}, el("td", {}, k), el("td", {}, money(v)))),
          el("tr", { class: "total" }, el("td", {}, "Estimated total"), el("td", {}, money(p.total)))
        )
      ),
      b.estimated
        ? el("p", { class: "help" }, `${b.channelLabel} menu prices are estimated at ${Math.round(b.markupPct * 100)}% above the restaurant's own prices. Fees are typical values, not a quote.`)
        : null
    ];
    const channels = el("table", { class: "channels" },
      el("thead", {}, el("tr", {}, el("th", { scope: "col" }, "Option"), el("th", { scope: "col" }, "Est. all-in"))),
      el("tbody", {},
        r.options.map((o, i) =>
          el("tr", { class: i === 0 ? "cheapest" : null },
            el("td", {}, o.channelLabel + (o.estimated ? " (estimated)" : "")
              + (o.check ? ` (deal: ${VERDICT[o.check.verdict][0].toLowerCase()})` : "") + (i === 0 ? " (cheapest)" : "")),
            el("td", {}, money(o.price.total)))
        )
      )
    );

    // Details live in tabs; only the ones that have something to show are added.
    const sections = [
      ["order", "Order", [lines, el("p", { class: "meta" }, CONFIDENCE[b.confidence] || "")]],
      ["price", "Price breakdown", breakdown],
      r.options.length > 1 ? ["ways", "Ways to order", [channels]] : null,
      b.check ? ["deal", "Deal check", [dealBlock(b)]] : null,
      ["reviews", "Reviews", [reviewLinks(r.restaurant), sourceLine(r.restaurant)]]
    ].filter(Boolean);
    const id = (key, part) => `r${n}-${part}-${key}`;
    const tabEls = sections.map(([key, label], i) =>
      el("button", { type: "button", class: "subtab", role: "tab", id: id(key, "tab"), "aria-controls": id(key, "panel"),
        "aria-selected": String(i === 0) }, label));
    const panelEls = sections.map(([key, , body]) =>
      el("div", { class: "subpanel card-panel", role: "tabpanel", id: id(key, "panel"), "aria-labelledby": id(key, "tab"), tabindex: "0" }, body));
    wireTabs(tabEls, panelEls);

    const extra = b.order.portions - out.portions;
    const verdict = b.check ? VERDICT[b.check.verdict] : null;
    return el("article", { class: "card" + (topPick ? " top-pick" : "") },
      el("div", { class: "card-head" },
        el("div", {},
          el("h3", {}, r.restaurant.name),
          el("p", { class: "meta" },
            r.restaurant.neighborhood,
            rating && typeof rating.stars === "number"
              ? ` · ${rating.stars.toFixed(1)} stars (${rating.count.toLocaleString()} ${rating.source} ratings)` : "",
            r.restaurant.address ? el("span", { class: "addr" }, r.restaurant.address) : null)
        ),
        el("div", { class: "tags" },
          topPick ? el("span", { class: "tag tag-top" }, "Top pick") : null,
          el("span", { class: `tag ${st.cls}` }, st.text),
          b.bogo ? el("span", { class: "tag tag-bogo" }, "BOGO") : null,
          verdict ? el("span", { class: `tag ${verdict[1]}` }, verdict[0]) : null)
      ),
      el("div", { class: "price-row" },
        el("span", { class: "price" }, "est. " + money(p.total)),
        out.people > 1 ? el("span", { class: "price-note" }, `${money(b.perPerson)} per person`) : null
      ),
      el("p", { class: "via" }, "Cheapest way: ", el("strong", {}, b.channelLabel),
        b.freeKids
          ? `. Buys ${fmt(b.order.portions)} adult portions; ${b.freeKids} kids' meal${b.freeKids === 1 ? " is" : "s are"} free.`
          : `. Feeds ${portionWord(b.order.portions)}` + (extra > 0.05 ? ` (${fmt(extra)} extra).` : ".")),
      el("div", { class: "card-tabs" },
        el("div", { class: "subtabs subtabs-card", role: "tablist", "aria-label": `${r.restaurant.name} details` }, tabEls),
        panelEls)
    );
  }

  /* ---------- Is the deal actually a value? ---------- */
  const VERDICT = {
    real: ["Real deal", "tag-fits"],
    small: ["Small saving", "tag-just-over"],
    "not-worth-it": ["Not worth it", "tag-over"]
  };

  function dealBlock(b) {
    const c = b.check;
    if (!c) return null;
    const [label, cls] = VERDICT[c.verdict];
    const what = b.deals.length
      ? b.deals.map((d) => d.title).join(" · ") + (b.freeKids ? ` (${b.freeKids} kid${b.freeKids === 1 ? "" : "s"} free)` : "")
      : "Buy one, get one on the restaurant's own menu";
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
    const notes = b.deals.filter((d) => d.note).map((d) => d.note);
    return el("div", { class: "deal" },
      el("div", { class: "deal-head" },
        el("span", { class: `tag ${cls}` }, label),
        el("strong", {}, what)),
      el("ul", { class: "deal-reasons" }, reasons.map((t) => el("li", {}, t))),
      notes.length ? el("p", { class: "deal-note" }, notes.join(" ")) : null);
  }

  /* Reviews side by side: links to each site's page for this restaurant (no ratings are stored). */
  function reviewLinks(rest) {
    if (!rest.address) return null;
    const q = encodeURIComponent(`${rest.name.replace(/\s*\(.*?\)\s*/g, " ").trim()} ${rest.address}`);
    const sites = [
      ["Google", `https://www.google.com/maps/search/?api=1&query=${q}`],
      ["Yelp", `https://www.yelp.com/search?find_desc=${encodeURIComponent(rest.name)}&find_loc=${encodeURIComponent(rest.address)}`],
      ["Tripadvisor", `https://www.tripadvisor.com/Search?q=${q}`]
    ];
    return el("div", { class: "reviews" },
      el("span", { class: "label", style: "margin:0" }, "Reviews"),
      el("div", { class: "review-row" },
        sites.map(([name, url]) => el("a", { class: "review-link", href: url, target: "_blank", rel: "noopener" }, name))));
  }

  /* Where the prices came from and when. */
  function sourceLine(rest) {
    const src = rest.sources && (rest.sources.website || rest.sources.toast);
    if (!src) return null;
    const host = rest.sources.website ? "restaurant's website" : "restaurant's Toast ordering page";
    return el("p", { class: "meta" }, "Prices from the ", el("a", { href: src, target: "_blank", rel: "noopener" }, host),
      rest.lastChecked ? `, checked ${rest.lastChecked}.` : ".");
  }

  function portionWord(n) {
    return `${fmt(n)} portion${fmt(n) === "1" ? "" : "s"}`;
  }

  function fmt(n) {
    const r = Math.round(n * 10) / 10;
    return Number.isInteger(r) ? String(r) : r.toFixed(1);
  }

  $("feed-form").addEventListener("input", (e) => {
    if (e.target.name === "cuisine") saveHidden();
    renderFeed();
  });
  $("feed-form").addEventListener("submit", (e) => e.preventDefault());
  renderFeed();

  /* ---------- Compare a dish ---------- */
  const dishSelect = $("dish");
  const usedTypes = new Set(data.restaurants.flatMap((r) => r.items.map((i) => i.dishType)));
  for (const [id, t] of Object.entries(data.dishTypes)) {
    if (usedTypes.has(id)) dishSelect.append(el("option", { value: id }, t.label));
  }
  const priceOn = $("price-on");
  priceOn.append(el("option", { value: "direct" }, "Restaurant"));
  for (const c of data.channels) {
    const collected = data.restaurants.some((r) => r.items.some((i) => typeof (i.prices || {})[c.priceKey] === "number"));
    if (c.priceKey !== "direct" && collected) priceOn.append(el("option", { value: c.priceKey }, c.label));
  }

  function renderDish() {
    const out = M.compareDish(data, dishSelect.value, priceOn.value);
    const body = $("dish-table").querySelector("tbody");
    body.replaceChildren();
    const label = data.dishTypes[dishSelect.value].label.toLowerCase();
    $("dish-summary").textContent = out.rows.length
      ? `${out.rows.length} places sell a ${label}. Typical price: ${money(out.median)} per portion. Menu price only, before fees.`
      : `No one in the sample sells a ${label} on this channel.`;
    const BADGE = { cheaper: "Cheaper", same: "About the same", pricier: "Pricier" };
    for (const row of out.rows) {
      body.append(
        el("tr", {},
          el("td", {}, row.item.name, el("span", { class: "sub" }, `${row.restaurant.name} · ${row.restaurant.neighborhood}`)),
          el("td", { class: "num" }, money(row.price)),
          el("td", { class: "num" }, row.perPortion == null ? "n/a" : money(row.perPortion)),
          el("td", {}, row.serves.label),
          el("td", {}, el("span", { class: `tag tag-${row.badge}` }, BADGE[row.badge]))
        )
      );
    }
  }
  $("dish-form").addEventListener("input", renderDish);
  $("dish-form").addEventListener("submit", (e) => e.preventDefault());
  renderDish();
})();
