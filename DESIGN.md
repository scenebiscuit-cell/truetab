# TrueTab design

TrueTab has its own look, **the guest check**: the green diner order pad a server writes your tab on. It is deliberately different from Nick's other sites (which use the Nick Lax 2026 Design System). Tokens live at the top of `src/styles.css`; the guest-check pieces are in its "Guest check look" section.

## Look

- Pale check-green `paper`, deep green `ink`, bottle-green `accent` for links, selected tabs and focus.
- Carbon red `stamp` for what a server writes in red: check numbers, totals, the selected page tab and the pen underline in the hero ("actually").
- Archivo (condensed via its width axis) for headings, the brand and page tabs; Public Sans for reading; Courier Prime for prices, totals, table numbers and stamp-like labels.
- Each result card is a guest check: a header strip "Guest check · No. N" (N = its place in the list), ruled order lines, a "Total" double rule above the est. total in `stamp` red, and a torn bottom edge.
- Tags look like rubber stamps (outlined, Courier caps). "Top pick" is the one tilted red stamp; it's the one bold element on the page.
- Tabs inside a view are tear-off tickets: dashed outline, solid `accent` outline and `accent-soft` fill when selected.
- Square-ish corners (2–4px): paper, not app chrome. No glass or blur.
- Dark theme: the same check under late-night diner lights (deep green paper, light green ink, coral `stamp`).
- No small label above a heading. The heading carries itself; "Top pick" is a tag, not a kicker.

## Layout

- Show one thing at a time. The home page uses tabs: page tabs (Feed my group, Compare a dish, How it works) are condensed caps underlined in `stamp`; tabs inside a view (search settings, How it works topics, each result card's details) are tickets, selected = `accent-soft` with a solid `accent` border. Every tab is at least 44px tall and works with Left/Right/Home/End.
- Settings hidden in another tab are always summarized in one visible line ("Search settings: ...").
- Each result card always shows its name, tags, estimated total and cheapest way to order; the order, price breakdown, ways to order, deal check and reviews are its tabs.

## Meaning

- Budget tags: `success` Fits budget, `warning` Just over, `danger` Over budget. Always a word, never color alone.
- Dish badges: Cheaper (`success`), About the same (neutral), Pricier (`danger`).
- Estimated portions are marked with "~" and the words "Estimated ... (typical for this dish)".
- Big prices always start with "est."

## Copy

- Plain and specific. "What does your budget actually get you?" Sentence case everywhere.
- Say "sample" on every invented restaurant name and in the notice until real data replaces it.
