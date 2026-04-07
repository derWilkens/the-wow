# Task 6: Frontend — Typen erweitern

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/types/index.test.ts`

- [ ] **Step 1: Failing test schreiben**

`frontend/src/types/index.test.ts` vollständig ersetzen:

```typescript
import { describe, it, expectTypeOf } from 'vitest'
import type {
  Activity,
  ActivityType,
  CanvasObject,
  ObjectField,
  CanvasEdge,
  ActivityTool,
  ActivityCheckSource,
  ActivityNodeData,
} from './index'

describe('types', () => {
  it('Activity has metadata fields', () => {
    expectTypeOf<Activity>().toHaveProperty('activity_type')
    expectTypeOf<Activity>().toHaveProperty('description')
    expectTypeOf<Activity>().toHaveProperty('notes')
    expectTypeOf<Activity>().toHaveProperty('duration_minutes')
  })

  it('ActivityType covers all four values', () => {
    const v: ActivityType = 'erstellen'
    expectTypeOf(v).toMatchTypeOf<ActivityType>()
  })

  it('CanvasObject has required shape', () => {
    expectTypeOf<CanvasObject>().toHaveProperty('object_type')
    expectTypeOf<CanvasObject>().toHaveProperty('position_x')
    expectTypeOf<CanvasObject>().toHaveProperty('position_y')
  })

  it('CanvasEdge has from/to node fields', () => {
    expectTypeOf<CanvasEdge>().toHaveProperty('from_node_type')
    expectTypeOf<CanvasEdge>().toHaveProperty('from_node_id')
    expectTypeOf<CanvasEdge>().toHaveProperty('to_node_type')
    expectTypeOf<CanvasEdge>().toHaveProperty('to_node_id')
  })

  it('ActivityNodeData has onOpenDetail callback', () => {
    expectTypeOf<ActivityNodeData>().toHaveProperty('onOpenDetail')
  })
})
```

- [ ] **Step 2: Test ausführen — erwartet FAIL**

```bash
cd frontend && npx vitest run src/types/index.test.ts
```

Erwartet: FAIL — `ActivityType`, `CanvasObject` etc. nicht exportiert.

- [ ] **Step 3: Typen erweitern**

`frontend/src/types/index.ts` vollständig ersetzen:

```typescript
export type TriggerType = 'email' | 'schedule' | 'manual' | 'webhook' | 'file_drop'
export type ActivityStatus = 'draft' | 'ready_for_review' | 'reviewed'
export type NodeType = 'activity' | 'start_event' | 'end_event'
export type StatusIcon = 'unclear' | 'ok' | 'in_progress' | 'blocked'
export type PermissionLevel = 'read' | 'edit' | 'delegate'
export type ActivityType =
  | 'erstellen'
  | 'transformieren_aktualisieren'
  | 'pruefen_freigeben'
  | 'weiterleiten_ablegen'
export type CanvasObjectType = 'quelle' | 'datenobjekt'
export type ObjectFieldType = 'text' | 'integer' | 'decimal' | 'date' | 'boolean'
export type EdgeNodeType = 'activity' | 'canvas_object'

export interface Workspace {
  id: string
  name: string
  created_by: string
  created_at: string
}

export interface Activity {
  id: string
  workspace_id: string
  parent_id: string | null
  owner_id: string
  node_type: NodeType
  label: string
  trigger_type: TriggerType | null
  position_x: number
  position_y: number
  status: ActivityStatus
  status_icon: StatusIcon | null
  activity_type: ActivityType | null
  description: string | null
  notes: string | null
  duration_minutes: number | null
  updated_at: string
}

export interface CanvasObject {
  id: string
  workspace_id: string
  parent_activity_id: string | null
  object_type: CanvasObjectType
  name: string
  position_x: number
  position_y: number
  updated_at: string
}

export interface ObjectField {
  id: string
  object_id: string
  name: string
  field_type: ObjectFieldType
  required: boolean
  sort_order: number
}

export interface CanvasEdge {
  id: string
  workspace_id: string
  parent_activity_id: string | null
  from_node_type: EdgeNodeType
  from_node_id: string
  to_node_type: EdgeNodeType
  to_node_id: string
  label: string | null
}

export interface ActivityTool {
  activity_id: string
  tool_name: string
}

export interface ActivityCheckSource {
  id: string
  activity_id: string
  canvas_object_id: string
  notes: string | null
}

export interface ActivityRole {
  activity_id: string
  user_id: string
  permission: PermissionLevel
}

export interface ActivityNodeData {
  activity: Activity
  hasChildren: boolean
  ownerColor?: string
  onStatusIconChange?: (id: string, icon: StatusIcon | null) => void
  onOpenDetail?: (id: string) => void
}

export interface CanvasObjectNodeData {
  canvasObject: CanvasObject
  onOpenPopup?: (id: string) => void
  onNameChange?: (id: string, name: string) => void
}
```

- [ ] **Step 4: Tests ausführen — erwartet PASS**

```bash
cd frontend && npx vitest run src/types/index.test.ts
```

Erwartet: PASS (5 Tests grün).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/types/index.test.ts
git commit -m "feat: extend frontend types with activity metadata and canvas object types"
```
