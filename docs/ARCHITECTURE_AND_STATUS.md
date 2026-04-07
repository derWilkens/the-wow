# Architecture And Status

## Folder Layout

Hinweis:

- die uebergeordnete Teststrategie ist in `docs/TEST_STRATEGY.md` beschrieben

- `frontend`
  - React/Vite application
  - React Flow canvas
  - auth screen
  - workspace list
  - API hooks and UI state
- `backend`
  - NestJS API
  - auth guard
  - workspace / activity / canvas object / canvas edge endpoints
- `supabase/migrations`
  - database schema history
- `supabase/scripts`
  - destructive or operational SQL scripts for admin/reset tasks
- `specs`
  - product/design source documents
- `plans`
  - earlier planning documents

## Frontend Important Files

- `frontend/src/App.tsx`
  - main app composition
  - organization/workspace loading
  - seeding
  - mutations for activities, objects, edges
  - optimistic UI for create/connect/delete flows
  - workflow hierarchy navigation
- `frontend/src/components/canvas/WorkflowCanvas.tsx`
  - React Flow integration
  - simplified canvas wrapper that stays close to native React Flow behavior
  - native connect flow plus add-node-on-edge-drop behavior
- `frontend/src/components/canvas/FloatingCanvasToolbar.tsx`
  - left floating toolbar for canvas tools
  - compact icons with hover/focus expand-to-the-right labels
  - preserves stable insert test IDs for browser tests
- `frontend/src/components/canvas/WorkflowEdge.tsx`
  - renders edge-attached data objects as a named single chip or aggregated icon+count
  - supports hover names and an edge-local management popover
  - keeps data objects on edges instead of as nodes
- `frontend/src/components/canvas/EdgeDetailPanel.tsx`
  - edits edge transport attributes after creation
  - adds new or existing data objects to the selected edge
  - uses the shared custom choice list for transport mode selection
- `frontend/src/components/canvas/ActivityDetailPopup.tsx`
  - activity editing
  - assignee selection, comments, IT tools
  - uses the shared custom choice list for several selectors
- `frontend/src/components/canvas/DataObjectPopup.tsx`
  - source/data object editing
  - optimistic save/delete close behavior
- `frontend/src/components/ui/CustomChoiceList.tsx`
  - reusable product-styled picker with descriptions, badges, search, and optional inline create
- `frontend/src/components/canvas/SubprocessMenu.tsx`
  - menu behind the `+` button on activities
- `frontend/src/components/canvas/SubprocessWizard.tsx`
  - guided creation of a detailed child workflow
- `frontend/src/components/canvas/LinkWorkflowModal.tsx`
  - linking an existing workflow to an activity
- `frontend/src/api/*`
  - TanStack Query hooks per resource
- `frontend/src/store/canvasStore.ts`
  - current organization/workspace state
  - breadcrumb/workflow trail state
- `frontend/playwright.config.ts`
  - browser test configuration
  - default `baseURL` now points to `http://127.0.0.1:4174`
- `frontend/e2e/bim-cyclic-coordination.spec.ts`
  - headed reference scenario for a realistic BIM coordination workflow
  - covers main workflow, child workflows, gateway labels, merge gateway, IT tools, transport modes, and edge data objects
- `frontend/e2e/subprocess-entry.spec.ts`
  - focused repro for stable submenu opening on later activities in a dense canvas
- `frontend/e2e/swimlane-visible-roles.spec.ts`
  - focused repro for the rule that swimlanes render only for roles visible on the current canvas
- `frontend/e2e/gateway-second-path-label.spec.ts`
  - focused repro for reliable sequential labeling of multiple outgoing gateway paths
- `frontend/e2e/activity-detail-from-edge-detail.spec.ts`
  - focused repro for reliable transition from an open edge dialog to the activity detail dialog
- `frontend/e2e/edge-two-named-data-objects.spec.ts`
  - focused repro for sequential creation of two named edge data objects in the same edge dialog
- `frontend/e2e/helpers.ts`
  - shared browser-test helpers
  - includes `testSuffix()` for short, readable 3-digit entity suffixes in E2E test data

## Backend Important Files

- `backend/src/main.ts`
  - Nest bootstrap and app config
- `backend/src/auth/auth.guard.ts`
  - validates Supabase bearer tokens
- `backend/src/database/database.service.ts`
  - server-side Supabase access and workspace/organization access checks
- `backend/src/workspaces/*`
  - workspace list/create/delete
- `backend/src/activities/*`
  - activity list/upsert/delete
- `backend/src/canvas-objects/*`
  - source/data object CRUD
- `backend/src/canvas-edges/*`
  - edge list/upsert/delete
- `backend/src/activity-resources/*`
  - IT-tool catalog, activity-level tool links, and check sources
- `backend/src/transport-modes/*`
  - organization-scoped transport mode catalog and settings
- `backend/src/workflow-templates/*`
  - template snapshot creation
  - template editing/deletion
  - instantiation of complete workflow trees from templates
  - normalization of legacy default template snapshots during instantiate

## Data Model Status

Current important entities:

- `workspaces`
  - business meaning: workflows / Arbeitsablaeufe
