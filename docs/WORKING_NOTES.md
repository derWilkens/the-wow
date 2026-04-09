# Working Notes

## How We Have Been Working

Die formale Teststrategie steht jetzt zusaetzlich in:

- `docs/TEST_STRATEGY.md`

The most effective implementation pattern on this project has been:

1. review the spec and product intent
2. implement the smallest viable end-to-end slice
3. verify locally first
4. simplify if React Flow behavior becomes unstable
5. only add custom interaction layers if the library cannot already do the job

This is important because React Flow is mature, and over-customizing interaction tends to introduce bugs that are harder than the original feature.

## Rules Of Thumb For Future Work

1. Prefer native React Flow capabilities before building custom wrappers.
2. Avoid overlaying invisible or semi-custom connector buttons over native handles.
3. Persist exactly what React Flow gives you if it matters to rendering later.
4. Keep canvas UI quiet; use overlays sparingly.
5. Treat anything that looks like a viewport bug with suspicion, but also verify whether it is actually a later data/state reset.
6. When an interaction feels slow, prefer optimistic UI first and persistence second.
7. When user-facing terminology changes, migrate visible language first and internal identifiers gradually.
8. For E2E, verify the test runner is really pointing at the local preview before trusting any browser result.

## Current Commands

Frontend local run:

```bash
cd the-wow/frontend
npm run dev
```

Backend local run:

```bash
cd the-wow/backend
npm run start:dev
```

Frontend build and test:

```bash
cd the-wow/frontend
npm run build
npm run test
```

Frontend E2E against local preview:

```bash
cd the-wow/frontend
npm run build
npm run preview -- --host 127.0.0.1 --port 4174
npm run test:e2e
```

Backend build and test:

```bash
cd the-wow/backend
npm run build
npm run test
```

## Environment Notes

Frontend expects:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`

Backend expects:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`

Playwright / browser E2E expects when login-bound tests should run:

- `E2E_EMAIL`
- `E2E_PASSWORD`
- optional `E2E_BASE_URL`
- optional `E2E_API_BASE_URL`

Current default Playwright behavior:

- `playwright.config.ts` now defaults `baseURL` to `http://127.0.0.1:4174`
- this replaced the earlier default to a Vercel deployment
- if browser screenshots or text do not match the local source code, check the active preview and `E2E_BASE_URL` first

Do not commit real secrets. Keep them in local env files or hosting configuration.

## Database / Reset Notes

A destructive admin reset script now exists at:

- `supabase/scripts/reset_all_data_and_seed_default_templates.sql`

It:

- deletes all public application data
- keeps `auth.users` untouched
- recreates `organizations`
- recreates owner `organization_members`
- seeds default `transport_modes`
- seeds default `workflow_templates`

Important detail:

- the SQL seed writes workflow templates in the current normalized snapshot format
- this avoids the earlier mismatch between legacy default templates and the instantiation code

## Product/UX Notes Worth Preserving

- New workflows should seed with at least a start node and a demo activity.
- The initial canvas should feel spacious and calm.
- Right-side review/status cards were intentionally removed.
- Canvas status banners were intentionally removed.
- Connector visibility was dialed back to avoid constant visual noise.
- Edge editing popup was removed to simplify interaction.
- Source/activity connections should behave symmetrically.
- Creating a connection to empty canvas should create a new activity immediately.
- New child workflows should be framed for business users as a more detailed workflow, not as a technical subprocess.
- The `+` menu on an activity is the entry point for:
  - creating a detailed child workflow
  - linking an existing workflow
  - opening an already linked workflow
  - unlinking a workflow
- The old header toolbar was replaced by a left floating canvas toolbar.
- Floating toolbar behavior is intentional:
  - compact icon stack by default
  - item expands to the right on hover/focus
  - insert test IDs stay stable
- Toolbar click is the primary fast-insert path and should default to viewport-center placement.
- Smart insert should only auto-connect for obvious linear next steps.
- Dragging from the toolbar should never open a detail popup.
- `Datenobjekt` is now exclusively edge-attached:
  - no free canvas insertion anymore
  - insertion only on a selected edge
  - multiple data objects may be transported on one edge
  - one object shows as a named chip
  - multiple objects collapse into one icon with count badge
  - hover on the aggregate reveals the transported names
  - a click on a single chip now opens the same management popover used by aggregates
  - a double click opens its detail popup
  - new edge data objects get sequential default names instead of an unhelpful generic placeholder
  - new edge data objects no longer receive a dummy field automatically
- existing workflow data objects can be added to another edge as a prefilled copy
- edge attributes are edited only after the connection exists:
  - transport mode
  - notes
