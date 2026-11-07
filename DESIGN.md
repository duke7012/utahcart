---
name: BeeLow
description: Groceries fitted to your day, on a warm paper canvas with logo brown and Inter.
colors:
  bee: "#5c2d0c"
  bee-dark: "#3f1f07"
  honey-tint: "#fff1cc"
  carrot: "#b5410f"
  amber-tint: "#fde6d2"
  canvas: "#fffaf0"
  surface: "#ffffff"
  ink: "#33200f"
  muted: "#75604d"
  honey: "#fbb424"
  leaf: "#4f7a14"
  line: "#eee2cc"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-1px"
    fontFeature: "\"tnum\" 1"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-1.1px"
  headline-sm:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.5px"
  headline-md:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.6px"
  result:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
  card-title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
  title-strong:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.45
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  body-sm:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  caption:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.45
  label-sm:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 400
    lineHeight: 1.45
  wordmark:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 400
    letterSpacing: "-0.8px"
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "18px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  card: "18px"
  section: "24px"
  gutter: "24px"
components:
  button-primary:
    backgroundColor: "{colors.bee}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.bee-dark}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "52px"
  button-secondary-hover:
    backgroundColor: "{colors.canvas}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card}"
  card-selected:
    backgroundColor: "{colors.honey-tint}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card}"
  choice-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "52px"
    padding: "0 16px"
  choice-row-selected:
    backgroundColor: "{colors.honey-tint}"
    textColor: "{colors.ink}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  search-field:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    height: "56px"
    padding: "0 16px"
  chip:
    backgroundColor: "{colors.honey-tint}"
    textColor: "{colors.bee}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 0"
  nav-tab:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
  nav-tab-active:
    backgroundColor: "{colors.honey-tint}"
    textColor: "{colors.bee}"
  qty-stepper:
    backgroundColor: "{colors.canvas}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    height: "36px"
  caveat-note:
    backgroundColor: "{colors.amber-tint}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  feature-panel:
    backgroundColor: "{colors.bee}"
    textColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "22px"
---

# Design System: BeeLow

## Overview

**Creative North Star: "The Kitchen Counter Notebook"**

BeeLow reads like a well-kept grocery list on a sunlit counter: a warm off-white paper canvas, white cards laid flat on it with hairline edges, one logo brown that does all the deciding, and real photographs of food. The world was set by the team's Figma file and rebuilt from it; the build is the record. It is a single phone column, calm and dense with useful numbers, never decorated for its own sake.

Hierarchy comes from size and weight in one family (Inter), not from color or ornament. Green means "act" or "chosen"; honey-tint means "selected" or "highlighted"; carrot means "costs you" or "went wrong"; amber means "caveat". Everything else is ink, muted gray-green, white and canvas.

**Key Characteristics:**
- Warm paper canvas with flat white cards and 1px pale-sage hairlines; no shadows anywhere.
- One logo brown for primary action and selection, softened to honey-tint for selected fills.
- Inter throughout, tight negative tracking on large headings, tabular figures everywhere.
- Generous 18px card radius, 12px control radius, 52px-tall touch targets.
- Real food photography and product shots, cropped into rounded frames.
- Lucide line icons at 13-21px.

## Colors

A restrained green-and-paper palette: one saturated bee accent, a honey-tint tint of it, two sparing signal colors, and warm neutrals.

### Primary
- **Bee brown** (`bee`): primary buttons, active toggles, focus rings, caret and form accent color, selected borders, links-as-actions, the brand mark tile, and the dark "feature panel" in Wallet.
- **Deep Bee brown** (`bee-dark`): hover state of the primary button only.
- **Honey tint Leaf** (`honey-tint`): selected fills (chosen plan card, chosen goal, kept receipt line, active tab), goal chips, step-number discs, icon tiles, the closing call-to-action band on Home, and the missing-photo fallback. Also the text selection color.

### Secondary
- **Carrot** (`carrot`): money lost and things removed: "Remove" actions, inline errors, "$X more" deltas, membership initials, and the small location dot beside "SALT LAKE CITY" in the header.
- **Amber Tint** (`amber-tint`): background of caveat and warning notes, always with ink text.

