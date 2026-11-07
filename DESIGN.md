---
name: UtahCart
description: Grocery plans read as a Utah cliff face, where a trip's minutes stack up to the time-limit rim.
colors:
  sky: "#e7eef2"
  sky-deep: "#d3dee5"
  varnish: "#2a1a14"
  varnish-soft: "#5a4238"
  wingate: "#b8462a"
  navajo: "#e08b5b"
  tan: "#f0c9a0"
  sage: "#5e6e54"
  white: "#ffffff"
typography:
  display:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  label:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
    fontFeature: "tnum"
  caption:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "tnum"
rounded:
  sm: "4px"
  lg: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  top-bar:
    backgroundColor: "{colors.varnish}"
    textColor: "{colors.tan}"
    typography: "{typography.caption}"
    padding: "12px 16px"
  button-cta:
    backgroundColor: "{colors.wingate}"
    textColor: "{colors.white}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "12px 20px"
  button-cta-hover:
    backgroundColor: "{colors.varnish}"
  button-primary:
    backgroundColor: "{colors.varnish}"
    textColor: "{colors.white}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "12px"
  button-primary-hover:
    backgroundColor: "{colors.wingate}"
  button-secondary:
    textColor: "{colors.varnish}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "12px"
  button-secondary-hover:
    backgroundColor: "{colors.sky-deep}"
  segment-active:
    backgroundColor: "{colors.wingate}"
    textColor: "{colors.white}"
    typography: "{typography.body}"
    padding: "10px 0"
  segment-inactive:
    textColor: "{colors.varnish}"
    typography: "{typography.body}"
    padding: "10px 0"
  segment-inactive-hover:
    backgroundColor: "{colors.sky-deep}"
  input-field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.varnish}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  stepper:
    backgroundColor: "{colors.white}"
    textColor: "{colors.varnish}"
    rounded: "{rounded.lg}"
    height: "40px"
  chip-savings:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  strata-column:
    backgroundColor: "{colors.varnish}"
    width: "104px"
---

# Design System: UtahCart

## Overview

**Creative North Star: "Red Rock Strata"**

Every plan is a Utah cliff face. The minutes a trip uses stack as flat sandstone layers, one per travel leg and shop stop, up to a dashed rim that marks the user's time limit. Time left over shows as open sky above the layers. The rest of the system serves that image: a pale sky ground, desert-varnish ink, one fixed sandstone ramp, and hairline rules in place of cards.

The world is flat and dense, made for a phone held in one hand. Hierarchy comes from a four-step size ladder in a single family (Barlow), from weight, and from where the sandstone colour falls. Surfaces are never lifted or layered. A rule, a fill, or a change of ink does all the separating. The chosen plan fills the screen and the other plans sit one horizontal swipe away.

The build rejects the category default of white cards with a green button and a map thumbnail.

**Key Characteristics:**
- Sky-pale ground, varnish ink, one sandstone ramp (Wingate, Navajo, tan) plus sage for savings.
- Flat colour only: no gradients, no shadows, no tints beyond the ramp.
- 1px varnish hairlines separate content; no cards.
- One family, four sizes (13 / 15 / 18 / 44px), tabular figures everywhere.
- Small radii (4px and 8px); the strata column itself is square.
- One signature motion: layers settle upward from the base, once.

## Colors

A cool, pale sky over warm desert rock: neutrals in sky and varnish, with a three-step sandstone ramp carrying every accent.

### Primary
- **Wingate Red** (wingate): the active state and the main call to action. Fills the selected goal or mode segment, the "Plan my trip" bar button, and shop layers in the strata column. Also the focus ring, caret, native accent colour, and inline error text.

### Secondary
- **Navajo Salmon** (navajo): travel layers in the strata column, alternating with tan so neighbouring legs stay distinct. Not used outside the strata.
- **Bleached Tan** (tan): the second travel-layer tone, text and links in the top bar, and the text-selection fill.

