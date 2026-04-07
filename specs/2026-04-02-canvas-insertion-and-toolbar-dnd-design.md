# Canvas Insertion And Toolbar Drag-and-Drop - Design Spec

**Date:** 2026-04-02
**Status:** Draft
**Builds on:** `2026-03-30-wayofworking-design.md`, `2026-03-31-canvas-toolbar-status-design.md`, `2026-04-01-product-completeness-design.md`

Historical note (2026-04-05):
- The insertion model is still the closest description of the live product.
- One important later product decision supersedes parts of this text:
  - `Datenobjekt` no longer falls back to free insertion.
  - It is now intentionally modeled only as an edge-attached artifact.

---

## Overview

This addendum defines a single, consistent insertion model for all canvas elements:

- Start
- Activity
- End
- Source
- Data object
- later also gateways and other node types

The goal is to make object creation feel predictable, direct, and close to professional whiteboard / modeling tools.

Important exception:

- a `Data object` is not only a freely placeable node
- it is also a transported artifact that can be attached to an existing connection
- in that attached mode, it expresses what is passed from one step or storage object to the next

The three canonical creation modes are:

1. **Toolbar click**
   - inserts the selected element into the center of the current viewport
2. **Toolbar drag-and-drop**
   - user drags the element from the toolbar onto the canvas
   - the element is created exactly where it is dropped
3. **Smart insert**
   - if a compatible node is currently selected, toolbar click becomes contextual
   - the new node is inserted relative to that selection
   - an obvious connecting edge is created automatically

Creation should be immediate and should **not** open a detail popup.

---

## Product Decision

### Primary rule

For all node-like elements, creation follows the same mental model:

- click = place in current view center
- drag = place exactly where dropped

When a compatible node is selected, click may become **smart insert**:

- click = place relative to the selected node and auto-connect

This replaces mixed behaviors such as:

- some elements opening detail popups immediately
- some elements being inserted at the right edge
- some elements being created with inconsistent rules

But it intentionally keeps one highly productive contextual exception:

- smart insert from a selected compatible node

The user should always know:

- where the new object will appear
- that it appears immediately
- that editing is a separate action, not forced on creation

---

## UX Rationale

This model is preferable because it is:

- easier to learn
- spatially consistent
- compatible with both quick modeling and precise placement
- closer to how users expect canvas tools to behave
- dramatically faster for building linear flows

Business users should not have to mentally parse different creation rules for different object types.

---

## Canonical Behaviors

## Toolbar Click

When the user clicks a toolbar item:

- the current React Flow viewport center is read
- the new node is inserted at that center position
- the node is created immediately
- no detail popup opens
- the canvas view itself does not jump

This is the default behavior when no compatible smart-insert context is active.

### Placement detail

The inserted node should be centered visually in the current viewport, not aligned by its top-left corner.

This means:

- compute viewport center in flow coordinates
- subtract half of the node's standard width and height
- store the resulting top-left position

### Selection

After insertion:

- the new node may become selected
- but selection must not automatically open a modal or side panel

This keeps keyboard delete, move, and connection flows smooth.

---

## Data Object As Transported Artifact

## Core idea

A data object is a fachliches Objekt that is typically transported between two other elements:

- activity
- source
- later possibly storage-like objects

So a data object has two valid representations:

1. **free canvas object**
   - created like other nodes
   - can be positioned on the canvas
2. **attached data object on a selected edge**
   - created in direct relation to an existing connection
   - visually rides "huckepack" on that connection
   - semantically becomes output of the upstream node and input of the downstream node

This means data objects are not just decorative annotations. They represent transferred information.

## New insertion rule for data objects

If the user has a connection selected and clicks `Datenobjekt` in the toolbar:

- the data object is inserted onto that connection
- the data object icon is rendered in relation to the selected edge
- no detail popup opens
- the user can open the detail dialog later via double-click on the icon

At the same time:

- the upstream element gains this data object as output
- the downstream element gains this data object as input
- direction depends on the edge direction