### Neutral
- **Paper Canvas** (`canvas`): page background, browser theme color, quantity stepper, secondary-button hover, quiet inset rows.
- **Surface White** (`surface`): cards, inputs, the bottom tab bar, full-bleed white bands.
- **Ink** (`ink`): headings and primary text.
- **Sage Muted** (`muted`): supporting copy, fine print, inactive tabs, field labels, placeholder text.
- **Hairline** (`line`): every 1px border and divider; the off state of toggles.

### Named Rules
**The Selected-Is-Honey tint Rule.** A chosen option is shown by a bee border plus a honey-tint fill (2px border on cards, 1px on rows), never by a shadow, a lift, or a different hue.

**The Carrot Means Cost Rule.** Carrot appears only where the user loses money, loses an item, or hits an error (the header location dot is the one brand use). It is never a decorative accent.

**The Amber Caveat Rule.** Warnings and limits sit in amber-tint notes with ink text; they are never set in carrot or in alert red.

## Typography

**Display Font:** Inter (via next/font, falling back to system-ui, sans-serif)
**Body Font:** Inter
**Label Font:** Inter

**Character:** One neutral grotesque carrying everything; large sizes pull tight (-0.5px to -1.1px tracking) and go bold, body stays regular at a comfortable 1.45 line height. Figures are tabular across the whole app so prices line up.

### Hierarchy
The scale is recorded as built from the Figma (10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 32, 34px), not a stricter ladder. Weights in use: 400, 500, 600 (most common), 700.
- **Display** (700, 34px, line-height 1, -1px): plan totals and the updated price on Scan. Money only.
- **Headline** (700, 32px, 1.12, -1.1px): the one page title per screen.
- **Headline Small** (700, 22-24px, 1.12, -0.5 to -0.6px): section headings on Home; 24px regular at 1.2 for the statement inside the Wallet feature panel.
- **Title** (400, 18px): section heads within app screens; 20px bold for single-sentence results ("No plan fits by 6:30 PM.", "3 prices saved.").
- **Title Strong** (600, 15px, 1.45): store names and item names in rows.
- **Body** (400 or 600, 14px, 1.45): button labels, choice rows, inputs, intro subtitles; 16px in the search field.
- **Body Small** (13px, 1.45): secondary paragraphs, toggle labels (600), text links (600, bee).
- **Caption** (12px, 1.45): row descriptions, warnings, the quantity readout (600).
- **Label** (11px, 1.45): fine print, tab labels, chips, hints. Status labels inside cards ("YOUR GOAL", "KEEP", "YOUR PLAN") are written uppercase with 0.6-0.8px tracking.
- **Label Small** (10px, 1.45): field labels ("LEAVE AT", "TIME LIMIT"), photo captions, leg metadata.
- **Wordmark** (400, 22px, -0.8px): "BeeLow" in the header only.

### Named Rules
**The Tabular Money Rule.** `font-variant-numeric: tabular-nums` is set on the body; every price, count and time inherits it. Do not override it.

**The One Family Rule.** Inter only. Hierarchy is built with size, weight and tracking, not with a second typeface.

## Layout

A single mobile column, max 480px wide and centered, with a 24px side gutter. The header is 78px tall; the bottom tab bar is fixed, 86px tall, and the main column reserves 118px of bottom padding for it (40px on the tab-less Home screen). Sections stack with a 24px gap; inside sections the dominant rhythm is 12px, with 8px for tight groups and 16px for list items. Cards pad 18px (14px for compact notes, 22px for the bee feature panel). Full-bleed bands (white or honey-tint) break out of the gutter with -24px margins and 32px vertical padding. Touch targets are 52px tall for buttons and choice rows, 56px for search, 36px for the quantity stepper.

**The One Column Rule.** Every screen is the same 480px column with 24px gutters; width never grows into multi-column layouts on larger screens.

## Elevation & Depth

Flat. There is no box-shadow, no blur and no gradient in the build. Depth is tonal: white surfaces on the warm canvas, separated by 1px hairlines; selection deepens to honey-tint with a bee border; the strongest emphasis is the solid bee feature panel. Focus is a 2px bee outline offset 2px.

**The Flat Paper Rule.** Surfaces sit flat on the canvas. Emphasis comes from fill (white, honey-tint, bee) and border weight, never from shadow or lift.

