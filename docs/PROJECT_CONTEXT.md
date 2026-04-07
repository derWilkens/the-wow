# Superpowers Project Context

## Purpose

Superpowers is a workflow-modeling tool for documenting operational work. The product is centered around a visual canvas where users model activities, start/end events, sources, data objects, and the directional relationships between them.

The current product direction is:

- desktop-first
- workflow-modeling first
- pragmatic persistence over speculative platform features
- prefer strong core interactions before advanced collaboration features

## Product Principles

The implementation work so far followed these principles:

1. Use existing platform and library capabilities first.
2. Prefer a stable modeling experience over clever custom interaction layers.
3. Build features end-to-end through frontend, backend, and schema when they are core to the modeling experience.
4. Push non-essential schema-expanding ideas later if they are not required for core UX.
5. Keep the modeling canvas visually calm and reduce auxiliary UI when it distracts from process design.

## High-Level Architecture

Frontend:

- React 18
- Vite
- React Flow for the modeling surface
- TanStack Query for server-state loading and mutations
- Supabase JS for browser auth/session
- Zustand for lightweight local navigation state

Backend:

- NestJS
- Supabase server client for data access
- Supabase Auth token validation in the auth guard

Database:

- Supabase Postgres
- SQL migrations in `supabase/migrations`

## Current Functional Scope

Implemented core behavior:

- login and session handling
- workflow creation
- workflow canvas view
- default seed for new workspaces
- activities and datenspeicher as canvas nodes
- data objects as edge-attached transport artifacts
- directional edges with arrows
- exact edge handle persistence via `from_handle_id` / `to_handle_id`
- activity detail editing
- reusable IT-tool catalog with activity-level linking/unlinking
- source / data object editing
- deletion for activities and workflows
- workflow hierarchy and linked workflow relationships on the data model
- guided creation of a detailed child workflow from an activity
- linking an existing workflow to an activity
- breadcrumb navigation between parent and child workflows
- toolbar click insertion into the current viewport center
- smart insert for predictable linear modeling
- toolbar drag-and-drop insertion onto the canvas
- contextual data object insertion on a selected edge
- multiple data objects on a single edge
- edge-chip rendering for a single data object via edge labels
- aggregated icon-plus-count rendering when multiple data objects share one edge
- reusing existing data objects from the same workflow on another edge
- edge attribute editing after a connection already exists
- contextual toolbar guidance for data object insertion modes
- create or link existing IT tools directly from activity details
- IT tools persist across workflows and can be reused without duplication

## Terminology Direction

The product language is intentionally moving away from:

- `workspace`
- `subprocess`
- `process`

Toward:

- `Arbeitsablauf` in user-facing German UI
- `workflow` in technical design discussion

Important modeling decision:

- there is no separate business entity called `subprocess`
- a child workflow is still just a workflow
- parent/child and linked usage are modeled as relationships, not separate classes

Current naming guidance:

- user-facing German: `Arbeitsablauf`, `Detailablauf`, `Ablauf verknuepfen`
- technical code direction: `workflow`
- legacy internal names like `workspace` still exist in parts of the codebase and should be migrated gradually, not via one risky rename

Partially implemented or intentionally reduced:

- edge label editing exists in the data model, but the edge editing popup was removed to simplify the UI
- undo/redo groundwork exists in app state, but the canvas itself was recently simplified to remove extra React Flow interaction layers
- some earlier custom selection behavior was removed in favor of a more standard React Flow baseline

## Current UX Direction

The product is intentionally moving toward a cleaner modeling tool:

- fewer overlay panels
- fewer right-side status cards
- fewer canvas-only status banners
- less custom connector behavior
- more reliance on native React Flow interactions

The guiding idea is that the canvas should feel like a professional modeling tool, not a dashboard with a diagram inside it.

Recent UX decisions worth preserving:

- creating a connection to free canvas space should create a new activity at that drop point
- the created activity should appear immediately via optimistic UI
- the matching edge should also appear immediately and be persisted afterward
- deleting a selected node or edge should feel immediate in the UI, with backend cleanup happening in the background
- clicking an edge should visibly select it, and `Delete` / `Backspace` should remove it
- source-to-activity and activity-to-source connections should work the same way as activity-to-activity connections
- toolbar click should create immediately without opening edit dialogs
- toolbar drag-and-drop should place node center at drop point
- smart insert should only auto-connect in highly predictable cases
- data objects are no longer canvas nodes
- data objects remain independent backend objects, but are rendered as children of edges in the UI
- a selected edge can carry multiple data objects
- edge attributes exist, but they are intentionally edited after connection creation instead of during it

## Most Important Recent Technical Decision

The edge-position bug was caused by storing only:

- `from_node_id`
- `to_node_id`

instead of also storing:

- `from_handle_id`
- `to_handle_id`

React Flow correctly knows which connector was used at connection time, but if the handle IDs are not persisted, the next render must guess where the edge should attach. That caused edges to reconnect at the wrong side of a node.

This is now fixed end-to-end in frontend, backend, and schema.

Another important recent technical decision:

- do not introduce a separate business class called `subprocess`
- instead, model a child workflow as a normal workflow plus hierarchical and linked relationships
- schema support for this lives in `005_workflow_hierarchy.sql`

## What Not To Assume

- The current UI is not final.
- The current canvas interaction model has been intentionally simplified to regain stability.
- Some older product-completeness ideas in the specs are still aspirational and not yet implemented.
- The backend exists now, even though older repo files may still describe the project as frontend-only.
- Not every visible `workspace` identifier in the code is wrong right now; many are transitional legacy names during the move toward `workflow`.
