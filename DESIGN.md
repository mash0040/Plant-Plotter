---
name: Plant Plotter
description: A soft, practical garden-planning workbench for layouts, plant guidance, and care tracking.
colors:
  forest-nav: "#14532d"
  forest-nav-hover: "#166534"
  leaf-primary: "#16a34a"
  leaf-primary-hover: "#15803d"
  leaf-soft: "#dcfce7"
  garden-wash-emerald: "#ecfdf5"
  garden-wash-green: "#f0fdf4"
  garden-wash-lime: "#f7fee7"
  surface: "#ffffff"
  surface-muted: "#f9fafb"
  text-strong: "#111827"
  text: "#1f2937"
  text-muted: "#4b5563"
  text-subtle: "#6b7280"
  border-soft: "#e5e7eb"
  border-field: "#d1d5db"
  info: "#2563eb"
  warning: "#d97706"
  danger: "#dc2626"
typography:
  display:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "clamp(2.25rem, 6vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "normal"
  headline:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  title:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  3xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.leaf-primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.leaf-primary-hover}"
    textColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.leaf-primary-hover}"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.xl}"
    padding: "12px 12px"
---

# Design System: Plant Plotter

## Overview

**Creative North Star: "The Garden Workbench"**

Plant Plotter's current interface is a practical garden workbench: light, approachable, and task-ready. It uses a pale green garden wash behind sturdy white surfaces, with dark forest navigation anchoring the app and bright leaf green reserved for primary actions.

The system is intentionally friendly rather than ornamental. Cards, dialogs, and planner controls feel like tools laid out on a clean bench: rounded, touchable, softly lifted, and easy to scan while the user moves between planning, editing, saving, and tracking.

**Key Characteristics:**
- Pale emerald, green, and lime page gradients create the garden atmosphere.
- Dark forest navigation provides the strongest brand anchor.
- White and translucent white cards carry almost all working content.
- Rounded controls, circular icon wells, and soft shadows make actions feel tactile.
- Status and task colors are functional accents, not competing brand palettes.

## Colors

The palette is garden-led but utilitarian: forest and leaf greens define the product, while blue, amber, red, yellow, and purple appear as task and status signals.

### Primary
- **Forest Navigation**: Used for the fixed top navigation and footer, where the brand needs maximum contrast and stability.
- **Leaf Primary**: Used for primary actions such as sign in, create garden, save, and planner calls to action.
- **Leaf Soft**: Used for icon wells, selected states, success panels, and low-pressure garden affordances.

### Secondary
- **Information Blue**: Used for secondary actions, unit toggles, weather details, and edit actions.
- **Warning Amber**: Used for caution notes, session notices, and future-work or incomplete-state messaging.
- **Danger Red**: Used for destructive actions, errors, and delete confirmations.

### Tertiary
- **Planning Yellow** and **Soft Purple** appear as status or category accents in garden summaries, tracker metadata, and plant categories. They should stay supporting and data-driven.

### Neutral
- **Garden Wash**: The page background blends emerald, green, and lime tints to keep the app bright without leaving a plain dashboard canvas.
- **Surface White**: Primary content panels, cards, forms, menus, and modals sit on white or slightly translucent white.
- **Ink Gray**: Gray-900 through gray-500 carry headings, body text, helper text, placeholders, and disabled states.
- **Soft Borders**: Gray and green-tinted borders separate surfaces without making the interface feel heavy.

### Named Rules

**The Green Anchor Rule.** Every screen should have one clear green brand anchor, but not every component needs to be green.

**The Signal Color Rule.** Blue, amber, red, yellow, and purple are reserved for meaning: edit/info, warning, danger, planning, and category/status signals.

## Typography

**Display Font:** Geist, with Arial and sans-serif fallback
**Body Font:** Geist, with Arial and sans-serif fallback
**Label/Mono Font:** Geist Mono is loaded for technical or compact numeric use, but the current UI mostly uses Geist Sans.

**Character:** The typography is plainspoken and modern. It favors confident weights, compact labels, and readable body copy over decorative personality.

### Hierarchy
- **Display** (700, responsive 2.25rem to 3.75rem, tight line-height): Used for landing and auth hero statements.
- **Headline** (700, 1.875rem, tight line-height): Used for page titles and major form/auth headings.
- **Title** (600, 1.25rem, compact line-height): Used for cards, dialogs, tracker panels, and garden names.
- **Body** (400, 1rem, relaxed line-height): Used for explanatory copy and general interface text.
- **Label** (500, 0.875rem, normal tracking): Used for form labels, buttons, metadata, navigation, and compact controls.

### Named Rules

**The Plain Label Rule.** Labels should be short, literal, and user-facing; avoid internal model or database language.

## Layout

Plant Plotter uses a centered app shell with a fixed top navigation, a max-width content area, and generous page padding. Standard pages use `max-w-7xl` containers with responsive horizontal padding. The planner is the exception: it becomes a full-height working surface where the canvas and controls take priority over the global footer.