## Shapes

Soft, friendly rounding at a few fixed steps: 8px for chips and the quantity stepper; 10px for inputs, product thumbnails, icon tiles and the brand mark; 12px for buttons, choice rows, tabs and warning notes; 18px for cards and photographs (16px once for a small promo photo); full circles for toggles, step numbers and membership initials. Borders are 1px hairline by default and 2px bee for the selected or focused-by-design state (selected cards, the search field).

## Components

### Buttons
Full-width, calm and certain.
- **Shape:** gently rounded (12px), 52px tall, icon trailing with a 12px gap.
- **Primary:** bee fill, white 14px label; hover deepens to bee-dark; disabled at 50% opacity.
- **Secondary:** white fill, 1px hairline border, ink label; hover fills with canvas.
- **Text link action:** 13px semibold bee with a trailing arrow icon, no fill.
- **Destructive inline:** 12-13px semibold carrot text ("Remove").

### Chips
- **Style:** honey-tint fill, bee 11px semibold text, 8px radius, centered in a three-up grid (the goal names). Static; selection uses choice rows instead.

### Cards / Containers
- **Corner Style:** 18px.
- **Background:** white; selected cards switch to honey-tint with a 2px bee border.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px hairline.
- **Internal Padding:** 18px.
- **Caveat note:** amber-tint fill, ink 12px text, 10-12px radius.
- **Feature panel:** solid bee, white text, 18px radius, 22px padding; one per screen at most (Wallet's "Is Costco worth it?").

### Inputs / Fields
- **Style:** white fill, 1px hairline border, 10px radius, 10px by 12px padding, 14px text; labels above in 10-11px muted.
- **Search:** 56px tall, 2px bee border, 12px radius, leading search icon in muted, 16px text.
- **Focus:** global 2px bee outline, 2px offset; native controls take bee as accent color.

### Choice Rows (radio groups)
52px rows, 12px radius, 1px hairline on white; selected becomes bee border on honey-tint with a filled bee check-circle icon, unselected shows an empty muted circle.

### Toggle
46 by 26px pill; bee when on, hairline when off; 20px white knob that slides on a color and position transition.

### Quantity Stepper
36px canvas pill (8px radius) holding decrease, a "2 × 15 oz" readout in 12px semibold, and increase.

### Navigation
- **Header:** basket mark in a bee 10px-radius tile beside the 22px wordmark; a "SALT LAKE CITY" 11px muted tag with a carrot dot on the right.
- **Bottom tabs:** fixed white bar with a hairline top border, four equal tabs (List, Plans, Scan, Wallet) with 21px Lucide icons over 11px labels. Active tab: honey-tint fill, bee bold. Inactive: muted medium; hover fills canvas.

### Product Image
Product shots sit on canvas inside 10px-radius frames, scaled to contain; a missing photo falls back to a honey-tint panel with the name in 10px bee.

## Do's and Don'ts

### Do:
- **Do** use bee for exactly one primary action per view and for selection borders.
- **Do** mark selection with a bee border plus honey-tint fill (The Selected-Is-Honey tint Rule).
- **Do** keep every surface flat: white on canvas with 1px hairlines (The Flat Paper Rule).
- **Do** set money in the 34px bold display style and keep tabular figures on.
- **Do** keep buttons and choice rows at 52px tall with 12px radius.
- **Do** use Lucide line icons at 13-21px, and real food photography in 18px-radius frames.
- **Do** put caveats in amber-tint notes with ink text.

### Don't:
- **Don't** add box-shadows, blurs or gradients.
- **Don't** use carrot for decoration; it means cost, removal or error.
- **Don't** lighten muted below #75604d: it is 5.3:1 on honey-tint and 5.9:1 on canvas.
- **Do** keep honey #fbb424 for highlights and dots only, never for text on light grounds; savings amounts use leaf #4f7a14.
- **Do** use the logo (`public/beelow-logo.png`) as the wordmark; the name is BeeLow.
- **Don't** introduce a second typeface or a non-Inter display face.
- **Do** keep the Figma's small uppercase bee label (11px, 700, 1.2px tracking) above page titles; it is part of the team's design.
- **Don't** use typed characters as control icons; use Lucide icons.
