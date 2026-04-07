# Activity Data Model, Canvas Objects & Detail Popup — Design Spec (Plan 2a)

**Date:** 2026-03-31
**Branch:** feat/plan-1-foundation-canvas
**Status:** Approved

Historical note (2026-04-05):
- This spec is only partially current.
- `Datenobjekt` is no longer modeled as a freely placeable canvas node in the live product.
- The current product decision is: `Datenspeicher` remains a node, `Datenobjekt` is edge-attached only.
- IT tools are also no longer plain per-activity text tags; they are now reusable organization-scoped entities.

---

## Summary

Extend the activity data model with descriptive metadata, introduce two new canvas node types (Quelle, Datenobjekt), add an activity detail popup, and replace the existing ports/connections model with a simpler unified edge table.

---

## 1. Activity Type

New enum `activity_type_enum`: `'erstellen' | 'transformieren_aktualisieren' | 'pruefen_freigeben' | 'weiterleiten_ablegen'` — nullable (not every activity needs classification).

UI: 2×2 grid in the detail popup. Selecting `'pruefen_freigeben'` activates the mandatory Sollzustand section.

---

## 2. Extended Activity Fields

New nullable columns on `activities`:

| Column | Type | Description |
|---|---|---|
| `activity_type` | `activity_type_enum` | Classification (see §1) |
| `description` | `text` | Free-text description |
| `notes` | `text` | Internal notes |
| `duration_minutes` | `integer` | Estimated duration |

`owner_id` (already exists) maps to **Ausführende(r)** in the UI — no RACI for now.

---

## 3. New Canvas Node Types: Quelle & Datenobjekt

Two new node types stored in a new `canvas_objects` table — separate from activities.

### `canvas_objects` table

```sql
canvas_objects (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,  -- null = top level
  object_type     text NOT NULL CHECK (object_type IN ('quelle', 'datenobjekt')),
  name            text NOT NULL DEFAULT '',
  position_x      float NOT NULL DEFAULT 0,
  position_y      float NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now()
)
```

### Quelle

- Represents an IT system or external data source
- Visual: compact pill (cyan border), icon + name, single line
- No popup — name is edited inline (double-click on label)
- No data structure

### Datenobjekt

- Represents a data artifact flowing through the process
- Visual: compact rectangle (amber border), document icon + name, single line
- Double-click opens **Datenobjekt popup**: name + field editor
- Data structure defined via `object_fields` table (see §4)

### Toolbar buttons added

`[Quelle]` and `[Datenobjekt]` added to the compact header toolbar, after the existing separator following `[Ende]`.

---

## 4. Datenobjekt Data Structure

### `object_fields` table

```sql
object_fields (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  object_id   uuid NOT NULL REFERENCES canvas_objects(id) ON DELETE CASCADE,
  name        text NOT NULL,
  field_type  text NOT NULL CHECK (field_type IN ('text', 'integer', 'decimal', 'date', 'boolean')),
  required    boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 0
)
```

### Datenobjekt Popup

- Editable name field at the top
- List of fields: each row shows name, type dropdown, required toggle, delete button
- "+ Feld hinzufügen" at the bottom
- Changes saved on close (no explicit save button)

---

## 5. Canvas Edges (replaces ports + connections)

The existing `ports` and `connections` tables are replaced by a single `canvas_edges` table that covers all connections on the canvas.

```sql
canvas_edges (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id        uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_activity_id  uuid REFERENCES activities(id) ON DELETE CASCADE,
  from_node_type      text NOT NULL CHECK (from_node_type IN ('activity', 'canvas_object')),
  from_node_id        uuid NOT NULL,
  to_node_type        text NOT NULL CHECK (to_node_type IN ('activity', 'canvas_object')),
  to_node_id          uuid NOT NULL,
  label               text  -- optional label on activity→activity edges
)
```

Valid connection patterns:
- `activity → canvas_object` (datenobjekt): activity produces this data object
- `canvas_object (datenobjekt) → activity`: activity consumes this data object
- `canvas_object (quelle) → canvas_object (datenobjekt)`: this source provides this data object
- `activity → activity`: process flow (sequence)

ReactFlow edges are derived from this table on load. Changes are persisted immediately on connect/disconnect.

---

## 6. Sollzustand for Prüfen/Freigeben

When `activity_type = 'pruefen_freigeben'`, at least one Sollzustand reference is required before `status` can be set to `reviewed`.

```sql
activity_check_sources (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id     uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  canvas_object_id uuid NOT NULL REFERENCES canvas_objects(id) ON DELETE CASCADE,
  notes           text  -- optional context note
)
```

