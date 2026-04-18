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
  - switching between canvas and SIPOC table view
  - enforcement of UI preferences for optional view toggles
  - workflow-detail dialog wiring for the currently open workflow
- `frontend/src/components/workspace/WorkflowDetailDialog.tsx`
  - dedicated entry for the current workflow metadata from the header
  - edits workflow `name`, `purpose`, `expected_inputs`, and `expected_outputs`
  - deliberately follows the same product language and dialog rhythm as activity details
- `frontend/src/components/canvas/WorkflowCanvas.tsx`
  - React Flow integration
  - simplified canvas wrapper that stays close to native React Flow behavior
  - native connect flow plus add-node-on-edge-drop behavior
  - interruptible focus animation when returning from SIPOC to canvas
  - left-drag lasso selection as primary direct-manipulation gesture
  - keyboard-based duplicate, lock, delete and nudge interactions
  - selection popover for align, group and aggregate actions
- `frontend/src/components/canvas/GroupNode.tsx`
  - persistent container rendering for grouped nodes on the canvas
- `frontend/src/api/canvasGroups.ts`
  - TanStack Query hooks for `canvas_groups`
- `frontend/src/components/canvas/WorkflowSipocTable.tsx`
  - read-only SIPOC view derived from the loaded workflow model
  - one row per activity with aggregated supplier/input/process/process-role/output/consumer data
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
- `frontend/src/components/settings/SettingsDialog.tsx`
  - central settings surface for company settings, UI preferences, and company master data
  - manages organization rename, default grouping mode, snap-to-grid, optional view visibility, transport modes, IT tools, and organization roles
- `frontend/src/components/layout/AppHeader.tsx`
  - renders only the currently wanted high-signal controls
  - hides table/swimlane toggles when their UI preferences are disabled
  - no longer renders undo/redo, search, or export in the header
- `frontend/src/components/canvas/ActivityDetailPopup.tsx`
  - activity editing
  - free-text assignee, organization role selection, comments, and IT tools
  - uses the shared custom choice list for several selectors
  - shares the centralized activity-type metadata with the activity node
- `frontend/src/components/canvas/ActivityNode.tsx`
  - condensed activity-node presentation
  - type icon, role badge, inline title editing, and subprocess trigger
  - quick type change directly from the node icon with tooltip and popover
- `frontend/src/components/roles/RoleCreateForm.tsx`
  - shared role-create form
  - reused by activity detail and activity-node role quick-create
  - keeps role name, acronym, and description inputs aligned across entry points
- `frontend/src/components/canvas/activityTypeOptions.tsx`
  - shared source of truth for the 5 activity types
  - reused by node quick-change and detail dialog rendering
- `frontend/src/components/canvas/DataObjectPopup.tsx`
  - source/data object editing
  - optimistic save/delete close behavior
- `frontend/src/components/ui/CustomChoiceList.tsx`
  - reusable product-styled picker with descriptions, badges, search, and optional inline create
- `frontend/src/index.css`
  - central visual surface definitions for popovers, dialogs, tooltips, and overlay scrims
  - shared low-transparency classes now drive the main popup/dialog shells instead of ad-hoc per-component opacity values
- `frontend/src/components/canvas/SubprocessMenu.tsx`
  - menu behind the `+` button on activities
- `frontend/src/components/canvas/SubprocessWizard.tsx`
  - guided creation of a detailed child workflow
- `frontend/src/components/canvas/LinkWorkflowModal.tsx`
  - linking an existing workflow to an activity
- `frontend/src/api/*`
  - TanStack Query hooks per resource
  - includes workspace update for current-workflow details
- `frontend/src/store/canvasStore.ts`
  - current organization/workspace state
  - breadcrumb/workflow trail state
  - immediate visible workflow-name refresh after saving current-workflow details
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
- `frontend/e2e/settings-master-data.spec.ts`
  - focused business E2E for the central settings dialog
  - covers company rename, UI preference save, master-data creation, activity tool linking, and reload persistence
- `frontend/e2e/sipoc-view.spec.ts`
  - focused business E2E for the second workflow view
  - verifies SIPOC row derivation from roles, edge data objects, and transport modes
- `frontend/e2e/workflow-details.spec.ts`
  - focused business E2E for the new header entry into current-workflow details
  - verifies save and reopen of workflow metadata
- `frontend/e2e/view-preferences.spec.ts`
  - focused business E2E for optional view visibility and header cleanup
  - verifies default-hidden view toggles, enable/disable behavior, and that search/export stay absent from the header
