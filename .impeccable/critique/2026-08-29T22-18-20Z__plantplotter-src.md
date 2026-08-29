---
target: plantplotter/src
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-08-29T22-18-20Z
slug: plantplotter-src
---
Method: dual-agent (A: 01a04f95-d7fe-7431-ba39-f8c28827b588 · B: 01a04f95-ef31-7b12-9ac2-19c81874a818)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading, error, success, and unsaved states are present, but planner save/result feedback can be peripheral. |
| 2 | Match System / Real World | 3 | Garden language is mostly clear; "grid units," fixed coordinates, and technical fallback copy weaken it. |
| 3 | User Control and Freedom | 2 | Cancel, back, and delete confirmations exist; undo, keyboard escape, and recovery paths are uneven. |
| 4 | Consistency and Standards | 2 | Palette and card language are cohesive, but action colors, dimensions, labels, and modal patterns drift. |
| 5 | Error Prevention | 3 | Good validation, disabled states, destructive confirmations, overlap checks, and bounds checks. |
| 6 | Recognition Rather Than Recall | 2 | Main actions are visible, but hover/title-only controls hide important affordances. |
| 7 | Flexibility and Efficiency | 2 | Search, quick logs, and row planting help; shortcuts, batch flows, favorites, and expert accelerators are missing. |
| 8 | Aesthetic and Minimalist Design | 2 | Pleasant foundation, but many equal-weight cards, legends, controls, and action clusters compete. |
| 9 | Error Recovery | 3 | Most errors are plain and recoverable with retries or links; some generic/global error patterns remain. |
| 10 | Help and Documentation | 1 | Inline hints exist, but planner and tracker lack contextual help for core concepts. |
| **Total** | | **23/40** | **Acceptable: solid foundation, significant UX simplification needed.** |

## Design Specificity Verdict

Plant Plotter is partially product-specific. Its core workflows have real garden DNA: the planner, plant library, row planting, footprint sizing, companion guidance, care logs, and weather advice feel meaningfully tied to garden planning. The surrounding shell is less authored: green gradients, white rounded cards, icon circles, and CRUD action grids could fit many productivity apps.

Assessment A saw the planner/library as the strongest expression of the product and the landing/auth/settings/dashboard shell as the weakest. Assessment B added 9 detector warnings: 2 gray-on-color warnings, 3 bounce/elastic motion warnings, and 4 AI-palette warnings. The detector agrees with the subjective read that the planner drag overlay and purple gradients are where the visual system drifts furthest from the calmer Garden Workbench language.

Browser overlays were not available because this session exposes no dedicated browser automation tool. No user-visible overlay was injected.

## Overall Impression

The app has a kind, usable base and more product substance than the visuals currently reveal. The biggest opportunity is to make the planner and tracker feel deliberately designed around gardening work instead of presenting every available control at once.

## What's Working

- Honest state coverage is a strength: loading, empty, error, disabled, success, and delete-confirmation states appear across gardens, tracker, auth, and profile.
- The planner contains the best product ideas: placement validation, duplicate confirmation, row planting, companion hints, and footprint previews all belong specifically to garden planning.
- The design system is coherent enough to build on: forest navigation, pale garden backgrounds, white cards, rounded controls, and semantic status colors repeat across surfaces.

## Priority Issues

**[P1] Planner control hierarchy is too dense**

**Why it matters:** The planner should be the app's emotional peak, but `ControlPanel.jsx` exposes grid, ruler, save, unit, width, height, zoom, plant library access, and back navigation as near-equal controls. First-time users have to decode the tool before they experience the garden.

**Fix:** Restructure the toolbar into clear zones: primary `Save Layout`, secondary `Plants`, collapsed `View`, collapsed `Garden size`, and collapsed `Zoom`. Add an empty-canvas prompt in `GardenCanvas.jsx` that points users to the next action before showing every tool.

**Suggested command:** `$impeccable layout plantplotter/src/components/Garden/ControlPanel.jsx`

**[P1] Key controls rely on hover/title behavior**

