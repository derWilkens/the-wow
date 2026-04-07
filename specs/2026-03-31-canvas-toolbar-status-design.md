# Canvas Toolbar, Auto-Seed & Activity Status Icon — Design Spec

**Date:** 2026-03-31
**Branch:** feat/plan-1-foundation-canvas
**Status:** Approved

Historical note (2026-04-05):
- This spec remains broadly directionally useful, but parts of the interaction model have evolved.
- Header, insertion behavior, and node taxonomy were expanded later.
- Gateway nodes, edge-backed data objects, transport mode settings, and role-lane grouping were added after this document.

---

## Summary

Extend the existing Activity Canvas with three interconnected features:

1. **Compact single-row header** — app name, workspace breadcrumb, and node toolbar in one bar
2. **Toolbar + auto-seed** — click-to-insert Start/Activity/End nodes; empty workspace pre-populated
3. **Activity status icon** — optional per-node status badge (bottom-left), set via hover+click palette
4. **Drag-from-connector** — dragging an unconnected handle creates a new Activity at drop position

---

## 1. Compact Header Bar

**Single `<header>` row** (height: 44px, `bg-slate-800`):

```
Way of Working  |  <Workspace Name>  |  [▶ Start]  [⬜ Aktivität]  [● Ende]  ·····  Abmelden
```

- **App name**: small muted label (`text-slate-400`, `text-xs`)
- **Separator** `|`: `text-slate-700`
- **Workspace breadcrumb**: `text-blue-400 font-semibold` — later becomes clickable nav
- **Separator** `|`
- **Toolbar buttons**: Start (green pill), Aktivität (blue rounded-rect), Ende (red pill) — same visual style as existing design mockups
- **Right side**: "Abmelden" text button

Replaces the existing separate nav + breadcrumb + toolbar rows.

---

## 2. Toolbar: Click-to-Insert

Clicking a toolbar button inserts the corresponding node at a free position on the canvas:

- **Start**: placed at `(80, 120)` if no Start node exists; otherwise near existing Start
- **Aktivität**: placed to the right of the rightmost existing node (`lastNode.x + 200, lastNode.y`)
- **Ende**: placed to the right of the rightmost existing node

Only one Start node and one End node should exist per canvas level — clicking Start/Ende when one already exists is a no-op (button visually disabled).

Node is persisted immediately via `useUpsertActivity`.

---

## 3. Auto-Seed on Empty Canvas

When a workspace is opened and `activities.length === 0`:

1. Create a Start node at `(80, 200)`
2. Create a first Activity node ("Neue Aktivität") at `(240, 200)`

Both are persisted to the database. This runs once, guarded by a ref (`autoSeededRef`) to prevent double-execution under React StrictMode.

**Node types stored in DB**: new `node_type` column on `activities` table — values: `'start' | 'end' | 'activity'`. Default: `'activity'`.

---

## 4. Start / End Nodes

Two new ReactFlow node types: `startNode` and `endNode`.

- **StartNode**: green circle (52×52px), play-triangle icon — not draggable to a subprocess, no label edit
- **EndNode**: red circle (52×52px), filled-circle icon
- Both have a single connector handle (Start: right only; End: left only)
- Neither shows the status icon

---

## 5. Drag-from-Connector to Create Activity

When the user drags from an Activity's **right (source) handle** and releases on empty canvas:

1. Show a ghost dashed line + placeholder node while dragging (ReactFlow `onConnectStart` / `onConnectEnd`)
2. On `onConnectEnd`: if `connectingNodeId` is set and target is not a node → create new Activity at drop coordinates, then create an edge from source → new node
3. New Activity is persisted and edge is stored in local state (edges are not yet persisted to DB in Plan 1)

Implementation uses ReactFlow's `onConnectStart` / `onConnectEnd` callbacks.

---

## 6. Activity Status Icon

### Data model

New nullable column: `activities.status_icon` — `text`, one of `'unclear' | 'ok' | 'in_progress' | 'blocked' | null`.

### Rendering (ActivityNode)

Bottom-left of the node card (`absolute bottom-1.5 left-1.5`):

| State | Visual |
|---|---|
| `null`, not hovering | Nothing shown |
| `null`, hovering | Dimmed dashed circle with `+` (opacity 35%) |
| `null`, clicked | Palette opens |
| `'unclear'` | Red circle, white `?` |
| `'ok'` | Green circle, checkmark SVG |
| `'in_progress'` | Purple circle, clock SVG |
| `'blocked'` | Orange circle, minus SVG |

### Palette

A small floating panel (`absolute bottom-6 left-0`, `z-50`) with 4 icon options + a "Entfernen" option if an icon is already set. Closes on outside click (`useEffect` with `mousedown` listener).

Clicking a palette option calls `useUpsertActivity` with the new `status_icon` value. Clicking "Entfernen" sets it to `null`.

---

## 7. Database Migration

Additive migration (no breaking changes):

```sql
-- Add node_type to activities
ALTER TABLE activities
  ADD COLUMN node_type text NOT NULL DEFAULT 'activity'
  CHECK (node_type IN ('start', 'end', 'activity'));

-- Add status_icon to activities
ALTER TABLE activities
  ADD COLUMN status_icon text
  CHECK (status_icon IN ('unclear', 'ok', 'in_progress', 'blocked'));
```

---

## 8. File Changes

| File | Change |
|---|---|
| `supabase/migrations/002_canvas_extensions.sql` | New migration (node_type, status_icon) |
| `frontend/src/types/index.ts` | Add `NodeType`, `StatusIcon` types; extend `Activity` |
| `frontend/src/components/layout/AppHeader.tsx` | New compact header component |
| `frontend/src/components/canvas/StartNode.tsx` | New node type |
| `frontend/src/components/canvas/EndNode.tsx` | New node type |
| `frontend/src/components/canvas/StatusIconBadge.tsx` | Badge + palette |
| `frontend/src/components/canvas/ActivityNode.tsx` | Add StatusIconBadge, adjust padding |
| `frontend/src/components/canvas/WorkflowCanvas.tsx` | Register new node types, auto-seed, drag-from-connector, toolbar insert handlers |
| `frontend/src/api/activities.ts` | Pass `node_type`, `status_icon` in upsert payload |
| `frontend/src/App.tsx` | Replace nav with AppHeader |

---

## 9. Out of Scope (Plan 1)

- Edge persistence to database
- Multiple Start/End nodes
- Undo/redo
- Icon filtering / global status overview