- transport modes are now organization-specific settings:
  - configured from the central settings dialog in the canvas header
  - not managed on the workflow start page
  - owner/admin can add, edit, deactivate, and set defaults
  - members can use the configured modes in edge details
  - transport mode choice uses the shared custom choice list UI
- the central settings dialog now groups three concerns in one place:
  - `Firma`
  - `UI`
  - `Stammdaten`
- company name changes are now handled in that settings dialog and should update visible organization context immediately
- roles are now also managed centrally from that same settings dialog:
  - create, edit, and delete from the company catalog
  - deleting a linked role is intentionally blocked with a business error
- activities now separate responsibility into two explicit concepts:
  - `Ausfuehrende(r)` is free text
  - `Rolle` is a company-wide catalog value
  - swimlanes derive from the saved role instead of organization membership roles
- IT tools are now also managed centrally from the same settings dialog:
  - create, edit, and delete from the company catalog
  - deleting a linked tool is intentionally blocked with a business error
- current phase-1 UX cleanup now also includes:
  - condensed activity nodes with type icon top-left and role top-right
  - inline rename on the selected activity title
  - connectors visible only on selected nodes
  - login submit on `Enter`
  - fully opaque edge dialog
  - less transparent detailed-workflow dialog
- activity types now have a stable semantic default:
  - `Unbestimmt`
  - shown with a question-mark icon
- the workflow now has two top-level views:
  - `Zeichenmodus`
  - `Tabellarische View`
- the current workflow now also has a dedicated header entry for its own metadata:
  - `Ablaufdetails`
  - edits the currently open workflow directly
  - uses the same interaction pattern as other detail dialogs
  - currently persists `name`, `purpose`, `expected_inputs`, and `expected_outputs`
- the tabellarische view is currently a read-only SIPOC derivation:
  - one row per activity
  - supplier/consumer from adjacent activity roles
  - input/output from edge-bound data objects
  - transport mode shown per input/output item
- when returning from SIPOC to canvas, the focus/zoom motion is intentional
  - it must stop immediately on click, pan, or drag
  - user interaction always wins over the automatic camera move
- IT tools are now modeled as reusable entities:
  - create new tools from activity details
  - link existing tools from the shared catalog
  - removing a chip only unlinks the tool from the activity
  - reusing a tool across multiple activities or workflows must not create duplicates
  - IT tool selection now also uses the shared custom choice list UI
- workflow templates now have regression coverage for the real local stack:
  - saving a workflow as a template
  - creating a new workflow from that template without a `500`
  - reopening directly into the created workflow
  - preserving edge connectivity during clone
  - editing custom templates from the template picker
- template cloning had one important implementation rule:
  - activity IDs and canvas object IDs must both be remapped before inserting edges
  - node-like canvas objects such as `Datenspeicher` must be inserted before cloned edges
  - edge-attached `Datenobjekt` rows must be inserted after cloned edges
- legacy default template snapshots are normalized during instantiation:
  - old edge shapes with `from` / `to` are mapped to the current `from_node_*` / `to_node_*` format
- the connection-drop regression around highlighted target node bodies is fixed in the canvas connect-end fallback
- gateway E2E stabilization needed two concrete rules:
  - save edge labels only after the upsert request returns
  - select overlapping gateway edges by exact `aria-label` and `dispatchEvent('click')`
- optimistic-close dialogs need explicit network waits in E2E before reload assertions:
  - especially for edge-attached data objects and IT-tool relink flows
- the BIM reference scenario now exists as a dedicated headed Playwright spec:
  - `frontend/e2e/bim-cyclic-coordination.spec.ts`
  - it is the best end-to-end reference when validating a realistic multi-level workflow with tools, edge data objects, transport modes, child workflows, gateway labels, and a merge gateway
- two small repro specs now protect the last BIM-specific stabilization points before rerunning the full reference:
  - `frontend/e2e/subprocess-entry.spec.ts`
  - `frontend/e2e/swimlane-visible-roles.spec.ts`
- newer focused repro specs now also protect edge-/dialog-specific regressions outside the BIM core:
  - `frontend/e2e/gateway-second-path-label.spec.ts`
  - `frontend/e2e/activity-detail-from-edge-detail.spec.ts`
  - `frontend/e2e/edge-two-named-data-objects.spec.ts`
  - `frontend/e2e/activity-detail-check-sources.spec.ts`
- a dedicated settings/master-data browser flow now exists:
  - `frontend/e2e/settings-master-data.spec.ts`
  - covers company rename, UI preference save, central IT-tool creation, central transport-mode creation, activity tool linking, and reload persistence
- a dedicated SIPOC browser flow now exists:
  - `frontend/e2e/sipoc-view.spec.ts`
  - prepares a stable workflow model via API
  - verifies the tabellarische SIPOC read model in the UI