### Tertiary
- **Juniper Sage** (sage): only for savings, as the fill of the savings chip with white text. Darker than a typical sage so 13px semibold white text stays legible (about 5.5:1).

### Neutral
- **Sky** (sky): the page ground, the sticky bottom action bar, and spare time above the strata layers.
- **Deep Sky** (sky-deep): hover fill on outlined buttons and inactive segments.
- **Desert Varnish** (varnish): all body ink, the top bar, every hairline and outline, the dark primary button, the strata column's frame and the gaps between its layers. Also the browser theme colour.
- **Soft Varnish** (varnish-soft): secondary text such as metadata, counts, disclaimers, unpicked list rows, and the loading line.
- **White** (white): text on Wingate, varnish and sage fills, the wordmark, and the wells of inputs and steppers. It is the only colour outside the declared token block. Treat it as part of the system, not as a new hue.

### Named Rules
**The Fixed Ramp Rule.** The colours above are the whole palette. Express a new state with a ramp colour or with varnish at reduced opacity (25% for soft rules, 40% for disabled outlines), never with a new hue or tint.

**The Sandstone Is Time Rule.** Navajo and tan mean travel minutes and Wingate means shop minutes inside the strata. Outside the strata, Wingate means "selected" or "act now". Sage means money saved and nothing else.

## Typography

**Display Font:** Barlow (with system-ui, sans-serif)
**Body Font:** Barlow (with system-ui, sans-serif)

**Character:** One sturdy, slightly condensed grotesque on a strict ladder. Figures are tabular throughout (set on body), so prices and minutes line up like a ledger.

### Hierarchy
- **Display** (700, 44px, line-height 1, tracking -0.025em): the plan total only. One per plan.
- **Headline** (700, 18px, 1.25): section titles ("Your trip", "Your list") and the wordmark. Also empty-state headlines.
- **Title** (600, 18px, 1.25, text-wrap balance): store group titles in a plan.
- **Body** (400, 15px, 1.45): list item names, inputs, the trip strip, and buttons (at 600). Picked list rows go to 600.
- **Label** (600, 13px, 1.4): field labels, strata layer labels, the savings chip, and expand toggles.
- **Caption** (400, 13px, 1.4): metadata, counts, warnings, disclaimers, and top-bar actions.

### Named Rules
**The Four-Step Ladder Rule.** Only 13, 15, 18 and 44px exist. Build hierarchy from weight (400 / 600 / 700) and ink (varnish vs. soft varnish) before you reach for another size.

**The Ledger Figures Rule.** Every number uses tabular figures. Write durations as "about N min" and money with two decimals.

## Layout

There is one centred column, max 36rem (576px), with 16px side gutters at every width. On desktop that same column sits centred on the sky ground and does not widen into a multi-column layout. Vertical rhythm runs on 4px steps: sections start 20–24px apart, controls sit 12px below their headline, and rows are padded 10px top and bottom. Field pairs use a two-column grid with a 12px gap.

On the plans screen, a varnish top bar sticks to the top, followed by a trip strip and the goal segments. Under those, a horizontal snap rail holds one full-width page per goal, with the scrollbar hidden. Each page puts the strata column on the left (104px, shrink-locked, height min(56vh, 450px)) beside the plan details with a 16px gap. On the list screen, a fixed bottom bar on sky with a top hairline holds the summary and the main call to action. The main content gets 128px of bottom padding so the bar never covers it.

## Elevation & Depth

The system is flat. Nothing in the build has a shadow, a blur, or a raised surface. Depth comes only from stacking order (the sticky top bar and fixed bottom bar) and from the strata column, whose layers read as rock through flat colour bands split by 1px varnish rules.

### Named Rules
**The Hairline Rule.** Separate with 1px varnish lines: full strength under a section or group header, 25% for rows and soft dividers. Don't use cards, shadows, or fill blocks to group content.

## Shapes

