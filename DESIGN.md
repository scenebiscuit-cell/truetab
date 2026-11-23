# TrueTab design

Built on the **Nick Lax 2026 Design System** (https://claude.ai/artifact/GrBtg5MmceuznbkvGEpSmN). Its tokens are copied into the top of `src/styles.css`. If this file and the system disagree, this file wins for TrueTab.

## Look

- Eggshell `paper` page, near-black `ink`, one ballpoint-blue `accent` for links, selected tabs and focus.
- Bricolage Grotesque for headings and big prices, IBM Plex Sans for reading, IBM Plex Mono for labels, tags and numbers in tables.
- One highlighter-yellow `marker` wipe in the hero headline ("actually").
- The top pick gets the hard `shadow-print` offset; it's the one bold element on the page.

## Meaning

- Budget tags: `success` Fits budget, `warning` Just over, `danger` Over budget. Always a word, never color alone.
- Dish badges: Cheaper (`success`), About the same (neutral), Pricier (`danger`).
- Estimated portions are marked with "~" and the words "Estimated ... (typical for this dish)".
- Big prices always start with "est."

## Copy

- Plain and specific. "What does your budget actually get you?" Sentence case everywhere.
- Say "sample" on every invented restaurant name and in the notice until real data replaces it.