### Example

If there is a selected edge:

- `Aktivitaet A -> Aktivitaet B`

and the user clicks `Datenobjekt` in the toolbar:

- a data object icon appears on that edge
- semantically:
  - `Aktivitaet A` produces the data object
  - `Aktivitaet B` receives the data object

## Visual behavior

The attached data object should:

- sit clearly on or near the selected edge
- be visible as a small icon or compact node representation
- not disrupt the legibility of the flow line

Recommended first version:

- render a compact data object icon centered on the selected edge
- allow double-click on the icon to open the existing data object detail dialog

## User guidance

The edge-attached data object flow should be made understandable through contextual guidance, not through long explanations.

### Toolbar hint when no edge is selected

If no suitable edge is selected and the user hovers over `Datenobjekt` in the toolbar:

- show a small hover flag / tooltip:
  - `Markiere zuerst die Verbindung, auf der das Objekt transportiert wird`

This hint should be:

- short
- visible near the toolbar control
- purely contextual
- not modal

### Toolbar hint when an edge is selected

If an edge is selected and the user hovers over `Datenobjekt`:

- show the contextual tooltip:
  - `Datenobjekt auf markierter Verbindung einfuegen`

This makes the mode switch visible without forcing the user to read documentation.

### Behavioral guidance

The button should not be fully disabled when no edge is selected.

Reason:

- disabled controls are easy to overlook
- a live button with contextual instruction teaches the interaction model better

Recommended first version:

- hover shows the tooltip
- click without selected edge falls back to normal free insertion behavior

If product testing later shows that users confuse the two modes, this can be tightened. But the first version should favor discoverability.

### Selection

When created from a selected edge:

- the new data object may become selected
- the edge may remain visually associated until the next explicit selection

## Editing behavior

Creating the attached data object does not open the detail dialog.

Editing happens only via explicit action:

- double-click the data object icon

This preserves the same no-popup-on-create rule as the rest of the insertion model.

## Semantic rule

Creating a data object on an edge should update the model in two ways:

1. visually
   - render the data object in association with the edge
2. semantically
   - set the data object as output of the source side
   - set the data object as input of the target side

This should be based strictly on edge direction.

### Important principle

The data object belongs to the transfer, not just to one isolated node.

That is why edge-based insertion is the most meaningful creation path for many real flows.

---

## Smart Insert

## Core idea

Toolbar click should become context-aware when the user's next step is highly predictable.

### Baseline rule

- if nothing is selected:
  - toolbar click inserts into the viewport center
- if a compatible node is selected:
  - toolbar click inserts relative to that node
  - the system creates the obvious connecting edge automatically

### Example

If activity A is selected and the user clicks `Aktivitaet` in the toolbar:

- activity B is created to the right of activity A
- an edge from A to B is created automatically
- activity B becomes the selected node

This allows users to build:

- `Start -> Aktivitaet 1 -> Aktivitaet 2 -> Ende`

with repeated toolbar clicks and without manually drawing each edge.

## Smart Insert Rules

### Case 1 - No selection

- insert into viewport center
- no automatic edge

### Case 2 - Start selected and user clicks `Aktivitaet`

- create new activity to the right of the start node
- create edge automatically
- select the new activity

### Case 3 - Activity selected and user clicks `Aktivitaet`

- create new activity to the right of the selected activity
- create edge automatically
- select the new activity

### Case 4 - Activity selected and user clicks `Ende`

- create end node to the right of the selected activity
- create edge automatically
- select the end node

### Case 5 - Selection is incompatible or ambiguous

If the selected node does not make the intended next relation obvious:

- fall back to viewport-center insertion
- do not create an automatic edge

Examples:

- source selected and user clicks `Aktivitaet`
- data object selected and user clicks `Ende`
- end selected and user clicks `Aktivitaet`

### Case 6 - Edge selected and user clicks `Datenobjekt`