Corners are small and few. Controls (buttons, inputs, steppers, the segment group) take 8px. The savings chip takes 4px. The strata column is a square-cornered block with a 1px varnish frame and a 2px dashed top edge. That dashed edge is the rim, the time limit, and it is the only dashed line in the system. SVG icons use a 24px grid with a 2px round-capped stroke in currentColor.

## Components

### Buttons
Solid, flat, and labelled with words.
- **Shape:** gently rounded (8px), full-width blocks in plan actions.
- **Call to action:** Wingate fill, white 15px semibold label, 12px × 20px padding, with an optional trailing arrow icon. Hover swaps to varnish.
- **Primary:** varnish fill, white label, 12px padding. Hover swaps to Wingate. There is one primary per action stack ("Go to <store>", "Open in Google Maps").
- **Secondary:** 1px varnish outline on transparent, varnish label. Hover fills with deep sky.
- **Disabled stand-in:** a 40%-varnish outline with soft-varnish text that says what is missing ("Add an item to plan").
- **Focus:** a 2px Wingate outline offset 2px, set globally.

### Segmented control
One outlined group (1px varnish, 8px radius) split by vertical hairlines into equal-width radios. The active segment fills with Wingate and white text. Inactive segments are transparent with varnish text and take deep sky on hover. It is used for goal and for car or no car.

### Chips
- **Savings chip:** sage fill, white 13px semibold text, 4px radius, 4px × 8px padding. Only one per plan, directly under the total.

### Inputs / Fields
- **Style:** white well, 1px varnish border, 8px radius, 15px regular text, with a 13px semibold label stacked above with a 4px gap.
- **Focus:** the global Wingate outline. The native accent and caret colours are also Wingate.
- **Error:** a Wingate 13px line below the field group, announced with role="alert".

### Stepper
A white, 8px-rounded outlined pill with 40px square minus and plus targets around a 15px semibold count. Minus drops to 30% opacity at zero.

### List rows and store groups
List rows are flush with no fill and separated by 25% varnish rules. Unpicked rows sit in soft varnish and turn varnish at 600 once picked. Store groups are native disclosure elements under a full-strength top rule: an 18px semibold title, a caption line, and an underlined "Show N items" toggle with a chevron that rotates 180° when open.

### Navigation
A sticky varnish top bar holds the bold 18px white wordmark on the left and a tan 13px underlined action on the right. There is no other chrome.

### Strata column (signature)
A 104px column that stacks the plan's minutes from the bottom, in trip order. Travel legs alternate navajo and tan and shop stops are Wingate with white text. Each layer's height is proportional to its minutes. Layers are split by 1px varnish rules. A dashed top edge marks the time limit, captioned above in 13px semibold, and spare time shows as sky. A layer is labelled only when it takes more than 7% of the column. On mount, each layer settles from 82% height up to full over 700ms (cubic-bezier(0.16, 1, 0.3, 1)), staggered 70ms per layer. Motion is removed under reduced-motion.

## Do's and Don'ts

### Do:
- **Do** take every colour from the fixed ramp, and use varnish opacity (25%, 40%) for soft rules and disabled outlines.
- **Do** separate content with 1px varnish hairlines and leave surfaces flat.
- **Do** keep type to the four sizes (13 / 15 / 18 / 44px) in Barlow with tabular figures.
- **Do** give each action stack exactly one filled button, and swap varnish and Wingate on hover.
- **Do** keep the settle motion for strata layers only, and remove it under reduced-motion.
- **Do** label demo prices and estimated times in caption text next to the numbers they qualify.

### Don't:
- **Don't** use white cards, shadows, gradients or blurs. The build is flat colour on sky.
- **Don't** add a green brand button or a map thumbnail. Those are the category default this world rejects.
- **Don't** use sage for anything except savings, or navajo outside the strata.
- **Don't** use dashed lines except for the time-limit rim.
- **Don't** use radii above 8px.
- **Don't** add a second typeface or sizes between the four ladder steps.