Most product screens use stacked sections on mobile, then two- or three-column grids on wider screens. Garden lists, summaries, and tracker panels use repeatable cards with consistent gaps. Forms and modals stay narrow enough for focused input, usually `max-w-md`, with internal spacing around 12px to 24px.

**The Work Surface Rule.** Use full-width working bands for planner and tracker layouts; use cards for discrete records, forms, dialogs, and repeated items.

## Elevation & Depth

Depth is soft and layered. The app uses shadows to lift cards, modals, dropdowns, and important buttons, often paired with white or translucent white surfaces and subtle borders. The depth is friendly and tactile, not dramatic.

### Shadow Vocabulary
- **Soft Card Lift**: Used for garden cards, tracker panels, forms, and summary cards.
- **Action Lift**: Used for primary buttons and hover states where an action should feel pressable.
- **Modal Lift**: Used for dialogs and overlays with stronger separation from the dimmed backdrop.

### Named Rules

**The Soft Lift Rule.** Shadows should make work surfaces feel touchable; avoid harsh contrast, heavy dark panels, or decorative glow as a default.

## Shapes

The shape language is rounded and approachable. Cards and major panels commonly use large rounded corners, while compact tool controls use medium rounded corners. Icon containers often use full circles to soften functional controls.

Borders are light and practical: green-tinted borders on garden-branded surfaces, gray borders on neutral inputs and toolbars, and red/amber/blue borders on semantic notices.

## Components

### Buttons
- **Shape:** Rounded, tactile controls with `12px` corners for primary form and page actions; compact toolbar buttons use `6px` to `8px` corners.
- **Primary:** Leaf green background with white text, medium or semibold weight, and 12px by 24px padding on full actions.
- **Hover / Focus:** Primary hover deepens to darker green. Inputs and controls use green or blue focus rings depending on context.
- **Secondary / Ghost:** Secondary buttons use white or gray backgrounds, tinted text, subtle borders, and quiet hover fills.
- **Touch Targets:** Frequently used controls use a minimum `44px` hit area for coarse pointers while remaining compact for fine pointers. Space-constrained planner-canvas controls may use a smaller visible control with an expanded hit area when a full `44px` control would overlap nearby plants.
- **Touch Discoverability:** Actions must not rely on hover visibility when the active input cannot hover. Keep touch actions visible or provide an immediately discoverable full-size action in the selected-item detail surface.

### Chips
- **Style:** Status and metadata chips use soft tinted backgrounds with darker semantic text.
- **State:** Selected chips and toggles use green or blue soft fills; inactive chips stay white or gray with light borders.

### Cards / Containers
- **Corner Style:** Large friendly corners, usually 12px to 16px.
- **Background:** White, white with opacity, or very pale green/gray for nested information.
- **Shadow Strategy:** Soft card lift at rest, slightly stronger lift on hover for clickable garden cards.
- **Border:** Green-100 or white/gray borders keep surfaces readable on the gradient background.
- **Internal Padding:** Compact cards use 16px; larger garden and summary cards use 24px to 32px.

### Inputs / Fields
- **Style:** White fields, gray 300 borders, 12px corners, gray placeholder text, and dark gray user text.
- **Focus:** Green focus rings are standard for forms; planner numeric controls may use blue focus rings.
- **Error / Disabled:** Errors use red text and pale red panels. Disabled fields keep readable gray text on muted gray backgrounds.

### Navigation

Navigation is the strongest brand block: a fixed forest-green bar with white links, a logo mark, rounded active states, and a dark green mobile drawer. Authenticated desktop navigation uses compact horizontal links; mobile navigation collapses into a simple menu.

### Signature Component: Garden Planner Controls

Planner controls are compact tool clusters: white backgrounds, gray borders, small icon buttons, numeric inputs, and selected states in soft green or blue. They should feel denser and more operational than landing or garden-list cards.

### Signature Component: Plant Library Item

Plant library items use category-tinted gradients, rounded containers, circular emoji wells, small metadata chips, and hover motion. This is the most expressive repeated component in the app and should keep its garden-category color logic.

## Do's and Don'ts

### Do:
- **Do** keep main app surfaces readable on the pale garden-gradient background.
- **Do** use leaf green for primary action and selection, especially when a user is moving forward or saving work.
- **Do** keep cards and modals softly lifted with rounded corners and subtle borders.
- **Do** use semantic colors for status, validation, warnings, and destructive actions.
- **Do** keep planner controls denser and more tool-like than marketing or auth surfaces.

### Don't:
- **Don't** replace the garden wash with a dark dashboard theme unless the user explicitly asks for a redesign.
- **Don't** use decorative color where the current system uses color to communicate state or category.
- **Don't** expose developer, database, or implementation labels in user-facing UI.
- **Don't** introduce a new UI library or unrelated component language without explicit approval.
- **Don't** make all green surfaces the same intensity; preserve the range from pale wash to forest anchor to leaf action.