- create a data object on that edge
- do not insert into viewport center
- do not create a new edge
- mark the source side as output owner
- mark the target side as input owner
- do not open popup automatically

### Important principle

Smart insert should only fire when user intent is highly predictable.

When in doubt:

- insert normally
- do not auto-connect

## Placement rules for smart insert

When smart insert is active:

- the new node is placed to the right of the selected node
- the new node keeps the vertical alignment of the selected node
- a consistent horizontal gap is used

### Recommended gap

- start with `180px` to `220px` between node frames

### Edge behavior

- source handle: right side of selected node
- target handle: left side of inserted node
- node and edge render immediately
- persistence happens afterward

This should reuse the existing optimistic node/edge pattern already used elsewhere in the canvas.

---

## Toolbar Drag-and-Drop

When the user drags an element from the toolbar onto the canvas:

- a drag preview is shown
- on drop, the element is created at the pointer position
- the pointer position maps to the visual center or anchor of the node, depending on node type
- no detail popup opens

### Placement detail

For ordinary node creation from the toolbar:

- use the visual center of the node at the drop point

This differs from the existing connector-based creation flow:

- when a new activity is created from an edge drop, the relevant connector should land at the drop point
- this special connector-aware behavior remains valid for edge-driven creation

So there are two placement rules:

1. toolbar drag/drop:
   - node center lands at pointer
2. edge drag/drop:
   - matching connector lands at pointer

These are both intuitive in their own contexts.

---

## No Popup On Creation

### New rule

Creating a node never opens a detail dialog automatically.

This applies to:

- toolbar click
- toolbar drag-and-drop
- smart insert
- node creation from edge drop

### Why

Auto-opening detail popups interrupts modeling flow:

- users often want to place several nodes first
- then connect them
- then edit details afterward

Forced popups slow down exploration and feel heavy.

### Editing remains available via explicit action

Editing should be triggered by explicit interaction only:

- double-click node
- dedicated edit affordance
- context menu action

---

## Consequences For Other UI Elements

## Toolbar

The toolbar now has three roles:

1. quick click insertion
2. drag source for precise placement
3. fast sequential modeling through smart insert

For `Datenobjekt`, toolbar click gains an additional contextual case:

- if an edge is selected, `Datenobjekt` should attach to that edge instead of being placed as a free node

### Implications

- every insertable element in the toolbar must be draggable
- toolbar buttons must still support click
- drag affordance should be visually clear but subtle
- button press should not accidentally trigger click insertion when user intended drag
- toolbar click must first evaluate whether smart insert should apply
- for `Datenobjekt`, toolbar click must also evaluate whether an edge-attached insertion context is active
- the toolbar should communicate this context through tooltip text, not by opening a modal

### Recommended interaction

- `pointerdown` starts drag candidate
- short movement threshold distinguishes drag from click
- click without movement inserts in viewport center unless smart insert applies

---

## Canvas

### Required behavior

- canvas must accept external drops from the toolbar
- drop coordinates must convert from screen to flow coordinates
- current zoom and pan must be respected
- selected edges must be available as insertion context for attached data objects

### Important stability rule

Creating a node must not:

- reset viewport
- change zoom
- remount React Flow
- open unrelated overlays

This is especially important because the current product already had viewport reset issues when the canvas remounted.

---

## Node Selection

Selection should remain lightweight.

After creation:

- the new node may be selected
- but not put into editing mode automatically

This supports immediate follow-up actions such as:

- moving the node
- connecting it
- deleting it
- continuing a smart-insert sequence

For edge-attached data objects:

- edge selection becomes more important, because it is now an insertion target

---

## Detail Panels / Popups

Detail panels become a secondary, explicit action.

### Updated role

Popups are for:

- editing labels
- editing metadata
- editing tools, checks, fields

Popups are not part of the insertion flow.

For edge-attached data objects specifically:

- double-click on the inserted icon opens the detail dialog

### Benefit

This separates:

- **model structure creation**
- **semantic detail editing**

That separation is clearer for business users.

---