- current rule for large browser failures:
  - isolate the concrete failing interaction in a dedicated repro spec first
  - get that smaller repro green
  - only then rerun the larger BIM/business reference flow
- current rule for generated E2E names:
  - if workflows, organizations, tools, or other entities get a timestamp suffix, use `testSuffix()` from `frontend/e2e/helpers.ts`
  - the last `3` digits are enough by default
  - only switch to a longer suffix when there is a real collision risk
- one deliberate stabilization choice in that BIM scenario:
  - the long corrective loop-back edge is created through the backend API and then verified in the UI
  - this keeps the scenario stable while still testing the modeled result after reload

## Known Likely Next Features

Good next candidates without major schema expansion:

1. continue migrating internal `workspace` naming toward `workflow`
2. improve export behavior
3. reduce frontend bundle size
4. add finer unit/component coverage for toolbar insertion rules
5. broaden member-rights browser coverage where still valuable

Good later candidates with more product complexity:

1. BPMN generation
2. versions for workflows
3. workspace members and permissions expansion
4. metrics / overview pages
5. interview / AI support features

## Workflow Hierarchy Note

For future schema work, prefer neutral workflow terminology:

- parent workflow
- linked workflow
- detailed child workflow

Avoid introducing a separate business entity called `subprocess`. A child workflow is still a workflow; only the relationship changes.

## Current Known Good Test Discipline

- Run local build and unit tests after meaningful UI or data-model changes.
- Run headless E2E for focused regression slices before spending time on the full suite.
- Run targeted local Playwright regressions against the real stack when a bug report is concrete enough to isolate, instead of waiting for the full credential-bound suite.
- After E2E runs that create live data, delete the created workflows again and verify cleanup against the database.
- Prefer one explicit E2E test per feature/behavior slice instead of bundling multiple new behaviors into a single large test.
- Current E2E suite is split into feature-oriented files under `frontend/e2e/*.spec.ts`.
- `workflow-hierarchy.spec.ts` and `data-object-edge.spec.ts` remain important high-signal files when hierarchy or edge UX changes.
- `bim-cyclic-coordination.spec.ts` is now the highest-signal reference spec for complex business modeling across two workflow levels.
- `subprocess-entry.spec.ts` and `swimlane-visible-roles.spec.ts` are now the first-stop regression specs when BIM reference failures point at submenu hit-testing or lane rendering expectations.
- Playwright workers are intentionally set to `1` because parallel runs against one shared E2E user caused flaky seeding/cleanup behavior.
- Latest full local Playwright verification is green with:
  - `54 passed`
  - `1 skipped`
- The one skipped browser test is the intentionally excluded mail-/invitation-flow.
- Latest focused BIM verification is green with:
  - `bim-cyclic-coordination.spec.ts`: `2 passed`
  - `subprocess-entry.spec.ts`: `1 passed`
  - `swimlane-visible-roles.spec.ts`: `1 passed`
- Latest focused edge/dialog verification is green with:
  - `gateway-second-path-label.spec.ts`: `1 passed`
  - `activity-detail-from-edge-detail.spec.ts`: `1 passed`
  - `edge-two-named-data-objects.spec.ts`: `1 passed`
  - `activity-detail-check-sources.spec.ts`: `1 passed`
- Latest unit verification is green with:
  - frontend: `68 / 68`
  - backend: `22 / 22`
- Latest settings/master-data verification is green with:
  - `settings-master-data.spec.ts`: `1 passed`
- Latest SIPOC view verification is green with:
  - `sipoc-view.spec.ts`: `1 passed`
- Latest workflow-details verification is green with:
  - `WorkflowDetailDialog.test.tsx`: `3 passed`
  - `AppHeader.test.tsx`: workflow-detail entry covered
  - `backend/src/workspaces/workspaces.service.spec.ts`: update path covered
  - `workflow-details.spec.ts`: `1 passed`
- Latest role/assignee model verification is green with:
  - local save path remains functional through fallback behavior even when migration `013_activity_roles_and_assignments.sql` is not yet applied

## Specs Worth Reading Before Major Changes

- `specs/2026-03-30-wayofworking-design.md`
- `specs/2026-03-31-activity-data-model-canvas-objects-design.md`
- `specs/2026-03-31-canvas-toolbar-status-design.md`
- `specs/2026-04-01-product-completeness-design.md`

## Important Note About Older Docs

Some older docs in the repo reflect an earlier moment where the project was mostly frontend/specs. The current reality is broader:

- there is a working NestJS backend
- Supabase schema has advanced beyond the early docs
- the README has been updated, but specs should still be read as design intent rather than a perfect record of the current implementation
