# the-wow

`the-wow` is a workflow-modeling application with:

- a React/Vite frontend in `frontend`
- a NestJS backend in `backend`
- Supabase schema migrations in `supabase/migrations`
- product and design specs in `specs`

## Current Product Shape

The current product is a desktop-first modeling tool built on React Flow.

Implemented today:

- email/password login via Supabase Auth
- workflow list and workflow creation
- workflow canvas with start, activity, end, source, and data object nodes
- default seeding for a new workflow
- connector-based edge creation with directional arrows
- activity edit flow
- data object / source edit flow
- workspace and activity deletion
- backend REST API backed by Supabase
- upcoming hierarchy support for detailed child workflows linked from activities

Known important detail:

- edge connections now persist the exact React Flow handles via `from_handle_id` and `to_handle_id`
- this requires migration `004_canvas_edge_handles.sql`
- workflow hierarchy and linked-workflow metadata now live in `005_workflow_hierarchy.sql`

## Terminology

Product language is shifting from `workspace` and `subprocess` toward:

- `Arbeitsablauf` in the UI
- `workflow` in code and schema design notes

The physical table is still `workspaces` for compatibility, but the intended business meaning is now `workflow`.

## Documentation

Project context and handoff material lives in:

- [docs/PROJECT_CONTEXT.md](C:\Users\ms\workspace\gpt-wow\the-wow\docs\PROJECT_CONTEXT.md)
- [docs/ARCHITECTURE_AND_STATUS.md](C:\Users\ms\workspace\gpt-wow\the-wow\docs\ARCHITECTURE_AND_STATUS.md)
- [docs/WORKING_NOTES.md](C:\Users\ms\workspace\gpt-wow\the-wow\docs\WORKING_NOTES.md)

These files are intended to preserve product context, implementation decisions, testing commands, and the next recommended work.

Public deployment guidance lives in:

- [docs/DEPLOYMENT_PUBLIC.md](C:\Users\ms\workspace\gpt-wow\the-wow\docs\DEPLOYMENT_PUBLIC.md)

## Local Run

Frontend:

```bash
cd the-wow/frontend
npm install
npm run dev
```

Backend:

```bash
cd the-wow/backend
npm install
npm run start:dev
```

## Test

Frontend:

```bash
cd the-wow/frontend
npm run build
npm run test
npm run test:e2e
```

Backend:

```bash
cd the-wow/backend
npm run build
npm run test
```