- `frontend/e2e/activity-type-quick-change.spec.ts`
  - focused business E2E for changing the activity type directly on the node
  - verifies tooltip, icon popover, immediate save, and persistence after fresh login
- `frontend/e2e/group-selection.spec.ts`
  - focused browser repro for lasso selection and persistent group creation
  - verifies group persistence after reload
  - the spec was extended to cover group rename plus collapse persistence after reload
  - the new browser path currently depends on `017_canvas_groups_collapsed.sql` being visible in the running REST schema cache

## UI Surface Status

- Outer popup and dialog shells now follow shared CSS surfaces from `frontend/src/index.css`
- `wow-surface-popover`
  - for compact floating selectors and menus
- `wow-surface-dialog`
  - for primary modal/detail surfaces
- `wow-overlay-scrim`
  - for shared overlay dimming with only mild transparency
- The product rule is now:
  - popovers/dialogs should not feel see-through
  - only the surrounding scrim may remain lightly transparent

## Backend Important Files

- `backend/src/main.ts`
  - Nest bootstrap and app config
- `backend/src/auth/auth.guard.ts`
  - validates Supabase bearer tokens
- `backend/src/database/database.service.ts`
  - server-side Supabase access and workspace/organization access checks
- `backend/src/workspaces/*`
  - workspace list/create/update/delete
- `backend/src/activities/*`
  - activity list/upsert/delete
- `backend/src/canvas-objects/*`
  - source/data object CRUD
- `backend/src/canvas-edges/*`
  - edge list/upsert/delete
- `backend/src/canvas-groups/*`
  - persistent canvas group list/upsert/delete
  - clears memberships on delete
- `backend/src/activity-resources/*`
  - IT-tool catalog, activity-level tool links, and check sources
- `backend/src/organizations/*`
  - organization list/create/update
  - member and invitation handling
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
- `canvas_groups`
- `it_tools`
- `activity_it_tools`
- `activity_check_sources`
- `organizations`
- `organization_members`
- `organization_invitations`
- `organization_roles`
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
- `013_activity_roles_and_assignments.sql`
  - adds `organization_roles`
  - adds `assignee_label` and `role_id` on `activities`
- `016_canvas_groups.sql`
  - adds `canvas_groups`
  - adds `group_id` to `activities`
  - adds `group_id` to `canvas_objects`
- `017_canvas_groups_collapsed.sql`
  - adds `collapsed` to `canvas_groups`

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
- central settings dialog for company, UI, and master data
- organization rename flow
- organization-scoped role CRUD and delete protection for linked roles
- organization-scoped IT-tool CRUD and delete protection for linked tools
- free-text assignee plus role-based swimlane derivation
- auth flow
- workspace create flow
- current-workflow details from dedicated header button
- workspace update flow for name, purpose, expected inputs, and expected outputs
- optional header view toggles controlled through persisted UI preferences
- direct-manipulation base for lasso, quick align and persistent groups
- editable group labels and persistent collapse state on canvas groups
- hidden header search/export and header-free undo/redo layout
- shared role-create dialog behavior between activity detail and node role badge
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
- second workflow view as a read-only SIPOC table
- interruptible focus/zoom return from SIPOC view back to canvas
- default activity type `Unbestimmt` with question-mark icon

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
  - `30 / 30` files
  - `139 / 139` tests
- backend build: green
- backend unit tests: green
  - `22 / 22`
- full browser E2E against local preview with credentials: green
  - `54 passed`
  - `1 skipped`
- focused persistent-group verification: green
  - `group-selection.spec.ts`: `1 passed`
- focused backend verification for canvas groups: green
  - `canvas-groups.service.spec.ts`: `3 passed`
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
- dedicated settings/master-data verification: green
  - `settings-master-data.spec.ts`: `1 passed`
- dedicated workflow-details verification: green
  - `workflow-details.spec.ts`: `1 passed`
- dedicated view-preferences verification: green
  - `view-preferences.spec.ts`: `1 passed`
- focused workspace-update backend verification: green
  - `backend/src/workspaces/workspaces.service.spec.ts`: `2 passed`
- local fallback-safe role/assignee persistence without applied migration `013`: green

Playwright note:

- the browser suite now runs with `workers: 1`
- this avoids flaky parallel workspace seeding and cleanup against the shared Supabase-backed E2E user
- `playwright.config.ts` defaults to `http://127.0.0.1:4174`
- recent focused verifications in this session were executed against `http://127.0.0.1:4175`
- if a test unexpectedly shows stale/English UI, verify `E2E_BASE_URL` and the active preview first
