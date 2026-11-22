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
| `groups` | Food groups shown in the Food filter |
| `restaurants` | The restaurants and their items |

## Channels

```js
{ id: "doordash", label: "DoorDash", kind: "delivery", priceKey: "doordash",
  deliveryFee: 2.99, serviceFeePct: 0.15, serviceFeeMin: 3.0,
  smallOrderThreshold: 12, smallOrderFee: 2.5, defaultTipPct: 0.18 }
```

- `priceKey` says which menu price to use: `direct` (the restaurant's own price) or the app's.
- `requiresOptIn: true` means a restaurant only has this channel if it says `available: true` (used for the restaurant's own delivery).
- A restaurant can override any fee in `channelFees`, or turn a channel off with `available: false`.

## Restaurants and items

```js
{ id: "smash-alley", name: "Smash Alley", neighborhood: "South Lamar", group: "burgers",
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
- A `defaultServes` of 0 marks an add-on (queso, fries, sides) that doesn't count toward feeding anyone.

## Collecting real data (Milestone 2)

1. Pick one neighborhood and one food group.
2. For each restaurant, copy prices from its own website or menu (`direct`), then check DoorDash and Uber Eats by hand for the same items at the same time of day. Write down the date.
3. Record fee rules from a real checkout to one fixed test address. Note the time.
4. Fill in `portion` only from what the menu states. Leave it out otherwise.
5. Ratings: stars and count from Google, with `source: "google"`. Keep to what the Google Places terms allow.

Never automate collection from DoorDash, Uber Eats or Yelp: it breaks their terms of service.
