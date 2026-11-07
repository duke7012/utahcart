# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, deployed on Vercel. Anthropic TypeScript SDK (`@anthropic-ai/sdk`), called only from server route handlers. Vitest for tests. Optional: Leaflet + react-leaflet with OpenStreetMap tiles (OSM attribution shown). Storage: JSON seed files, an in-memory store for scanned receipts and shop posts, and `localStorage` for memberships and settings. Fixed by the build spec (`CLAUDE.md`).

## Users

Any Utah household doing a weekly grocery run: families, commuters, and students across the Wasatch Front. They often have little time, may not have a car, and pay for some memberships (Costco, Sam's Club, Instacart+, DashPass, Uber One, Prime) but not others. Their job: get the whole list bought within a time window and a budget, fitted around a trip they are already making.

The demo persona is one slice of this audience, not the whole of it: "Groceries for 3 roommates this week, leaving the U at 5, no car, home by 6:30, cheapest."

## Product Purpose

UtahCart fits groceries into the user's day. The user enters a shopping list, where they are, where they're going, a time limit, and whether they have a car. UtahCart returns the best mix of in-person stops and online orders for the chosen goal (**Most savings**, **Fewest stops**, or **Most time saved**), using only the stores and channels the user's memberships allow. It then hands off: routes open in Google Maps, Apple Maps, or Transit, and online orders open in the delivery app or store site.

Success: the user leaves with a plan they trust, opens it in their maps or delivery app in one tap, and gets home on time having spent less or stopped less than they would have at one store.

## Positioning

Pitch line: "Grocery Routes finds the cheapest store. UtahCart fits your groceries into your day: on your way, in your time limit, with or without a car, in person or delivered."

What a neighboring product cannot truthfully copy: UtahCart plans across **in-person and online channels together**, respects the user's **actual memberships** (including non-member access such as Costco via Instacart at a markup), works **with or without a car**, and fits the plan **between a start and an end point inside a time limit**. Grocery Routes (iOS, launched Mar 2026) compares whole lists in store only, 1 to 3 stores, cheapest goal only.

## Operating Context

- Used on a phone, mobile-first. Judges may open it on their own phones.
- Demoed live at a team table during Crimson Hacks 2026 (University of Utah, theme "State of Utah"). Judging: it works, it's useful to someone in Utah, it's well built, it's clear in 3 minutes.
- The user hands off to apps they already use (Google Maps, Apple Maps, Transit, Instacart, store sites) for navigation, checkout, and delivery. UtahCart plans; it never navigates or takes payment.
- No-car trips proceed one leg at a time ("Go to next stop").

## Capabilities and Constraints

- **Planner** (`lib/planner.ts`, pure TypeScript, unit tested): exact search over 4 stores, each skipped, in person, or online via one channel; at most 3 in-person stops. Items go to the cheapest allowed option by unit price. Returns three plans, one per goal, each with money, minutes, stop count, savings versus the cheapest single store, and warnings.
- **Memberships gate access.** Warehouse memberships gate in-person entry; delivery memberships change fees and markups. Memberships are toggles, not account links.
- **Travel times are estimates** (haversine x 1.3 road factor, per-mode speed), shown as "about N min". The maps app shows the real time after handoff.
- **Receipt / shelf-tag scan** (Claude vision) turns a photo into price lines the user reviews in an editable table before saving. The image and card details are never stored.
- **Plain-sentence planner** (Tier 2): a sentence becomes list, goal, mode, and time limit.
- **Membership wallet with "is it worth it?"** (fee versus savings per trip), **bulk-overbuy warnings** (Tier 2/3).
- **Business portal** for local shops to post prices: Tier 2, only if time allows.
- Every AI feature has a no-key fallback (a saved example result) so the demo never breaks.
- Terminology: "in person", "online order", "stop", "plan", "goal", "membership", "demo price", "estimate".
- **Not built, handed off instead:** navigation, real routing, checkout, payments, delivery, OCR, fuzzy name matching, unit conversion, address search, store lookup, login, account linking.
- Hard deadline: features freeze 10:45 PM, keyboards down 11:30 PM Mountain.

## Brand Commitments

- Name: **UtahCart**.
- Pitch line as quoted under Positioning.
- Demo scenario wording is fixed: "Groceries for 3 roommates this week, leaving the U at 5, no car, home by 6:30, cheapest." Never use a "tacos" example.
- Nothing else (logo, mascot, voice, colors) is decided yet.

## Evidence on Hand

- Verified facts usable in UI copy and the pitch, with sources, are listed in `CLAUDE.md` under "Facts already verified" (Costco non-member Instacart access; Sam's Club, Instacart+, Uber One, DashPass pricing; Restaurant Depot membership terms; Grocery Routes positioning).
- Costco-via-Instacart markup estimate: 1.24 without a membership, 1.10 with Costco + Instacart+ (one 10-item sample, Oct 2026).
- **Not on hand yet:** real store coordinates, real item prices, a real receipt photo. Until the team supplies them, prices are labeled `source: "demo"` and shown as "demo price", and coordinates are marked `TODO`.
- No testimonials, users, partnerships, or usage numbers exist. Do not invent any.

## Product Principles

1. **Fit the day, not just the price.** A plan is only good if it fits the user's route and time limit.
2. **Honest numbers.** Every price shows its source; demo and estimated prices are labeled as such, and time is "about N min".
3. **Hand off, don't rebuild.** Plan, then open the app the user already trusts for navigation, checkout, and delivery.
4. **Only what you can actually use.** Plans respect the user's real memberships and whether they have a car.
5. **The demo never breaks.** Every AI path has a working offline fallback.
