---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/plan/page.tsx"]
---

# Planner surface: list + trip + goal (app/page.tsx) and plans (app/plan/page.tsx)

Mode: Operate. Mobile-first (390px), judges open it on their phones.
Audience/job: a Utah household fitting a grocery run into a trip from A to B inside a time limit, with or without a car.
Task: review/edit the preloaded demo list (pick from 20 staples, +/- qty, bulk OK), set trip (from/to presets, no car, home-by time), pick a goal, see three plans, hand off to Maps or the delivery app.
Constraints: no generic grocery-app look (no produce photos, cart icons, green-and-white), no corporate dashboard (no gray KPI cards, charts). Demo prices labeled "demo price".
Unresolved: real store coordinates and prices (team).

## Direction contract

THESIS: Every plan is a Utah cliff face: the trip's minutes stack as flat sandstone layers up to the rim, the user's time limit; unused time is sky. Refuses the category default of white cards with a green button and a map thumbnail.

OWN-WORLD: Sky-pale ground (#E7EEF2), desert-varnish ink and top bar (#2A1A14), one fixed sandstone ramp (Wingate red #B8462A, Navajo salmon #E08B5B, bleached tan #F0C9A0) plus sage (#7F9073 family) for savings; flat colour only, 1px hairline rules, small radii, Barlow on a strict size ladder with tabular figures. Raises: hairline discipline (centre-rail); flat unmodulated colour (zoo map); chosen plan owns the screen, others one swipe away (vertical feed); fixed tonal ramp as the only colour tokens (exposure sheets); one family on a size ladder (bitmap specimen).

STORY: The user sees the demo list and trip already set, taps Plan, and immediately reads which plan fits under the rim, what it costs, and what it saves; one tap opens the route or the order.

FIRST VIEWPORT: Plans screen: varnish top bar with UtahCart and Edit list; trip strip (From → To, mode, home-by); goal tabs (Most savings / Fewest stops / Most time) with the chosen tab in Wingate red; below, the chosen plan: a 112px strata column on the left (layers = travel legs and shop time, sized by minutes; dashed rim = time limit; sky = spare minutes) and on the right the total at 44px, minutes and stops, savings chip, the stops, then primary "Go to <store>" / "Open in Maps" and "Order on Instacart". List screen: same bar, list rows with steppers, trip and goal controls, sticky "Plan my trip" bar.

FORM: Red Rock Strata, candidate 7 of 7 on the ordered list (assigned by the roll); seed:19568e37b0b8aaca. Signature move: the strata column that stacks a plan's minutes to the time-limit rim.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
