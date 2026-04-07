# Plan 2a — Activity Metadata, Canvas Objects & Detail Popup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activity-Metadaten, Quelle/Datenobjekt-Nodes, Detail-Popup und persistente Canvas-Edges implementieren.

**Architecture:** DB-Migration → Backend-Module (canvas-objects, canvas-edges, activity sub-resources) → Frontend-Typen + API-Hooks → neue Canvas-Komponenten → Integration in WorkflowCanvas + AppHeader.

**Tech Stack:** NestJS (backend), React + ReactFlow + TanStack Query (frontend), Supabase/PostgreSQL (DB), Vitest + @testing-library/react (frontend tests), Jest (backend tests).

---

## Tasks

| # | Datei | Inhalt |
|---|-------|--------|
| 1 | [task-01-db-migration.md](task-01-db-migration.md) | Migration 003 — neue Tabellen + Felder |
| 2 | [task-02-backend-activity-dto.md](task-02-backend-activity-dto.md) | Activity DTO + Service erweitern |
| 3 | [task-03-backend-canvas-objects.md](task-03-backend-canvas-objects.md) | CanvasObjects-Modul (CRUD) |
| 4 | [task-04-backend-canvas-edges.md](task-04-backend-canvas-edges.md) | CanvasEdges-Modul (CRUD) |
| 5 | [task-05-backend-activity-sub-resources.md](task-05-backend-activity-sub-resources.md) | Tools + Check Sources Sub-Resources |
| 6 | [task-06-frontend-types.md](task-06-frontend-types.md) | Frontend-Typen erweitern |
| 7 | [task-07-frontend-api-hooks.md](task-07-frontend-api-hooks.md) | API-Hooks (canvasObjects, canvasEdges, activityResources) |
| 8 | [task-08-frontend-nodes.md](task-08-frontend-nodes.md) | SourceNode + DataObjectNode Komponenten |
| 9 | [task-09-frontend-dataobject-popup.md](task-09-frontend-dataobject-popup.md) | DataObjectPopup |
| 10 | [task-10-frontend-activity-detail-popup.md](task-10-frontend-activity-detail-popup.md) | ActivityDetailPopup |
| 11 | [task-11-frontend-activity-node.md](task-11-frontend-activity-node.md) | ActivityNode — Double-Click → Popup |
| 12 | [task-12-frontend-workflow-canvas.md](task-12-frontend-workflow-canvas.md) | WorkflowCanvas Integration |
| 13 | [task-13-frontend-app-header.md](task-13-frontend-app-header.md) | AppHeader — Quelle + Datenobjekt Buttons |