UI: Distinct "Sollzustand" section in the popup (purple highlight). Picker opens a dropdown of all `canvas_objects` in the current workspace. Save button disabled if section is empty.

---

## 7. Tools / Systeme

Simple text-tag list per activity — not linked to canvas objects (tools are operational context, not process flow).

```sql
activity_tools (
  activity_id  uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  tool_name    text NOT NULL,
  PRIMARY KEY (activity_id, tool_name)
)
```

UI: tag input in the popup. Typing shows existing `tool_name` values from the same workspace as suggestions (autocomplete). Users can add free-text entries.

---

## 8. Activity Detail Popup

Opened by **double-click on an activity node** (previously drill-in — now via `+` icon instead).

Sections (top to bottom):
1. **Bezeichnung** — editable text input (full width, prominent)
2. **Aktivitätstyp** — 2×2 grid selector
3. **Beschreibung** — textarea
4. **Notizen** — textarea
5. **Dauer (Min.) + Ausführende(r)** — two columns
6. **Tools / Systeme** — tag input
7. **Eingaben** — derived from canvas edges (incoming Datenobjekte), read-only list with optional per-link note
8. **Ausgaben** — derived from canvas edges (outgoing Datenobjekte), read-only list
9. **Sollzustand** — only visible when `activity_type = 'pruefen_freigeben'`; required picker

Footer: Cancel / Save. Save disabled if Sollzustand section is required but empty.

---

## 9. Navigation Change

| Interaction | Before | After |
|---|---|---|
| Double-click on activity node | Drill into sub-process | Open detail popup |
| Click `+` icon on activity node | — | Drill into sub-process |
| Double-click on empty canvas | Create new activity | Unchanged |

The `+` subprocess icon is already part of the ActivityNode design (subprocess marker bottom-right).

---

## 10. Database Migration

New migration `003_activity_metadata.sql`:

```sql
-- Activity type enum
CREATE TYPE activity_type_enum AS ENUM (
  'erstellen', 'transformieren_aktualisieren',
  'pruefen_freigeben', 'weiterleiten_ablegen'
);

-- Extend activities
ALTER TABLE activities
  ADD COLUMN activity_type activity_type_enum,
  ADD COLUMN description    text,
  ADD COLUMN notes          text,
  ADD COLUMN duration_minutes integer;

-- Canvas objects (Quelle + Datenobjekt)
CREATE TABLE canvas_objects ( ... );  -- see §3

-- Object fields (Datenobjekt schema)
CREATE TABLE object_fields ( ... );   -- see §4

-- Unified edges
CREATE TABLE canvas_edges ( ... );    -- see §5
-- Drop ports and connections tables (data migration: none, no existing data)
DROP TABLE IF EXISTS connections;
DROP TABLE IF EXISTS ports;

-- Sollzustand references
CREATE TABLE activity_check_sources ( ... );  -- see §6

-- Tools
CREATE TABLE activity_tools ( ... );  -- see §7
```

RLS policies: same pattern as `activities` — workspace owner has full access.

---

## 11. File Changes

| File | Change |
|---|---|
| `supabase/migrations/003_activity_metadata.sql` | New migration |
| `frontend/src/types/index.ts` | Add `ActivityType`, `CanvasObject`, `ObjectField`, `CanvasEdge`; extend `Activity` |
| `frontend/src/api/activities.ts` | Pass new fields in upsert |
| `frontend/src/api/canvasObjects.ts` | New — CRUD for Quelle/Datenobjekt |
| `frontend/src/api/canvasEdges.ts` | New — load/save edges |
| `frontend/src/components/canvas/SourceNode.tsx` | New — Quelle node |
| `frontend/src/components/canvas/DataObjectNode.tsx` | New — Datenobjekt node |
| `frontend/src/components/canvas/DataObjectPopup.tsx` | New — field editor popup |
| `frontend/src/components/canvas/ActivityDetailPopup.tsx` | New — activity detail popup |
| `frontend/src/components/canvas/WorkflowCanvas.tsx` | Register new node types, load edges, handle double-click |
| `frontend/src/components/canvas/ActivityNode.tsx` | Double-click → popup; `+` icon → drill-in |

---

## 12. Out of Scope (Plan 2a)

- Table view (Plan 2b)
- RACI (Consulted, Informed, Accountable)
- Edge labels on Datenobjekt→Activity connections (label lives on the Datenobjekt name)
- Version history of data structures
