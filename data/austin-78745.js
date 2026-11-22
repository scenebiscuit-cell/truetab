/*
 * REAL DATA: Austin 78745. Menu prices copied by hand from each restaurant's own website
 * or its own Toast ordering page on 2026-11-22. Each restaurant lists its source.
 * - No prices from DoorDash, Uber Eats or other apps. App prices are ESTIMATED by the page
 *   from the restaurant's price plus a typical markup, and labeled as estimates.
 * - No ratings are stored (Google, Yelp and Tripadvisor terms restrict that). Cards link out instead.
 * - Portions are filled in only where the menu states them; otherwise the dish-type default applies.
 * - Diet tags only where the menu or the item's name says so.
 * Nick: verify each restaurant before publishing, then set verifiedBy: "nick".
 */
(function (root, factory) {
  const data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  else root.MENU_DATA = data;
})(typeof self !== "undefined" ? self : this, function () {
  const COLLECTED = "2026-11-22";
  return {
    meta: {
      city: "Austin, TX",
      area: "78745",
      isSample: false,
      collected: COLLECTED,
      note: "Real menu prices from restaurants' own websites and Toast ordering pages. App prices and fees are estimates."
    },

    // Austin combined sales tax. Verify.
    taxRate: 0.0825,
    appetite: { adult: 1, kid: 0.6 },

    /*
     * Ways to order. DoorDash and Uber Eats prices are estimated: restaurant price x (1 + markup).
     * Markup default 20%: a 2023 industry study put the average app premium near 20%
     * (quick-service 26%, casual dining 11%). Fees are typical values, not quotes; DoorDash's
     * US service fee now varies with distance and order size.
     */
    channels: [
      { id: "pickup", label: "Pickup", kind: "pickup", priceKey: "direct",
        deliveryFee: 0, serviceFeePct: 0, serviceFeeMin: 0, smallOrderThreshold: 0, smallOrderFee: 0, defaultTipPct: 0 },
      { id: "dine-in", label: "Dine in", kind: "dine-in", priceKey: "direct",
        deliveryFee: 0, serviceFeePct: 0, serviceFeeMin: 0, smallOrderThreshold: 0, smallOrderFee: 0, defaultTipPct: 0.18 },
      { id: "direct", label: "Restaurant's own delivery", kind: "delivery", priceKey: "direct",
        deliveryFee: 3.99, serviceFeePct: 0, serviceFeeMin: 0, smallOrderThreshold: 0, smallOrderFee: 0, defaultTipPct: 0.18,
        requiresOptIn: true },
      { id: "doordash", label: "DoorDash", kind: "delivery", priceKey: "doordash", estimateFromDirect: true, requiresApp: true,
        deliveryFee: 2.99, serviceFeePct: 0.15, serviceFeeMin: 3.0, smallOrderThreshold: 12, smallOrderFee: 2.5, defaultTipPct: 0.18 },
      { id: "ubereats", label: "Uber Eats", kind: "delivery", priceKey: "ubereats", estimateFromDirect: true, requiresApp: true,
        deliveryFee: 2.49, serviceFeePct: 0.15, serviceFeeMin: 3.0, smallOrderThreshold: 12, smallOrderFee: 2.0, defaultTipPct: 0.18 }
    ],
    defaultMarkupPct: 0.2,

    dishTypes: {
      "breakfast-taco":   { label: "Breakfast taco",            group: "tacos",   defaultServes: 0.34 },
      "taco":             { label: "Taco",                      group: "tacos",   defaultServes: 0.34 },
      "taco-large":       { label: "Large taco",                group: "tacos",   defaultServes: 0.5 },
      "burrito":          { label: "Burrito",                   group: "tacos",   defaultServes: 1 },
      "taco-family-pack": { label: "Taco family meal",          group: "tacos",   defaultServes: 4 },
      "queso":            { label: "Queso",                     group: "tacos",   defaultServes: 0 },
      "burger":           { label: "Burger",                    group: "burgers", defaultServes: 1 },
      "burger-small":     { label: "Small burger",              group: "burgers", defaultServes: 0.75 },
      "fries":            { label: "Fries",                     group: "burgers", defaultServes: 0 },
      "po-boy":           { label: "Po-boy",                    group: "cajun",   defaultServes: 1 },
      "po-boy-large":     { label: "Large po-boy",              group: "cajun",   defaultServes: 1.5 },
      "entree":           { label: "Entrée or plate",           group: "plates",  defaultServes: 1 },
      "small-plate":      { label: "Small plate",               group: "plates",  defaultServes: 0.75 },
      "meal-for-2":       { label: "Meal for two",              group: "plates",  defaultServes: 2 },
      "noodle-bowl":      { label: "Noodle bowl or pho",        group: "asian",   defaultServes: 1 },
      "spring-rolls":     { label: "Spring or egg rolls",       group: "asian",   defaultServes: 0 },
      "kids-meal":        { label: "Kids' meal",                group: "kids",    defaultServes: 0.6 }
    },
    groups: { tacos: "Tacos and Tex-Mex", burgers: "Burgers", cajun: "Cajun", plates: "Plates", asian: "Asian", kids: "Kids" },
    dietTags: { vegetarian: "Vegetarian", vegan: "Vegan", "gluten-free": "Gluten-free" },

    /*
     * Deals as each restaurant's menu states them. App promotions (type "bogo" with channels
     * ["doordash"] or ["ubereats"]) are entered by hand from what Nick sees in the app, with
     * source "Seen in the <app> app", the date seen, and an expires date.
     */
    deals: [
      { id: "ev-lunch-3", restaurantId: "evangeline-cafe",
        title: "Lunch special #3: gumbo, red beans & rice or jambalaya with a side salad, $10.99",
        days: [1, 2, 3, 4, 5, 6], start: "11:00", end: "15:00", type: "price", value: 10.99,
        appliesTo: { itemIds: ["ev-jamb", "ev-gumbo", "ev-rbr"] }, channels: ["pickup", "dine-in"],
        source: "https://www.evangelinecafe.com/menu", verified: COLLECTED },
      { id: "mc-lunch", restaurantId: "me-con-bistro",
        title: "Lunch special $11 (with egg drop soup and an egg roll)",
        days: [0, 1, 2, 3, 4, 5, 6], start: "11:00", end: "14:30", type: "price", value: 11.0,
        appliesTo: { itemIds: ["mc-fr", "mc-lomein", "mc-buddha"] }, channels: ["pickup", "dine-in"],
        note: "Days aren't listed on the menu. Confirm which days.",
        source: "https://order.toasttab.com/online/me-con-bistro-3421-w-william-cannon-dr-ste-101", verified: COLLECTED }
    ],

    restaurants: [
      {
        id: "el-chilito", name: "El Chilito", neighborhood: "Manchaca Rd", address: "4501 Manchaca Rd, Austin, TX 78745",
        group: "tacos", cuisines: ["Mexican"],
        onApps: ["ubereats"],
        hours: { 0: [["07:15", "20:00"]], 1: [["07:15", "20:15"]], 2: [["07:15", "20:00"]], 3: [["07:15", "20:00"]],
                 4: [["07:15", "20:00"]], 5: [["07:15", "20:30"]], 6: [["07:15", "20:30"]] },
        sources: { website: null, toast: "https://www.toasttab.com/local/order/elchilito-manchaca", instagram: null, facebook: null, do512: null },
        lastChecked: COLLECTED, verifiedBy: null, rating: null,
        channelFees: {},
        items: [
          { id: "ec-bt-bean", name: "Bean & cheese breakfast taco", dishType: "breakfast-taco", prices: { direct: 2.5 } },
          { id: "ec-bt-migas", name: "Migas breakfast taco", dishType: "breakfast-taco", prices: { direct: 3.3 } },
          { id: "ec-bt-vaquero", name: "Vaquero breakfast taco", dishType: "breakfast-taco", prices: { direct: 4.0 } },
          { id: "ec-t-pastor", name: "Al pastor taco", dishType: "taco", prices: { direct: 3.8 } },
          { id: "ec-t-asada", name: "Carne asada taco", dishType: "taco", prices: { direct: 4.5 } },
          { id: "ec-t-veggie", name: "Veggie taco", dishType: "taco", tags: ["vegetarian"], prices: { direct: 4.0 } },
          { id: "ec-bur-migas", name: "Migas burrito", dishType: "burrito", prices: { direct: 6.5 } },
          { id: "ec-bur-pastor", name: "Al pastor burrito", dishType: "burrito", prices: { direct: 7.5 } },
          { id: "ec-fam-brentwood", name: "Brentwood family meal (feeds 4–6)", dishType: "taco-family-pack",
            portion: { serves: 4, source: "restaurant", note: "Menu says feeds 4–6; counted as 4." }, prices: { direct: 53.0 } },
          { id: "ec-fam-pastor", name: "Al pastor family meal (feeds 4–6)", dishType: "taco-family-pack",
            portion: { serves: 4, source: "restaurant", note: "Menu says feeds 4–6; counted as 4." }, prices: { direct: 55.0 } },
          { id: "ec-fam-asada", name: "Carne asada family meal (feeds 4–6)", dishType: "taco-family-pack",
            portion: { serves: 4, source: "restaurant", note: "Menu says feeds 4–6; counted as 4." }, prices: { direct: 65.0 } },
          { id: "ec-queso", name: "Large chipotle queso", dishType: "queso", prices: { direct: 8.95 } },
          { id: "ec-kids", name: "Kids quesadilla", dishType: "kids-meal", kidsOnly: true, prices: { direct: 2.5 } }
        ]
      },
      {
        id: "evangeline-cafe", name: "Evangeline Cafe", neighborhood: "Brodie Ln", address: "8106 Brodie Ln, Austin, TX 78745",
        group: "cajun", cuisines: ["Cajun"],
        onApps: [],
        hours: null,
        toGoItemFee: 0.4,
        sources: { website: "https://www.evangelinecafe.com/menu", toast: null, instagram: null, facebook: null, do512: null },
        lastChecked: COLLECTED, verifiedBy: null, rating: null,
        channelFees: {},
        items: [
          { id: "ev-pb-shrimp", name: "Shrimp po-boy", dishType: "po-boy", prices: { direct: 10.99 } },
          { id: "ev-pb-shrimp-lg", name: "Shrimp po-boy, large", dishType: "po-boy-large", prices: { direct: 15.99 } },
          { id: "ev-pb-veggie", name: "Grilled veggie po-boy", dishType: "po-boy", tags: ["vegetarian"], prices: { direct: 10.99 } },
          { id: "ev-jamb", name: "Jambalaya", dishType: "entree", prices: { direct: 12.99 } },
          { id: "ev-gumbo", name: "Maw Maw's chicken & sausage gumbo", dishType: "entree", prices: { direct: 13.99 } },
          { id: "ev-gumbo-veg", name: "Veggie gumbo", dishType: "entree", tags: ["vegetarian"], prices: { direct: 12.99 } },
          { id: "ev-rbr", name: "Red beans & rice", dishType: "entree", prices: { direct: 11.99 } },
          { id: "ev-etouffee", name: "Shrimp étouffée", dishType: "entree", prices: { direct: 16.99 } },
          { id: "ev-catfish", name: "Catfish basket", dishType: "entree", prices: { direct: 12.99 } },
          { id: "ev-kids", name: "Kids' meal (fries or rice, and a drink)", dishType: "kids-meal", kidsOnly: true, prices: { direct: 6.99 } }
        ]
      },
      {
        id: "moreno-burger", name: "Moreno Burger Co.", neighborhood: "Menchaca Rd", address: "5608 Menchaca Rd, Austin, TX 78745",
        group: "burgers", cuisines: ["Burgers"],
        onApps: [],
        hours: { 0: [["11:00", "19:30"]], 1: [], 2: [["11:00", "19:30"]], 3: [["11:00", "19:30"]],
                 4: [["11:00", "19:30"]], 5: [["11:00", "19:30"]], 6: [["11:00", "19:30"]] },
        cardSurchargePct: 0.03,
        sources: { website: null, toast: "https://www.toasttab.com/local/order/moreno-burgerc-o", instagram: null, facebook: null, do512: null },
        lastChecked: COLLECTED, verifiedBy: null, rating: null,
        channelFees: {},
        items: [
          { id: "mb-smash", name: "Smash burger (two patties)", dishType: "burger", prices: { direct: 14.5 } },
          { id: "mb-smoked", name: "Smoked burger (1/2 lb)", dishType: "burger", prices: { direct: 13.0 } },
          { id: "mb-lil", name: "Lil' smash burger (one patty)", dishType: "burger-small", prices: { direct: 10.5 } },
          { id: "mb-fries", name: "Fries", dishType: "fries", prices: { direct: 3.0 } },
          { id: "mb-kids", name: "Kids burger combo", dishType: "kids-meal", kidsOnly: true, prices: { direct: 8.0 } }
        ]
      },
      {
        id: "somos", name: "Somos (food truck)", neighborhood: "St. Elmo", address: "440 E St Elmo Rd, Austin, TX 78745",
        group: "tacos", cuisines: ["Mexican", "Middle Eastern"],
        onApps: [],
        hours: { 0: [["12:00", "20:00"]], 1: [], 2: [], 3: [["12:00", "21:00"]],
                 4: [["12:00", "21:00"]], 5: [["12:00", "21:00"]], 6: [["12:00", "21:00"]] },
        sources: { website: null, toast: "https://www.toasttab.com/local/order/somos-atx", instagram: null, facebook: null, do512: null },
        lastChecked: COLLECTED, verifiedBy: null, rating: null,
        channelFees: {},
        items: [
          { id: "so-chicken", name: "Chicken taco árabe", dishType: "taco-large", prices: { direct: 6.0 } },
          { id: "so-pastor", name: "Lamb al pastor taco árabe", dishType: "taco-large", prices: { direct: 7.5 } },
          { id: "so-steak", name: "Steak taco árabe", dishType: "taco-large", prices: { direct: 7.5 } },
          { id: "so-fries", name: "Somos fries", dishType: "fries", prices: { direct: 6.0 } }
        ]
      },
      {
        id: "me-con-bistro", name: "Me Con Bistro", neighborhood: "W William Cannon", address: "3421 W William Cannon Dr #101, Austin, TX 78745",
        group: "asian", cuisines: ["Vietnamese", "Chinese"],
        onApps: ["ubereats"],
        hours: { 0: [["09:00", "22:00"]], 1: [["09:00", "22:00"]], 2: [["09:00", "22:00"]], 3: [["09:00", "22:00"]],
                 4: [["09:00", "22:00"]], 5: [["09:00", "22:00"]], 6: [["09:00", "22:00"]] },
        sources: { website: null, toast: "https://order.toasttab.com/online/me-con-bistro-3421-w-william-cannon-dr-ste-101", instagram: null, facebook: null, do512: null },
        lastChecked: COLLECTED, verifiedBy: null, rating: null,
        channelFees: {},
        items: [
          { id: "mc-bun", name: "Vermicelli (bún) bowl", dishType: "noodle-bowl", prices: { direct: 12.5 } },
          { id: "mc-vegan512", name: "Vegan 512 vermicelli", dishType: "noodle-bowl", tags: ["vegan", "vegetarian"], prices: { direct: 14.5 } },
          { id: "mc-com", name: "Rice plate (cơm)", dishType: "entree", prices: { direct: 12.0 } },
          { id: "mc-fr", name: "Fried rice", dishType: "entree", tags: ["gluten-free"], prices: { direct: 12.5 } },
          { id: "mc-lomein", name: "Lo mein", dishType: "entree", prices: { direct: 13.0 } },
          { id: "mc-buddha", name: "Buddha's delight", dishType: "entree", prices: { direct: 12.5 } },
          { id: "mc-shaken", name: "Shaken beef", dishType: "entree", prices: { direct: 17.0 } },
          { id: "mc-springrolls", name: "Spring rolls (gỏi cuốn)", dishType: "spring-rolls", prices: { direct: 8.0 } },
          { id: "mc-kids-fr", name: "Kids fried rice", dishType: "kids-meal", kidsOnly: true, prices: { direct: 6.5 } },
          { id: "mc-kids-lomein", name: "Kids lo mein", dishType: "kids-meal", kidsOnly: true, prices: { direct: 6.5 } }
        ]
      },
      {
        id: "super-bowl", name: "Super Bowl Restaurant", neighborhood: "W William Cannon", address: "719 W William Cannon Dr #103, Austin, TX 78745",
        group: "asian", cuisines: ["Chinese"],
        onApps: ["ubereats"],
        hours: null,
        sources: { website: null, toast: "https://order.toasttab.com/online/super-bowl-719-west-william-cannon-drive-suite-103", instagram: null, facebook: null, do512: null },
        lastChecked: COLLECTED, verifiedBy: null, rating: null,
        channelFees: {},
        items: [
          { id: "sb-sesame", name: "Sesame chicken with white rice", dishType: "entree", prices: { direct: 9.49 } },
          { id: "sb-mongolian", name: "Mongolian beef with white rice", dishType: "entree", prices: { direct: 9.99 } },
          { id: "sb-lomein", name: "Lo mein", dishType: "entree", prices: { direct: 9.69 } },
          { id: "sb-fr", name: "Fried rice", dishType: "entree", prices: { direct: 9.69 } },
          { id: "sb-pho", name: "Pho", dishType: "noodle-bowl", prices: { direct: 9.99 } },
          { id: "sb-padthai", name: "Pad thai", dishType: "noodle-bowl", prices: { direct: 9.65 } },
          { id: "sb-small", name: "All-day special (smaller portion, rice, egg roll)", dishType: "small-plate", prices: { direct: 8.95 } },
          { id: "sb-combo2", name: "Dinner combo for 2 (2 plates, rice, 2 soups, 2 egg rolls)", dishType: "meal-for-2",
            portion: { serves: 2, source: "restaurant" }, prices: { direct: 21.0 } },
          { id: "sb-bogo-sesame", promo: "bogo", name: "Sesame chicken, 2 orders (buy one get one)", dishType: "meal-for-2",
            portion: { serves: 2, source: "restaurant" }, prices: { direct: 12.95 } },
          { id: "sb-bogo-fr", promo: "bogo", name: "Fried rice plate, 2 orders (buy one get one)", dishType: "meal-for-2",
            portion: { serves: 2, source: "restaurant" }, prices: { direct: 12.95 } },
          { id: "sb-bogo-pho", promo: "bogo", name: "Pho, 2 orders (buy one get one)", dishType: "meal-for-2",
            portion: { serves: 2, source: "restaurant" }, prices: { direct: 14.95 } },
          { id: "sb-eggroll", name: "Vegetable egg roll", dishType: "spring-rolls", prices: { direct: 1.8 } }
        ]
      }
    ]
  };
});