## Connector-Based Creation

The existing "add node on edge drop" behavior should remain, but it now belongs to a clear family of insertion rules.

### Rules

- dropping a connection onto empty canvas:
  - creates a new activity
  - places it so the matching target connector lands at the drop point
  - renders node and edge immediately
  - persists afterward
- dropping a connection on an existing valid target:
  - creates only the edge
  - does not create a new node

### No popup

This flow also does not open the activity detail popup.

---

## Hierarchy / Detailed Workflow Creation

The `+` on an activity remains a different interaction family.

It should **not** be conflated with generic node insertion.

### Distinction

- Toolbar:
  - structural node creation
- `+` on activity:
  - create or link a detailed workflow for that activity

This distinction should stay sharp in the UI.

Smart insert must not be overloaded with workflow-hierarchy creation. The `+` action on an activity remains the dedicated entry point for creating or linking a detailed workflow.

---

## Accessibility / Keyboard Impact

The click-to-insert behavior supports keyboard-triggered toolbar usage naturally.

### Recommendation

- toolbar items remain real buttons
- `Enter` / `Space` on a focused toolbar item inserts into viewport center or triggers smart insert if the current selection is compatible
- drag-and-drop remains pointer-first, with no requirement to fully keyboard-replicate exact placement in phase 1

This gives good baseline accessibility without overcomplicating the first implementation.

---

## Data Model Impact

No database changes are required for this decision.

This is a frontend interaction and placement rule.

The only data written remains the existing node records:

- `position_x`
- `position_y`
- other existing fields per node type

---

## API Impact

No new endpoints are required.

Existing create/upsert endpoints are sufficient.

The implementation only changes:

- how initial positions are calculated
- when popups are opened
- how toolbar drag-and-drop is handled
- when the system auto-creates an edge during toolbar click insertion
- when `Datenobjekt` click resolves against a selected edge instead of free insertion
- how semantic input/output ownership is derived from a selected edge

Depending on the current backend representation of input/output relationships, a later schema/API refinement may still be useful. The interaction model should be designed now even if some semantic persistence fields are deferred.

---

## Implementation Plan

## Phase 1 - Normalize creation behavior

1. Remove remaining auto-popup behavior on creation
2. Centralize node insertion helpers:
   - insert at viewport center
   - insert at toolbar drop position
   - insert from connector drop
   - insert via smart insert relative to selected node
   - insert `Datenobjekt` onto selected edge
3. Ensure all insertable toolbar items use the same helper family

## Phase 2 - Toolbar drag-and-drop

4. Make toolbar items draggable
5. Add drag preview
6. Accept drop on canvas and translate coordinates correctly
7. Prevent accidental click creation after a drag

## Phase 3 - Smart insert sequencing

8. Detect compatible selection state
9. Insert node relative to current selection
10. Auto-create connecting edge optimistically
11. Select inserted node so repeated clicks continue the chain

## Phase 4 - Edge-attached data objects

12. Detect selected-edge insertion context for `Datenobjekt`
13. Insert compact data object on selected edge
14. Open details only on explicit double-click
15. Map edge direction to output/input semantics

## Phase 5 - Stabilization

16. Verify viewport does not reset on insert
17. Verify zoom does not change on insert
18. Verify no detail popup opens on any creation path
19. Verify smart insert does not create duplicate edges
20. Verify edge-attached data objects remain correctly associated after reload

---

## Test Strategy

The insertion model should be validated at three levels.

## 1. Unit / component-level

Test:

- toolbar click computes center insertion coordinates
- toolbar drop computes drop insertion coordinates
- auto-popup is not triggered after create
- connection-drop create still uses connector-aware placement
- smart insert computes relative placement correctly
- smart insert only activates for compatible node selections
- edge-selected data object insertion creates attached placement instead of free placement
- no detail popup opens when creating a data object from an edge
- toolbar tooltip changes depending on whether an edge is selected

## 2. Integration

Test:

