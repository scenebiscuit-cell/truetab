# Menu Math: rules for Claude

Read README.md, PLAN.md and docs/DATA.md before changing anything.

## How Nick works

- One small, testable step at a time; end with "how to check it worked."
- Explain new concepts in one or two plain sentences before using them.
- Windows PC with PowerShell. Start every command block with `cd C:\Projects\menu-math`.
- New branch from the current main for every change, then a pull request. Never push to main. Merge only when Nick says "merge."
- When referring back to earlier steps or drafts, paste them in full.

## Hard rules

1. No build step and no dependencies. Plain HTML, CSS and vanilla JS.
2. Math stays in `src/engine.js` (no page code there). `src/app.js` is the only file that touches the page.
3. Every money total shown to visitors is labeled as an estimate.
4. Every portion size shows its source: restaurant, customer reports, or estimate. Never hide a guess.
5. Never scrape DoorDash, Uber Eats, Grubhub or Yelp. Real data is collected by hand (docs/DATA.md).
6. Sample data stays fictional and is labeled "(sample)". Never commit real customer data or secrets.
7. Don't weaken tests to make them pass. Run `npm test` before every pull request.
8. Bump the `?v=` date in `index.html` when scripts or styles change.
9. Design follows DESIGN.md. Check both themes with axe-core before shipping.
10. Credit line: "Created by Nick Lax."