- `activities`
- `canvas_objects`
- `object_fields`
- `canvas_edges`
- `it_tools`
- `activity_it_tools`
- `activity_check_sources`
- `organizations`
- `organization_members`
- `organization_invitations`
- `transport_modes`
- `workflow_templates`
- `activity_comments`

Current edge fields:

- `from_node_type`
- `from_node_id`
- `from_handle_id`
- `to_node_type`
- `to_node_id`
- `to_handle_id`
- `label`
- `transport_mode_id`
- `notes`

## Migration History

- `001_initial_schema.sql`
  - workspaces
  - activities
  - activity roles
- `002_canvas_extensions.sql`
  - status icon on activities
- `003_activity_metadata.sql`
  - activity metadata
  - canvas objects
  - object fields
  - canvas edges
  - activity resources
- `004_canvas_edge_handles.sql`
  - `from_handle_id`
  - `to_handle_id`
- `005_workflow_hierarchy.sql`
  - workflow hierarchy on `workspaces`
  - linked workflow metadata on `activities`
  - neutral terminology instead of subprocess-specific schema
- `006_edge_attached_data_objects.sql`
  - moves data objects onto edges
  - adds `edge_id`
  - adds `edge_sort_order`
  - removes the old requirement that every canvas object must be freely positioned
- `007_canvas_edge_attributes.sql`
  - adds `transport_mode`
  - adds `notes`
  - formalizes the first edge-level transfer attributes
- `008_it_tools_catalog.sql`
  - adds reusable `it_tools`
  - adds `activity_it_tools`
  - migrates legacy activity tool names into the new catalog
- `009_b2b_organizations.sql`
  - adds `organizations`
  - adds `organization_members`
  - moves workflows and catalogs into organization scope
- `010_transport_modes.sql`
  - adds organization-scoped `transport_modes`
  - migrates edge transfer mode handling from text to referenced modes
- `011_activity_comments_and_templates.sql`
  - adds `activity_comments`
  - adds `workflow_templates`
- `012_gateway_node_types.sql`
  - extends allowed activity/node types with gateway variants

## Operational SQL Scripts

- `supabase/scripts/reset_all_data_and_seed_default_templates.sql`
  - destructive reset for public application data
  - rebuilds organizations from `auth.users`
  - recreates owner memberships
  - seeds default transport modes
  - seeds default workflow templates

## Current Stability Notes

Stable:

- frontend build
- backend build
- frontend unit tests
- backend unit tests
- auth flow
- workspace create flow
- live data persistence
- workflow hierarchy creation and linking
- workflow template save/edit/create flows
- breadcrumb navigation between workflows
- optimistic create/connect/delete behavior on the canvas
- viewport-center insertion from the floating toolbar
- smart insert for linear workflow construction
- toolbar drag-and-drop insertion
- data object insertion on selected edges with contextual toolbar guidance
- edge-attached data objects with multiple objects per connection
- aggregated edge UI with hover names and reuse of existing workflow data objects
- edge attributes editable after connection creation
- clone/remap of workflow templates including connected edges and edge-attached data objects
- compatibility normalization for older default template snapshots
- split feature-focused Playwright suite in `frontend/e2e/*.spec.ts`
- dedicated headed BIM reference scenario for multi-level workflow modeling
- dedicated focused Playwright repro specs for BIM stabilization before rerunning the large reference scenario
- local Playwright configuration pointed at local preview by default

Recently simplified on purpose:

- custom edge editor popup removed
- most custom React Flow selection/panning behavior removed
- old header toolbar replaced by left floating canvas toolbar

Open area to monitor:

- data-object-edge and workflow-hierarchy remain the most likely specs to expose higher-order UX regressions
- the JS bundle is still large enough to trigger Vite's chunk-size warning; this is not a functional bug, but it is a reasonable later optimization target

## Latest Verification Snapshot

Latest known good local verification:

- frontend build: green
- frontend unit tests: green
  - `57 / 57`
- backend build: green
- backend unit tests: green
  - `13 / 13`
- full browser E2E against local preview with credentials: green
  - `54 passed`
  - `1 skipped`
  - the single skip is the intentionally excluded mail-/invitation-flow in `saas-organizations.spec.ts`
- dedicated BIM reference checks: green
  - `bim-cyclic-coordination.spec.ts`: `2 passed`
  - `subprocess-entry.spec.ts`: `1 passed`
  - `swimlane-visible-roles.spec.ts`: `1 passed`
  - `gateway-second-path-label.spec.ts`: `1 passed`
  - `activity-detail-from-edge-detail.spec.ts`: `1 passed`
  - `edge-two-named-data-objects.spec.ts`: `1 passed`
  - `activity-detail-check-sources.spec.ts`: `1 passed`
  - headed scenario with detail workflows, gateway decision labels, explicit merge gateway, transport modes, IT tools, and reload verification
  - screenshot capture for `10-bim-cyclic-coordination.png`: green

Playwright note:

- the browser suite now runs with `workers: 1`
- this avoids flaky parallel workspace seeding and cleanup against the shared Supabase-backed E2E user
- `playwright.config.ts` defaults to `http://127.0.0.1:4174`
- recent focused verifications in this session were executed against `http://127.0.0.1:4175`
- if a test unexpectedly shows stale/English UI, verify `E2E_BASE_URL` and the active preview first