- React Flow viewport center is read correctly
- screen-to-flow conversion works at non-default zoom values
- toolbar drag/drop and connector drag/drop do not interfere with each other
- smart insert creates node and edge optimistically
- repeated smart insert can build a linear chain without interruption
- edge-attached data object creation maps source and target semantics correctly

## 3. End-to-end

Test real user flows:

- click toolbar item -> node appears in viewport center
- drag toolbar item -> node appears at drop location
- create several nodes quickly without any popup interruption
- connect nodes afterward
- reload and verify persisted positions
- build a simple linear flow by repeatedly clicking toolbar buttons on selected nodes
- attach a data object to a selected edge and verify semantic direction

---

## Proposed Test Scripts

## `toolbar-click-insert.spec.ts`

Flow:

1. Login
2. Open workflow
3. Pan / zoom to a non-default viewport
4. Click `Aktivitaet` in toolbar
5. Assert new activity appears roughly in the viewport center
6. Assert no popup is visible

## `smart-insert-sequence.spec.ts`

Flow:

1. Login
2. Open workflow
3. Select `Start`
4. Click `Aktivitaet` in toolbar
5. Assert new activity appears to the right of `Start`
6. Assert connecting edge exists immediately
7. Assert new activity is selected
8. Click `Aktivitaet` again
9. Assert second activity appears to the right of the first
10. Assert second connecting edge exists
11. Assert no popup appeared during the sequence

## `toolbar-drag-insert.spec.ts`

Flow:

1. Login
2. Open workflow
3. Drag `Quelle` from toolbar to a specific canvas location
4. Assert source appears at drop location
5. Assert no popup is visible

## `mixed-insertion-flow.spec.ts`

Flow:

1. Insert one activity by toolbar click
2. Insert one source by toolbar drag/drop
3. Create a third activity via edge-drop on empty canvas
4. Assert all three appear immediately
5. Assert no detail popup opened during any creation step
6. Select the created activity and click `Ende`
7. Assert end node appears to the right and is auto-connected

## `edge-attached-data-object.spec.ts`

Flow:

1. Login
2. Open workflow
3. Create or select an edge between two activities
4. Click `Datenobjekt` in toolbar
5. Assert data object icon appears on the selected edge
6. Assert no popup is visible
7. Double-click the icon
8. Assert detail dialog opens
9. Reload
10. Assert data object remains associated with the same directional relation

## `viewport-stability-on-insert.spec.ts`

Flow:

1. Open workflow
2. Zoom and pan to a custom viewport
3. Create node via toolbar click
4. Create node via toolbar drag/drop
5. Use smart insert once
6. Assert viewport zoom remains unchanged
7. Assert viewport position remains stable

---

## Open Design Decisions

These are the only meaningful open questions for implementation, and they can be resolved without changing the main concept:

1. Toolbar drag preview style
   - ghost chip vs simplified node preview
2. Exact anchor for toolbar drag/drop
   - node center vs type-specific visual anchor
3. Whether newly inserted nodes should always become selected
4. Which toolbar and node combinations should activate smart insert versus neutral insertion
5. Exact visual representation of an edge-attached data object
6. Whether semantic output/input mapping is persisted immediately or staged until a later schema refinement

My recommendation:

- use a simple ghost preview first
- use node center for toolbar drag/drop
- select newly inserted nodes, but do not open details
- enable smart insert only for obvious linear flow cases:
  - Start -> Aktivitaet
  - Aktivitaet -> Aktivitaet
  - Aktivitaet -> Ende
- treat `Datenobjekt` as edge-attached by default when an edge is selected
- use a compact icon on the edge for the first version

---

## Recommendation

Adopt this as the canonical insertion model for the entire canvas.

It will:

- reduce surprise
- speed up modeling
- simplify mental models
- align the tool more closely with established canvas interaction patterns
- create a very fast click-to-build path for business users

It also fits well with the existing direction of the product:

- fewer forced overlays
- more direct manipulation
- clearer separation between structure and detail
