# TrueTab design

Built on the **Nick Lax 2026 Design System** (https://claude.ai/artifact/GrBtg5MmceuznbkvGEpSmN). Its tokens are copied into the top of `src/styles.css`. If this file and the system disagree, this file wins for TrueTab.

## Look

- Eggshell `paper` page, near-black `ink`, one ballpoint-blue `accent` for links, selected tabs and focus.
- Bricolage Grotesque for headings and big prices, IBM Plex Sans for reading, IBM Plex Mono for labels, tags and numbers in tables.
- One highlighter-yellow `marker` wipe in the hero headline ("actually").
- The top pick gets the hard `shadow-print` offset; it's the one bold element on the page.
- No small label above a heading. The heading carries itself; "Top pick" is a tag, not a kicker.

## Layout

- Show one thing at a time. The home page uses tabs: page tabs (Feed my group, Compare a dish, How it works) are underlined in `accent`; tabs inside a view (search settings, How it works topics, each result card's details) are pills, selected = `accent-soft` with an `accent` border. Every tab is at least 44px tall and works with Left/Right/Home/End.
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
