# Task 7: Frontend — API-Hooks

**Files:**
- Create: `frontend/src/api/canvasObjects.ts`
- Create: `frontend/src/api/canvasEdges.ts`
- Create: `frontend/src/api/activityResources.ts`
- Modify: `frontend/src/api/activities.ts`

- [ ] **Step 1: activities.ts erweitern**

`frontend/src/api/activities.ts` vollständig ersetzen:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './workspaces'
import type { Activity, ActivityType, StatusIcon } from '../types'

export interface UpsertActivityInput {
  id?: string
  label: string
  trigger_type?: string
  position_x: number
  position_y: number
  parent_id: string | null
  node_type?: string
  status_icon?: StatusIcon | null
  activity_type?: ActivityType | null
  description?: string | null
  notes?: string | null
  duration_minutes?: number | null
}

export function useActivities(workspaceId: string | null, parentId: string | null) {
  const parentParam = parentId ?? 'null'
  return useQuery<Activity[]>({
    queryKey: ['activities', workspaceId, parentId],
    queryFn: () => apiFetch(`/workspaces/${workspaceId}/activities?parentId=${parentParam}`),
    enabled: !!workspaceId,
  })
}

export function useUpsertActivity(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertActivityInput) =>
      apiFetch<Activity>(`/workspaces/${workspaceId}/activities`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['activities', workspaceId, vars.parent_id] })
    },
  })
}
```

- [ ] **Step 2: canvasObjects.ts erstellen**

`frontend/src/api/canvasObjects.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './workspaces'
import type { CanvasObject, ObjectField } from '../types'

export interface UpsertCanvasObjectInput {
  id?: string
  name: string
  object_type: 'quelle' | 'datenobjekt'
  position_x: number
  position_y: number
  parent_activity_id: string | null
}

export interface UpsertObjectFieldInput {
  id?: string
  name: string
  field_type: 'text' | 'integer' | 'decimal' | 'date' | 'boolean'
  required: boolean
  sort_order: number
}

export function useCanvasObjects(workspaceId: string | null, parentId: string | null) {
  const parentParam = parentId ?? 'null'
  return useQuery<CanvasObject[]>({
    queryKey: ['canvas-objects', workspaceId, parentId],
    queryFn: () => apiFetch(`/workspaces/${workspaceId}/canvas-objects?parentId=${parentParam}`),
    enabled: !!workspaceId,
  })
}

export function useUpsertCanvasObject(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertCanvasObjectInput) =>
      apiFetch<CanvasObject>(`/workspaces/${workspaceId}/canvas-objects`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['canvas-objects', workspaceId, vars.parent_activity_id] })
    },
  })
}

export function useDeleteCanvasObject(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (objectId: string) =>
      apiFetch(`/workspaces/${workspaceId}/canvas-objects/${objectId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canvas-objects', workspaceId] })
    },
  })
}

export function useObjectFields(workspaceId: string, objectId: string | null) {
  return useQuery<ObjectField[]>({
    queryKey: ['object-fields', objectId],
    queryFn: () => apiFetch(`/workspaces/${workspaceId}/canvas-objects/${objectId}/fields`),
    enabled: !!objectId,
  })
}

export function useUpsertObjectField(workspaceId: string, objectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertObjectFieldInput) =>
      apiFetch<ObjectField>(`/workspaces/${workspaceId}/canvas-objects/${objectId}/fields`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['object-fields', objectId] })
    },
  })
}

export function useDeleteObjectField(workspaceId: string, objectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fieldId: string) =>
      apiFetch(`/workspaces/${workspaceId}/canvas-objects/${objectId}/fields/${fieldId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['object-fields', objectId] })
    },
  })
}
```

- [ ] **Step 3: canvasEdges.ts erstellen**

`frontend/src/api/canvasEdges.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './workspaces'
import type { CanvasEdge, EdgeNodeType } from '../types'

export interface UpsertCanvasEdgeInput {
  from_node_type: EdgeNodeType
  from_node_id: string
  to_node_type: EdgeNodeType
  to_node_id: string
  parent_activity_id: string | null
  label?: string | null
}

export function useCanvasEdges(workspaceId: string | null, parentId: string | null) {
  const parentParam = parentId ?? 'null'
  return useQuery<CanvasEdge[]>({
    queryKey: ['canvas-edges', workspaceId, parentId],
    queryFn: () => apiFetch(`/workspaces/${workspaceId}/canvas-edges?parentId=${parentParam}`),
    enabled: !!workspaceId,
  })
}

export function useUpsertCanvasEdge(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertCanvasEdgeInput) =>
      apiFetch<CanvasEdge>(`/workspaces/${workspaceId}/canvas-edges`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['canvas-edges', workspaceId, vars.parent_activity_id] })
    },
  })
}

export function useDeleteCanvasEdge(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (edgeId: string) =>
      apiFetch(`/workspaces/${workspaceId}/canvas-edges/${edgeId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canvas-edges', workspaceId] })
    },
  })
}
```

- [ ] **Step 4: activityResources.ts erstellen**

`frontend/src/api/activityResources.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './workspaces'
import type { ActivityTool, ActivityCheckSource } from '../types'

export function useActivityTools(workspaceId: string, activityId: string | null) {
  return useQuery<ActivityTool[]>({
    queryKey: ['activity-tools', activityId],
    queryFn: () =>
      apiFetch(`/workspaces/${workspaceId}/activities/${activityId}/tools`),
    enabled: !!activityId,
  })
}

export function useAddActivityTool(workspaceId: string, activityId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (toolName: string) =>
      apiFetch<ActivityTool>(`/workspaces/${workspaceId}/activities/${activityId}/tools`, {
        method: 'POST',
        body: JSON.stringify({ tool_name: toolName }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activity-tools', activityId] })
    },
  })
}

export function useRemoveActivityTool(workspaceId: string, activityId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (toolName: string) =>
      apiFetch(
        `/workspaces/${workspaceId}/activities/${activityId}/tools/${encodeURIComponent(toolName)}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activity-tools', activityId] })
    },
  })
}

export function useCheckSources(workspaceId: string, activityId: string | null) {
  return useQuery<ActivityCheckSource[]>({
    queryKey: ['check-sources', activityId],
    queryFn: () =>
      apiFetch(`/workspaces/${workspaceId}/activities/${activityId}/check-sources`),
    enabled: !!activityId,
  })
}

export function useAddCheckSource(workspaceId: string, activityId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { canvas_object_id: string; notes: string | null }) =>
      apiFetch<ActivityCheckSource>(
        `/workspaces/${workspaceId}/activities/${activityId}/check-sources`,
        { method: 'POST', body: JSON.stringify(input) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['check-sources', activityId] })
    },
  })
}

export function useRemoveCheckSource(workspaceId: string, activityId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sourceId: string) =>
      apiFetch(
        `/workspaces/${workspaceId}/activities/${activityId}/check-sources/${sourceId}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['check-sources', activityId] })
    },
  })
}
```

- [ ] **Step 5: TypeScript-Check ausführen**

```bash
cd frontend && npx tsc --noEmit
```

Erwartet: Keine Fehler.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/api/
git commit -m "feat: add canvasObjects, canvasEdges, activityResources API hooks"
```
