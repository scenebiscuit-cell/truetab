# Data format

All data lives in one file loaded by the page (`data/sample-data.js` now; `data/austin.js` once real data exists). A `.js` file is used instead of `.json` so the page also works when opened straight from disk.

## Top level

| Field | Meaning |
|---|---|
| `meta` | City, `isSample`, date collected, a note |
| `taxRate` | Sales tax as a decimal. Austin uses 0.0825; verify before publishing |
| `appetite` | Portions per person: `adult: 1`, `kid: 0.6` (an estimate to review) |
| `channels` | Ways to order and their fee rules (below) |
| `dishTypes` | Every kind of dish, its food group and its **default portion** |
| `groups` | Broad food groups for dish types |
| `dietTags` | Diet tags the page can filter on (as the menu states them) |
| `deals` | Specials with days, times, channels and source (below) |
| `restaurants` | The restaurants, their cuisines, sources and items |

## Channels

```js
{ id: "doordash", label: "DoorDash", kind: "delivery", priceKey: "doordash",
  deliveryFee: 2.99, serviceFeePct: 0.15, serviceFeeMin: 3.0,
  smallOrderThreshold: 12, smallOrderFee: 2.5, defaultTipPct: 0.18 }
```

- `priceKey` says which menu price to use: `direct` (the restaurant's own price) or the app's.
- `kind` is `pickup`, `dine-in` or `delivery`. Pickup never has a tip; dine-in and delivery use the tip setting.
- `requiresOptIn: true` means a restaurant only has this channel if it says `available: true` (used for the restaurant's own delivery).
- A restaurant can override any fee in `channelFees`, or turn a channel off with `available: false`.

## Restaurants and items

```js
{ id: "smash-alley", name: "Smash Alley", neighborhood: "South Lamar", group: "burgers",
  cuisines: ["Burgers"],
  sources: { website: "https://...", instagram: "https://instagram.com/...", facebook: null, do512: null },
  lastChecked: "2026-11-18",
  rating: { stars: 4.4, count: 1220, source: "google" },
  channelFees: { direct: { available: false } },
  items: [
    { id: "sa-fam", name: "Family meal (4 burgers, 2 large fries)", dishType: "burger-family",
      portion: { count: 4, unit: "burgers", serves: 4, source: "restaurant" },
      prices: { direct: 44.0, doordash: 56.0, ubereats: 57.5 } }
  ] }
```

- Leave a price out when the item isn't sold on that channel.
- `portion.source` is `"restaurant"` (the menu says it) or `"reports"` (from customer feedback, with `reports: <count>`). With neither, the dish type's `defaultServes` is used and labeled as an estimate.
- `tags` (optional) lists diet tags the menu states: `vegetarian`, `vegan`, `gluten-free`. When a visitor picks a diet, meals are built only from items carrying every chosen tag.
- `cuisines` drives the cuisine checkboxes. Use the same spelling everywhere.
- `sources` are links only, never copied content. `lastChecked` is the date you last looked at them.
- `history` (optional): earlier prices, newest last, e.g. `history: [{ date: "2026-11-22", direct: 9.49 }]`. On each weekly check, when a price has changed, move the old price and its `lastChecked` date into `history` before updating `prices`. The deal check uses this to catch prices raised shortly before a deal, and `check.html` lists every change from the last 30 days.
- `promo: "bogo"` with `pairOf: "<single item id>"` marks a restaurant's own two-for-one item, so the deal check can compare it with buying two singly.
- A `defaultServes` of 0 marks an add-on (queso, fries, sides) that doesn't count toward feeding anyone.

## Deals

```js
{ id: "sa-kids", restaurantId: "smash-alley", title: "Kids eat free with each adult entrée",
  days: [1, 3], start: "16:00", end: "21:00", type: "kids-free", perAdult: 1,
  channels: ["dine-in"], source: "https://instagram.com/p/...", verified: "2026-11-18" }
```

- `days`: 0 = Sunday through 6 = Saturday. `start` and `end` are 24-hour times; the end minute isn't included. Use `"00:00"` to `"24:00"` for all day.
- `type`: `price` (the item costs `value`), `percent` (`value` off, 0.25 = 25%), `amountOff` (`value` dollars off each), `kids-free` (`perAdult` kids eat free per paying adult), `bogo` (buy one, get one free on matching items).
- `starts` (optional, `YYYY-MM-DD`): when the deal began; `verified` is used if it's missing.
- `expires` (optional, `YYYY-MM-DD`): the last day the deal runs. Required for app promotions.
- **App BOGOs** (DoorDash, Uber Eats): enter only what you see in the app yourself. Set `channels` to that app, `source` to "Seen in the Uber Eats app" (or DoorDash), `verified` to the date you saw it, and `expires` to the end date shown (or 7 days out if none is shown). Never collect them with a script.
- A restaurant's own two-for-one items can also be regular items with `promo: "bogo"` and `portion.serves` for both orders.
- `appliesTo`: `{ dishTypes: [...] }` or `{ itemIds: [...] }`. Not needed for `kids-free`.
- `channels`: where it works. Most specials are dine-in or pickup only.
- `source` (a link to where you saw it) and `verified` (the date you confirmed it) are required for real deals.

## Collecting real data (Milestone 2)

1. Pick one neighborhood and one food group.
2. For each restaurant, copy prices from its own website or menu (`direct`), then check DoorDash and Uber Eats by hand for the same items at the same time of day. Write down the date.
3. Record fee rules from a real checkout to one fixed test address. Note the time.
4. Fill in `portion` only from what the menu states. Leave it out otherwise.
5. Record each restaurant's `sources` and today's date as `lastChecked`.
6. Deals: check the restaurant's own site and social posts; use Do512 and happy-hour sites only as leads. Record `source` and `verified`.
7. Ratings: stars and count from Google, with `source: "google"`. Keep to what the Google Places terms allow.

Never automate collection from DoorDash, Uber Eats, Grubhub, Yelp, Instagram, Facebook, Do512 or other listing sites: it breaks their terms of service. Automated feeds only with written permission.
