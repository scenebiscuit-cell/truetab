/*
 * SAMPLE DATA — every restaurant, price, fee and rating here is FICTIONAL.
 * The neighborhoods are real Austin areas; the restaurants are invented.
 * Replace with hand-collected data before showing this as real. See docs/DATA.md.
 */
(function (root, factory) {
  const data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  else root.MENU_DATA = data;
})(typeof self !== "undefined" ? self : this, function () {
  return {
    meta: {
      city: "Austin, TX",
      isSample: true,
      collected: "2026-11-22",
      note: "Fictional sample data for building the prototype. Not real restaurants or prices."
    },

    // Austin combined sales tax. Verify before using real data.
    taxRate: 0.0825,

    // How much one person eats, in "adult portions". Kids are an estimate to review.
    appetite: { adult: 1, kid: 0.6 },

    // Ways to get the food. Fee numbers are SAMPLE ESTIMATES, not real app fees.
    channels: [
      { id: "pickup", label: "Pickup", kind: "pickup", priceKey: "direct",
        deliveryFee: 0, serviceFeePct: 0, serviceFeeMin: 0, smallOrderThreshold: 0, smallOrderFee: 0, defaultTipPct: 0 },
      { id: "dine-in", label: "Dine in", kind: "dine-in", priceKey: "direct",
        deliveryFee: 0, serviceFeePct: 0, serviceFeeMin: 0, smallOrderThreshold: 0, smallOrderFee: 0, defaultTipPct: 0.18 },
      { id: "direct", label: "Restaurant's own delivery", kind: "delivery", priceKey: "direct",
        deliveryFee: 3.99, serviceFeePct: 0, serviceFeeMin: 0, smallOrderThreshold: 0, smallOrderFee: 0, defaultTipPct: 0.18,
        requiresOptIn: true },
      { id: "doordash", label: "DoorDash", kind: "delivery", priceKey: "doordash",
        deliveryFee: 2.99, serviceFeePct: 0.15, serviceFeeMin: 3.0, smallOrderThreshold: 12, smallOrderFee: 2.5, defaultTipPct: 0.18 },
      { id: "ubereats", label: "Uber Eats", kind: "delivery", priceKey: "ubereats",
        deliveryFee: 1.99, serviceFeePct: 0.15, serviceFeeMin: 3.0, smallOrderThreshold: 12, smallOrderFee: 2.0, defaultTipPct: 0.18 }
    ],

    // Nick's default portion rules, used only when nothing better is known.
    // serves = adult portions one menu item covers.
    dishTypes: {
      "breakfast-taco":   { label: "Breakfast taco",        group: "tacos",   defaultServes: 0.34 },
      "taco":             { label: "Taco",                  group: "tacos",   defaultServes: 0.34 },
      "taco-plate":       { label: "Taco plate",            group: "tacos",   defaultServes: 1 },
      "taco-family-pack": { label: "Taco family pack",      group: "tacos",   defaultServes: 4 },
      "queso":            { label: "Queso",                 group: "tacos",   defaultServes: 0 },
      "burger":           { label: "Burger",                group: "burgers", defaultServes: 1 },
      "burger-combo":     { label: "Burger combo",          group: "burgers", defaultServes: 1 },
      "burger-family":    { label: "Burger family meal",    group: "burgers", defaultServes: 4 },
      "fries":            { label: "Fries",                 group: "burgers", defaultServes: 0 },
      "brisket-plate":    { label: "Brisket plate",         group: "bbq",     defaultServes: 1 },
      "brisket-lb":       { label: "Brisket by the pound",  group: "bbq",     defaultServes: 2.5 },
      "bbq-family-pack":  { label: "BBQ family pack",       group: "bbq",     defaultServes: 4 },
      "side-bbq":         { label: "BBQ side",              group: "bbq",     defaultServes: 0 },
      "pizza-large":      { label: "Large pizza",           group: "pizza",   defaultServes: 3 },
      "pizza-medium":     { label: "Medium pizza",          group: "pizza",   defaultServes: 2 },
      "pizza-slice":      { label: "Pizza slice",           group: "pizza",   defaultServes: 0.34 },
      "pad-thai":         { label: "Noodle plate",          group: "asian",   defaultServes: 1 },
      "curry-plate":      { label: "Curry plate",           group: "asian",   defaultServes: 1 },
      "spring-rolls":     { label: "Spring rolls",          group: "asian",   defaultServes: 0 },
      "thali-family":     { label: "Family thali / curry set", group: "asian", defaultServes: 4 },
      "naan":             { label: "Naan",                  group: "asian",   defaultServes: 0 }
    },

    groups: {
      tacos: "Tacos and Tex-Mex",
      burgers: "Burgers",
      bbq: "Barbecue",
      pizza: "Pizza",
      asian: "Asian"
    },

    // Diet tags as the menu states them. Never an allergy promise.
    dietTags: { vegetarian: "Vegetarian", vegan: "Vegan", "gluten-free": "Gluten-free" },

    /*
     * Deals and specials. days: 0 = Sunday ... 6 = Saturday. Times are 24-hour, end not included.
     * type: "price" (item costs value), "percent" (value off, 0.25 = 25%), "amountOff" (dollars off each),
     *       "kids-free" (perAdult kids eat free per paying adult).
     * appliesTo: { dishTypes: [...] } or { itemIds: [...] }. channels: where the deal works.
     * All SAMPLE deals. Real ones need source + verified date (see docs/DATA.md).
     */
    deals: [
      { id: "sym-taco-tue", restaurantId: "sol-y-masa", title: "Taco Tuesday: $2 tacos",
        days: [2], start: "00:00", end: "24:00", type: "price", value: 2.0,
        appliesTo: { dishTypes: ["taco"] }, channels: ["pickup", "dine-in"],
        source: "sample", verified: "2026-11-22" },
      { id: "sa-kids", restaurantId: "smash-alley", title: "Kids eat free with each adult entrée",
        days: [1, 3], start: "16:00", end: "21:00", type: "kids-free", perAdult: 1,
        channels: ["dine-in"], source: "sample", verified: "2026-11-22" },
      { id: "pos-lunch", restaurantId: "post-oak-smoke", title: "Weekday lunch: brisket plate $16",
        days: [1, 2, 3, 4, 5], start: "11:00", end: "14:00", type: "price", value: 16.0,
        appliesTo: { itemIds: ["pos-plate"] }, channels: ["pickup", "dine-in"],
        source: "sample", verified: "2026-11-22" },
      { id: "ll-hh", restaurantId: "lemongrass-lane", title: "Happy hour: 25% off noodles and rolls",
        days: [1, 2, 3, 4, 5], start: "15:00", end: "18:00", type: "percent", value: 0.25,
        appliesTo: { dishTypes: ["pad-thai", "spring-rolls"] }, channels: ["dine-in"],
        source: "sample", verified: "2026-11-22" },
      { id: "s71-sunday", restaurantId: "slice-of-71", title: "Sunday: $5 off large pizzas",
        days: [0], start: "00:00", end: "24:00", type: "amountOff", value: 5.0,
        appliesTo: { dishTypes: ["pizza-large"] }, channels: ["pickup", "direct", "dine-in"],
        source: "sample", verified: "2026-11-22" }
    ],

    restaurants: [
      {
        id: "sol-y-masa", name: "Sol y Masa (sample)", neighborhood: "East Austin", group: "tacos",
        cuisines: ["Mexican"],
        sources: { website: null, instagram: null, facebook: null, do512: null }, lastChecked: "2026-11-20",
        rating: { stars: 4.6, count: 812, source: "sample" },
        channelFees: { direct: { available: false } },
        items: [
          { id: "sym-bt", name: "Bacon, egg and cheese taco", dishType: "breakfast-taco",
            prices: { direct: 3.75, doordash: 4.95, ubereats: 5.15 } },
          { id: "sym-at", name: "Al pastor taco", dishType: "taco",
            prices: { direct: 3.95, doordash: 5.25, ubereats: 5.25 } },
          { id: "sym-plate", name: "Two-taco plate with rice and beans", dishType: "taco-plate",
            prices: { direct: 13.5, doordash: 17.25, ubereats: 17.95 } },
          { id: "sym-fam", name: "Taco family pack (12 tacos, rice, beans)", dishType: "taco-family-pack",
            portion: { count: 12, unit: "tacos", serves: 4, source: "restaurant" },
            prices: { direct: 42.0, doordash: 54.0 } },
          { id: "sym-queso", name: "Queso (8 oz)", dishType: "queso", tags: ["vegetarian", "gluten-free"],
            portion: { count: 8, unit: "oz" },
            prices: { direct: 7.5, doordash: 9.75, ubereats: 9.95 } }
        ]
      },
      {
        id: "tortilla-norte", name: "Tortilla Norte (sample)", neighborhood: "North Loop", group: "tacos",
        cuisines: ["Tex-Mex"],
        sources: { website: null, instagram: null, facebook: null, do512: null }, lastChecked: "2026-11-08",
        rating: { stars: 4.2, count: 395, source: "sample" },
        channelFees: { direct: { available: true, deliveryFee: 3.49 } },
        items: [
          { id: "tn-bt", name: "Migas taco", dishType: "breakfast-taco", tags: ["vegetarian", "gluten-free"],
            prices: { direct: 3.25, doordash: 4.25, ubereats: 4.4 } },
          { id: "tn-t", name: "Brisket taco", dishType: "taco",
            prices: { direct: 4.5, doordash: 5.75, ubereats: 5.95 } },
          { id: "tn-plate", name: "Enchilada plate", dishType: "taco-plate",
            portion: { serves: 1.25, source: "reports", reports: 14 },
            prices: { direct: 14.0, doordash: 17.5, ubereats: 17.5 } },
          { id: "tn-fam", name: "Fajita family pack (feeds 4 to 5)", dishType: "taco-family-pack",
            portion: { serves: 4.5, source: "restaurant" },
            prices: { direct: 48.0, doordash: 61.0, ubereats: 62.5 } }
        ]
      },
      {
        id: "smash-alley", name: "Smash Alley (sample)", neighborhood: "South Lamar", group: "burgers",
        cuisines: ["Burgers"],
        sources: { website: null, instagram: null, facebook: null, do512: null }, lastChecked: "2026-11-18",
        rating: { stars: 4.4, count: 1220, source: "sample" },
        channelFees: { direct: { available: false } },
        items: [
          { id: "sa-b", name: "Double smash burger", dishType: "burger",
            prices: { direct: 10.5, doordash: 13.25, ubereats: 13.75 } },
          { id: "sa-c", name: "Smash combo (burger, fries, drink)", dishType: "burger-combo",
            prices: { direct: 14.0, doordash: 17.75, ubereats: 18.25 } },
          { id: "sa-fam", name: "Family meal (4 burgers, 2 large fries)", dishType: "burger-family",
            portion: { count: 4, unit: "burgers", serves: 4, source: "restaurant" },
            prices: { direct: 44.0, doordash: 56.0, ubereats: 57.5 } },
          { id: "sa-f", name: "Large fries", dishType: "fries",
            prices: { direct: 4.5, doordash: 5.75, ubereats: 5.95 } }
        ]
      },
      {
        id: "bun-n-done", name: "Bun & Done (sample)", neighborhood: "Mueller", group: "burgers",
        cuisines: ["Burgers"],
        sources: { website: null, instagram: null, facebook: null, do512: null }, lastChecked: "2026-10-30",
        rating: { stars: 3.9, count: 210, source: "sample" },
        channelFees: { direct: { available: true, deliveryFee: 2.99 } },
        items: [
          { id: "bd-b", name: "Classic cheeseburger", dishType: "burger",
            portion: { serves: 0.75, source: "reports", reports: 9 },
            prices: { direct: 8.0, doordash: 9.75, ubereats: 9.95 } },
          { id: "bd-c", name: "Cheeseburger combo", dishType: "burger-combo",
            prices: { direct: 11.5, doordash: 14.25, ubereats: 14.25 } }
        ]
      },
      {
        id: "post-oak-smoke", name: "Post Oak Smokehouse (sample)", neighborhood: "East Cesar Chavez", group: "bbq",
        cuisines: ["Barbecue"],
        sources: { website: null, instagram: null, facebook: null, do512: null }, lastChecked: "2026-11-21",
        rating: { stars: 4.7, count: 2050, source: "sample" },
        channelFees: { direct: { available: false } },
        items: [
          { id: "pos-plate", name: "Brisket plate with two sides", dishType: "brisket-plate",
            prices: { direct: 21.0, doordash: 26.5, ubereats: 27.0 } },
          { id: "pos-lb", name: "Brisket (1 lb)", dishType: "brisket-lb",
            portion: { count: 1, unit: "lb" },
            prices: { direct: 32.0, doordash: 40.0 } },
          { id: "pos-fam", name: "Family pack (1.5 lb meat, 3 pint sides, bread)", dishType: "bbq-family-pack",
            portion: { serves: 4, source: "restaurant" },
            prices: { direct: 72.0, doordash: 89.0, ubereats: 91.0 } },
          { id: "pos-side", name: "Pint of mac and cheese", dishType: "side-bbq",
            prices: { direct: 8.0, doordash: 10.0, ubereats: 10.0 } }
        ]
      },
      {
        id: "slice-of-71", name: "Slice of 71 (sample)", neighborhood: "Hyde Park", group: "pizza",
        cuisines: ["Pizza", "Italian"],
        sources: { website: null, instagram: null, facebook: null, do512: null }, lastChecked: "2026-11-12",
        rating: { stars: 4.3, count: 640, source: "sample" },
        channelFees: { direct: { available: true, deliveryFee: 0 } },
        items: [
          { id: "s71-sl", name: "Cheese slice", dishType: "pizza-slice", tags: ["vegetarian"],
            prices: { direct: 4.5, doordash: 5.75, ubereats: 5.75 } },
          { id: "s71-m", name: "Medium pepperoni (12 in)", dishType: "pizza-medium",
            portion: { count: 12, unit: "in" },
            prices: { direct: 19.0, doordash: 24.0, ubereats: 24.5 } },
          { id: "s71-l", name: "Large pepperoni (16 in)", dishType: "pizza-large",
            portion: { count: 16, unit: "in", serves: 3.5, source: "reports", reports: 22 },
            prices: { direct: 25.0, doordash: 31.5, ubereats: 32.0 } }
        ]
      },
      {
        id: "lemongrass-lane", name: "Lemongrass Lane (sample)", neighborhood: "North Lamar", group: "asian",
        cuisines: ["Thai"],
        sources: { website: null, instagram: null, facebook: null, do512: null }, lastChecked: "2026-11-02",
        rating: { stars: 4.5, count: 530, source: "sample" },
        channelFees: { direct: { available: false } },
        items: [
          { id: "ll-pt", name: "Pad thai with chicken", dishType: "pad-thai",
            prices: { direct: 14.0, doordash: 17.5, ubereats: 17.95 } },
          { id: "ll-ptv", name: "Pad thai with tofu", dishType: "pad-thai", tags: ["vegetarian", "vegan"],
            prices: { direct: 13.0, doordash: 16.25, ubereats: 16.5 } },
          { id: "ll-gc", name: "Green curry with rice", dishType: "curry-plate", tags: ["gluten-free"],
            portion: { serves: 1.25, source: "reports", reports: 11 },
            prices: { direct: 15.0, doordash: 18.75, ubereats: 19.25 } },
          { id: "ll-sr", name: "Fresh spring rolls (2)", dishType: "spring-rolls", tags: ["vegetarian", "vegan", "gluten-free"],
            prices: { direct: 6.5, doordash: 8.25, ubereats: 8.5 } }
        ]
      },
      {
        id: "saffron-tiffin", name: "Saffron Tiffin (sample)", neighborhood: "Wells Branch", group: "asian",
        cuisines: ["Indian"],
        sources: { website: null, instagram: null, facebook: null, do512: null }, lastChecked: "2026-11-19",
        rating: { stars: 4.4, count: 288, source: "sample" },
        channelFees: { direct: { available: true, deliveryFee: 4.99 } },
        items: [
          { id: "st-cm", name: "Chana masala with rice", dishType: "curry-plate", tags: ["vegetarian", "vegan", "gluten-free"],
            prices: { direct: 13.5, doordash: 16.75, ubereats: 16.75 } },
          { id: "st-tm", name: "Chicken tikka masala with rice", dishType: "curry-plate", tags: ["gluten-free"],
            prices: { direct: 16.0, doordash: 19.75, ubereats: 20.25 } },
          { id: "st-fam", name: "Family curry set (3 curries, rice, naan)", dishType: "thali-family", tags: ["vegetarian"],
            portion: { serves: 4, source: "restaurant" },
            prices: { direct: 49.0, doordash: 61.0 } },
          { id: "st-naan", name: "Garlic naan", dishType: "naan", tags: ["vegetarian"],
            prices: { direct: 3.5, doordash: 4.5, ubereats: 4.5 } }
        ]
      }
    ]
  };
});