**Why it matters:** Touch, keyboard, and screen-reader users lose discoverability. Plant item actions in `PlantLibraryItem.jsx`, remove/edit controls in the planner, and activity edit/delete controls in `TrackingCalendar.jsx` depend heavily on hover visibility, small icons, and `title` text.

**Fix:** Add explicit `aria-label`s, visible focus states, keyboard-operable menus or selected states, and persistent mobile affordances for edit/delete/remove actions. Keep hover polish, but make the action available without hover.

**Suggested command:** `$impeccable audit plantplotter/src`

**[P1] Tracker has too many simultaneous jobs**

**Why it matters:** The tracker page presents garden selector, quick log, calendar, weather, create task, today, overdue, and upcoming at once. Users must decide whether they are logging care, reviewing history, planning future work, or checking weather before the UI tells them what matters now.

**Fix:** Make selected-date care the center of the screen: a "Today's care" or selected-day agenda panel first, calendar second. Collapse Upcoming and Overdue into tabs or accordions. Move weather into a compact advisory strip unless opened.

**Suggested command:** `$impeccable distill plantplotter/src/app/tracker/page.jsx`

**[P2] Product language leaks implementation concepts**

**Why it matters:** Terms like "grid units," fixed latitude/longitude coordinates, and plant-ID mismatch explanations make the app feel engineered rather than garden-native. They also ask novice users to diagnose implementation details.

**Fix:** Translate to user language: "garden squares," "No companion matches yet," "Demo weather location," and "Current garden summary." Keep technical precision in code and docs, not normal UI copy.

**Suggested command:** `$impeccable clarify plantplotter/src`

**[P2] Visual system is cohesive but generic**

**Why it matters:** Many surfaces still read as a green CRUD dashboard: white cards on pale gradients with icon wells and standard Tailwind action clusters. That is clean, but it undersells the portfolio goal and the product's actual garden-planning specificity.

**Fix:** Push the Garden Workbench idea into structure: make operational surfaces denser and more tool-like, reduce decorative leaf marks, use real garden-layout previews, and distinguish planner/tool panels from summary cards.

**Suggested command:** `$impeccable bolder plantplotter/src/app/garden/page.jsx`

## Persona Red Flags

**Jordan (First-Timer):** "Garden Planner" can lead to choosing a garden and then a toolbar full of Grid, Ruler, Zoom, Size, and unit controls. Row planting asks for X/Y coordinates without a visual coordinate picker. The companion empty state explains plant-ID mismatch causes Jordan cannot act on.

**Sam (Accessibility-Dependent User):** Calendar days are clickable grid cells rather than obvious buttons. Drag/drop is central. Several edit/delete/remove controls are hidden until hover or represented by title-only icon buttons. The weather widget is wrapped in a clickable `div`, which weakens keyboard and semantic behavior.

**Casey (Distracted Mobile User):** Important planner actions sit at the top, the plant library becomes a drawer, drag is disabled on touch, and mobile users are told to use row planting instead. Long modals like task creation and row planting require sustained attention and precise inputs.

## Minor Observations

- Auth fields use placeholders and `aria-label`s but lack visible labels, so they are less scannable.
- Profile/account UI may show role-like information that reads as internal metadata.
- Success messages auto-dismiss after a few seconds; low-stakes operations can tolerate that, but saves/deletes may need more durable confirmation.
- Dark-mode classes appear in tracker components even though the documented design system is light-first.
- Detector warnings around purple/pink gradients may be acceptable for flower/category semantics, but the weather modal purple gradient looks less tied to the documented system.

## Questions to Consider

- What if the planner opened with one unmistakable empty-state action, "Add plants," and everything else waited until after the first plant was placed?
- Is the tracker meant to be a daily care cockpit or a historical calendar? Right now it is trying to be both at equal volume.
- Should the portfolio impression prioritize breadth of features, or should one workflow feel exceptionally polished first?
- What would make the interface feel less like a green dashboard and more like a purposeful garden workbench?
