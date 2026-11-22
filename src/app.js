/* Menu Math page script: the only file that touches the page. Math lives in engine.js. */
(function () {
  const data = window.MENU_DATA;
  const M = window.MenuMath;
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
    try { localStorage.setItem("menu-math-theme", next); } catch (e) {}
    syncThemeButton();
  });
  syncThemeButton();

  /* ---------- Tabs ---------- */
  const tabs = [
    { tab: $("tab-feed"), view: $("view-feed") },
    { tab: $("tab-dish"), view: $("view-dish") }
  ];
  function selectTab(i, focus) {
    tabs.forEach((t, j) => {
      const on = i === j;
      t.tab.setAttribute("aria-selected", String(on));
      t.tab.tabIndex = on ? 0 : -1;
      t.view.hidden = !on;
    });
    if (focus) tabs[i].tab.focus();
  }
  tabs.forEach((t, i) => {
    t.tab.addEventListener("click", () => selectTab(i));
    t.tab.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        selectTab((i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length, true);
      }
    });
  });
  selectTab(0);

  /* ---------- Feed my group ---------- */
  const groupSelect = $("group");
  groupSelect.append(el("option", { value: "all" }, "Everything"));
  for (const [id, label] of Object.entries(data.groups)) groupSelect.append(el("option", { value: id }, label));

  function readQuery() {
    const num = (id, fallback) => {
      const v = parseFloat($(id).value);
      return Number.isFinite(v) && v >= 0 ? v : fallback;
    };
    return {
      budget: num("budget", 0),
      adults: Math.floor(num("adults", 0)),
      kids: Math.floor(num("kids", 0)),
      mode: $("mode").value,
      group: $("group").value,
      sort: $("sort").value,
      tipPct: parseFloat($("tip").value)
    };
  }

  function renderFeed() {
    const q = readQuery();
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
    summary.replaceChildren(
      "Feeding ", el("strong", {}, who), ` (${fmt(out.portions)} adult portions). `,
      ...(q.budget > 0
        ? [el("strong", {}, `${fits} of ${out.results.length}`), ` spots fit ${money(q.budget)} all-in.`]
        : [`${out.results.length} spots, no budget set.`])
    );
    if (!out.results.length) {
      box.append(el("div", { class: "empty" }, el("p", {}, "Nothing matches. Try another food type or allow delivery.")));
      return;
    }
    out.results.forEach((r, i) => box.append(card(r, out, q, i === 0 && r.status === "fits")));
  }

  function card(r, out, q, topPick) {
    const b = r.best;
    const st = STATUS[r.status];
    const rating = r.restaurant.rating;
    const lines = el("ul", { class: "lines", "aria-label": "Order" },
      b.order.lines.map((l) =>
        el("li", {},
          el("span", {}, `${l.qty} × ${l.name}`),
          el("span", { class: "num" }, money(l.lineTotal)),
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
      ["Tax", p.tax],
      p.tip ? ["Tip", p.tip] : null
    ].filter(Boolean);
    const breakdown = el("details", {},
      el("summary", {}, "Price breakdown"),
      el("table", { class: "breakdown" },
        el("tbody", {},
          rows.map(([k, v]) => el("tr", {}, el("td", {}, k), el("td", {}, money(v)))),
          el("tr", { class: "total" }, el("td", {}, "Estimated total"), el("td", {}, money(p.total)))
        )
      )
    );
    const channels = el("details", {},
      el("summary", {}, `Compare ${r.options.length} way${r.options.length === 1 ? "" : "s"} to order`),
      el("table", { class: "channels" },
        el("thead", {}, el("tr", {}, el("th", { scope: "col" }, "Option"), el("th", { scope: "col" }, "Est. all-in"))),
        el("tbody", {},
          r.options.map((o, i) =>
            el("tr", { class: i === 0 ? "cheapest" : null },
              el("td", {}, o.channelLabel + (i === 0 ? " (cheapest)" : "")),
              el("td", {}, money(o.price.total)))
          )
        )
      )
    );
    const extra = b.order.portions - out.portions;
    return el("article", { class: "card" + (topPick ? " top-pick" : "") },
      el("div", { class: "card-head" },
        el("div", {},
          topPick ? el("p", { class: "label" }, "Top pick") : null,
          el("h3", {}, r.restaurant.name),
          el("p", { class: "meta" },
            `${r.restaurant.neighborhood} · ${rating.stars.toFixed(1)} stars (${rating.count.toLocaleString()} ${rating.source} ratings)`)
        ),
        el("span", { class: `tag ${st.cls}` }, st.text)
      ),
      el("div", { class: "price-row" },
        el("span", { class: "price" }, "est. " + money(p.total)),
        el("span", { class: "price-note" }, `${money(b.perPerson)} per person`)
      ),
      el("p", { class: "via" }, "Cheapest via ", el("strong", {}, b.channelLabel),
        `. Feeds ${fmt(b.order.portions)} portions` + (extra > 0.05 ? ` (${fmt(extra)} extra).` : ".")),
      lines,
      el("p", { class: "meta" }, CONFIDENCE[b.confidence] || ""),
      breakdown,
      r.options.length > 1 ? channels : null
    );
  }

  function fmt(n) {
    const r = Math.round(n * 10) / 10;
    return Number.isInteger(r) ? String(r) : r.toFixed(1);
  }

  $("feed-form").addEventListener("input", renderFeed);
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
    if (c.priceKey !== "direct") priceOn.append(el("option", { value: c.priceKey }, c.label));
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
