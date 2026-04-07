# Task 12: Frontend — WorkflowCanvas integrieren

**Files:**
- Modify: `frontend/src/components/canvas/WorkflowCanvas.tsx`
- Modify: `frontend/src/components/canvas/WorkflowCanvas.test.tsx`

- [ ] **Step 1: Tests aktualisieren**

`frontend/src/components/canvas/WorkflowCanvas.test.tsx` vollständig ersetzen:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorkflowCanvas } from './WorkflowCanvas'

vi.mock('reactflow', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="reactflow">{children}</div>,
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  useNodesState: () => [[], vi.fn(), vi.fn()],
  useEdgesState: () => [[], vi.fn(), vi.fn()],
  addEdge: vi.fn(),
  Position: { Left: 'left', Right: 'right' },
  Handle: () => null,
}))

vi.mock('../../api/activities', () => ({
  useActivities: () => ({ data: [] }),
  useUpsertActivity: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock('../../api/canvasObjects', () => ({
  useCanvasObjects: () => ({ data: [] }),
  useUpsertCanvasObject: () => ({ mutateAsync: vi.fn() }),
  useDeleteCanvasObject: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock('../../api/canvasEdges', () => ({
  useCanvasEdges: () => ({ data: [] }),
  useUpsertCanvasEdge: () => ({ mutateAsync: vi.fn() }),
  useDeleteCanvasEdge: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock('../../store/canvasStore', () => ({
  useCanvasStore: () => ({
    workspaceId: 'ws-1',
    parentActivityId: null,
    drillInto: vi.fn(),
  }),
}))

describe('WorkflowCanvas', () => {
  it('renders without crashing', () => {
    render(<WorkflowCanvas />)
    expect(screen.getByTestId('reactflow')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Test ausführen — erwartet FAIL**

```bash
cd frontend && npx vitest run src/components/canvas/WorkflowCanvas.test.tsx
```

Erwartet: FAIL — neue Imports nicht vorhanden.

- [ ] **Step 3: WorkflowCanvas neu schreiben**

`frontend/src/components/canvas/WorkflowCanvas.tsx` vollständig ersetzen:

```typescript
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type OnConnectStartParams,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { ActivityNode } from './ActivityNode'
import { StartNode } from './StartNode'
import { EndNode } from './EndNode'
import { SourceNode } from './SourceNode'
import { DataObjectNode } from './DataObjectNode'
import { CreateActivityForm } from './CreateActivityForm'
import { ActivityDetailPopup } from './ActivityDetailPopup'
import { DataObjectPopup } from './DataObjectPopup'
import { useCanvasStore } from '../../store/canvasStore'
import { useActivities, useUpsertActivity } from '../../api/activities'
import { useCanvasObjects, useUpsertCanvasObject } from '../../api/canvasObjects'
import { useCanvasEdges, useUpsertCanvasEdge, useDeleteCanvasEdge } from '../../api/canvasEdges'
import type {
  Activity,
  ActivityNodeData,
  CanvasObject,
  CanvasObjectNodeData,
  CanvasEdge,
  StatusIcon,
  TriggerType,
  EdgeNodeType,
} from '../../types'

export interface CanvasToolbarCallbacks {
  onInsertStart: () => void
  onInsertActivity: () => void
  onInsertEnd: () => void
  onInsertQuelle: () => void
  onInsertDatenobjekt: () => void
  hasStart: boolean
  hasEnd: boolean
}

const nodeTypes = {
  activity: ActivityNode,
  startNode: StartNode,
  endNode: EndNode,
  sourceNode: SourceNode,
  dataObjectNode: DataObjectNode,
}

function activityToNode(
  activity: Activity,
  onStatusIconChange?: (id: string, icon: StatusIcon | null) => void,
  onOpenDetail?: (id: string) => void,
): Node<ActivityNodeData> {
  const type =
    activity.node_type === 'start_event' ? 'startNode' :
    activity.node_type === 'end_event' ? 'endNode' : 'activity'
  return {
    id: activity.id,
    type,
    position: { x: activity.position_x, y: activity.position_y },
    data: { activity, hasChildren: false, onStatusIconChange, onOpenDetail },
  }
}

function canvasObjectToNode(
  obj: CanvasObject,
  onOpenPopup?: (id: string) => void,
  onNameChange?: (id: string, name: string) => void,
): Node<CanvasObjectNodeData> {
  return {
    id: obj.id,
    type: obj.object_type === 'quelle' ? 'sourceNode' : 'dataObjectNode',
    position: { x: obj.position_x, y: obj.position_y },
    data: { canvasObject: obj, onOpenPopup, onNameChange },
  }
}

function canvasEdgeToRFEdge(edge: CanvasEdge): Edge {
  return {
    id: edge.id,
    source: edge.from_node_id,
    target: edge.to_node_id,
    label: edge.label ?? undefined,
  }
}

interface WorkflowCanvasProps {
  callbacksRef?: React.MutableRefObject<CanvasToolbarCallbacks | null>
}

export function WorkflowCanvas({ callbacksRef }: WorkflowCanvasProps = {}) {
  const { workspaceId, parentActivityId } = useCanvasStore()

  const { data: activities = [] } = useActivities(workspaceId, parentActivityId)
  const { data: canvasObjects = [] } = useCanvasObjects(workspaceId, parentActivityId)
  const { data: canvasEdges = [] } = useCanvasEdges(workspaceId, parentActivityId)

  const upsertActivity = useUpsertActivity(workspaceId ?? '')
  const upsertCanvasObject = useUpsertCanvasObject(workspaceId ?? '')
  const upsertCanvasEdge = useUpsertCanvasEdge(workspaceId ?? '')
  const deleteCanvasEdge = useDeleteCanvasEdge(workspaceId ?? '')

  const [detailActivityId, setDetailActivityId] = useState<string | null>(null)
  const [dataObjectPopupId, setDataObjectPopupId] = useState<string | null>(null)

  const detailActivity = activities.find(a => a.id === detailActivityId) ?? null
  const dataObjectForPopup = canvasObjects.find(o => o.id === dataObjectPopupId) ?? null

  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([])
  const [createForm, setCreateForm] = useState<{ x: number; y: number } | null>(null)

  const activitiesRef = useRef(activities)
  activitiesRef.current = activities
  const canvasObjectsRef = useRef(canvasObjects)
  canvasObjectsRef.current = canvasObjects

  const autoSeededRef = useRef(false)

  const handleStatusIconChange = useCallback(async (activityId: string, icon: StatusIcon | null) => {
    const activity = activitiesRef.current.find(a => a.id === activityId)
    if (!activity || !workspaceId) return
    await upsertActivity.mutateAsync({
      id: activityId,
      label: activity.label,
      position_x: activity.position_x,
      position_y: activity.position_y,
      parent_id: parentActivityId ?? null,
      node_type: activity.node_type,
      status_icon: icon,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, parentActivityId])

  const handleOpenDetail = useCallback((activityId: string) => {
    setDetailActivityId(activityId)
  }, [])

  const handleOpenDataObjectPopup = useCallback((objectId: string) => {
    setDataObjectPopupId(objectId)
  }, [])

  const handleNameChange = useCallback(async (objectId: string, name: string) => {
    const obj = canvasObjectsRef.current.find(o => o.id === objectId)
    if (!obj || !workspaceId) return
    await upsertCanvasObject.mutateAsync({
      id: objectId,
      name,
      object_type: obj.object_type,
      position_x: obj.position_x,
      position_y: obj.position_y,
      parent_activity_id: parentActivityId ?? null,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, parentActivityId])

  // Sync nodes
  const activityIdsKey = activities.map(a => a.id).join(',')
  const objectIdsKey = canvasObjects.map(o => o.id).join(',')
  const prevKeysRef = useRef('')
  const currentKey = `${activityIdsKey}|${objectIdsKey}`

  useEffect(() => {
    if (currentKey === prevKeysRef.current) return
    prevKeysRef.current = currentKey
    const activityNodes = activities.map(a => activityToNode(a, handleStatusIconChange, handleOpenDetail))
    const objectNodes = canvasObjects.map(o => canvasObjectToNode(o, handleOpenDataObjectPopup, handleNameChange))
    setNodes([...activityNodes, ...objectNodes])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey])

  // Sync edges
  const edgeIdsKey = canvasEdges.map(e => e.id).join(',')
  const prevEdgeKeyRef = useRef('')
  useEffect(() => {
    if (edgeIdsKey === prevEdgeKeyRef.current) return
    prevEdgeKeyRef.current = edgeIdsKey
    setEdges(canvasEdges.map(canvasEdgeToRFEdge))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edgeIdsKey])

  // Auto-seed
  useEffect(() => {
    if (autoSeededRef.current) return
    if (!workspaceId) return
    if (activities.length > 0 || canvasObjects.length > 0) {
      autoSeededRef.current = true
      return
    }
    autoSeededRef.current = true
    async function seed() {
      await upsertActivity.mutateAsync({ label: '', node_type: 'start_event', position_x: 80, position_y: 200, parent_id: parentActivityId ?? null })
      await upsertActivity.mutateAsync({ label: 'Neue Aktivität', node_type: 'activity', position_x: 240, position_y: 200, parent_id: parentActivityId ?? null })
    }
    seed()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, activities.length, canvasObjects.length])

  // Persist new connections
  const onConnect = useCallback(async (connection: Connection) => {
    if (!workspaceId) return
    const allNodes = [
      ...activitiesRef.current.map(a => ({ id: a.id, kind: 'activity' as EdgeNodeType })),
      ...canvasObjectsRef.current.map(o => ({ id: o.id, kind: 'canvas_object' as EdgeNodeType })),
    ]
    const sourceKind = allNodes.find(n => n.id === connection.source)?.kind ?? 'activity'
    const targetKind = allNodes.find(n => n.id === connection.target)?.kind ?? 'activity'
    const saved = await upsertCanvasEdge.mutateAsync({
      from_node_type: sourceKind,
      from_node_id: connection.source!,
      to_node_type: targetKind,
      to_node_id: connection.target!,
      parent_activity_id: parentActivityId ?? null,
    })
    setEdges(eds => addEdge({ ...connection, id: saved.id }, eds))
  }, [workspaceId, parentActivityId, upsertCanvasEdge, setEdges])

  // Persist edge deletions
  const onEdgesDelete = useCallback(async (deletedEdges: Edge[]) => {
    for (const edge of deletedEdges) {
      await deleteCanvasEdge.mutateAsync(edge.id)
    }
  }, [deleteCanvasEdge])

  const onNodeDragStop = useCallback(async (_event: React.MouseEvent, node: Node) => {
    if (!workspaceId) return
    const activity = activitiesRef.current.find(a => a.id === node.id)
    if (activity) {
      await upsertActivity.mutateAsync({ id: node.id, label: activity.label, position_x: node.position.x, position_y: node.position.y, parent_id: parentActivityId ?? null, node_type: activity.node_type })
      return
    }
    const obj = canvasObjectsRef.current.find(o => o.id === node.id)
    if (obj) {
      await upsertCanvasObject.mutateAsync({ id: node.id, name: obj.name, object_type: obj.object_type, position_x: node.position.x, position_y: node.position.y, parent_activity_id: parentActivityId ?? null })
    }
  }, [workspaceId, parentActivityId, upsertActivity, upsertCanvasObject])

  const onPaneDoubleClick = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement
    if (target.closest('.react-flow__node')) return
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
    setCreateForm({ x: event.clientX - bounds.left, y: event.clientY - bounds.top })
  }, [])

  async function handleCreateActivity(label: string, triggerType: TriggerType) {
    if (!workspaceId || !createForm) return
    await upsertActivity.mutateAsync({ label, trigger_type: triggerType, position_x: createForm.x, position_y: createForm.y, parent_id: parentActivityId ?? null })
    setCreateForm(null)
  }

  // Drag-from-connector
  const connectingNodeId = useRef<string | null>(null)

  const onConnectStart = useCallback((_: React.MouseEvent | React.TouchEvent, params: OnConnectStartParams) => {
    connectingNodeId.current = params.nodeId ?? null
  }, [])

  const onConnectEnd = useCallback(async (event: MouseEvent | TouchEvent) => {
    if (!connectingNodeId.current || !workspaceId) return
    const target = (event as MouseEvent).target as Element
    if (target.closest('.react-flow__node')) { connectingNodeId.current = null; return }
    const pane = document.querySelector('.react-flow__pane')
    if (!pane) return
    const bounds = pane.getBoundingClientRect()
    const x = (event as MouseEvent).clientX - bounds.left
    const y = (event as MouseEvent).clientY - bounds.top
    const sourceId = connectingNodeId.current
    connectingNodeId.current = null
    const newActivity = await upsertActivity.mutateAsync({ label: 'Neue Aktivität', node_type: 'activity', position_x: x, position_y: y, parent_id: parentActivityId ?? null })
    if (newActivity?.id) {
      const saved = await upsertCanvasEdge.mutateAsync({ from_node_type: 'activity', from_node_id: sourceId, to_node_type: 'activity', to_node_id: newActivity.id, parent_activity_id: parentActivityId ?? null })
      setEdges(eds => addEdge({ source: sourceId, target: newActivity.id, id: saved.id, sourceHandle: null, targetHandle: null }, eds))
    }
  }, [workspaceId, parentActivityId, upsertActivity, upsertCanvasEdge, setEdges])

  // Toolbar helpers
  const rightmostX = useMemo(() => {
    const all = [...activities.map(a => a.position_x), ...canvasObjects.map(o => o.position_x)]
    return all.length === 0 ? 240 : Math.max(...all)
  }, [activities, canvasObjects])

  const rightmostY = useMemo(() => {
    const all = [...activities, ...canvasObjects]
    if (all.length === 0) return 200
    return all.reduce((acc, a) => a.position_x > acc.position_x ? a : acc).position_y
  }, [activities, canvasObjects])

  const hasStart = activities.some(a => a.node_type === 'start_event')
  const hasEnd = activities.some(a => a.node_type === 'end_event')

  const insertStart = useCallback(async () => {
    if (!workspaceId) return
    await upsertActivity.mutateAsync({ label: '', node_type: 'start_event', position_x: 80, position_y: 200, parent_id: parentActivityId ?? null })
  }, [workspaceId, parentActivityId, upsertActivity])

  const insertActivity = useCallback(async () => {
    if (!workspaceId) return
    await upsertActivity.mutateAsync({ label: 'Neue Aktivität', node_type: 'activity', position_x: rightmostX + 200, position_y: rightmostY, parent_id: parentActivityId ?? null })
  }, [workspaceId, parentActivityId, upsertActivity, rightmostX, rightmostY])

  const insertEnd = useCallback(async () => {
    if (!workspaceId) return
    await upsertActivity.mutateAsync({ label: '', node_type: 'end_event', position_x: rightmostX + 200, position_y: rightmostY, parent_id: parentActivityId ?? null })
  }, [workspaceId, parentActivityId, upsertActivity, rightmostX, rightmostY])

  const insertQuelle = useCallback(async () => {
    if (!workspaceId) return
    await upsertCanvasObject.mutateAsync({ name: 'Neue Quelle', object_type: 'quelle', position_x: rightmostX + 200, position_y: rightmostY - 80, parent_activity_id: parentActivityId ?? null })
  }, [workspaceId, parentActivityId, upsertCanvasObject, rightmostX, rightmostY])

  const insertDatenobjekt = useCallback(async () => {
    if (!workspaceId) return
    await upsertCanvasObject.mutateAsync({ name: 'Neues Datenobjekt', object_type: 'datenobjekt', position_x: rightmostX + 200, position_y: rightmostY + 80, parent_activity_id: parentActivityId ?? null })
  }, [workspaceId, parentActivityId, upsertCanvasObject, rightmostX, rightmostY])

  useEffect(() => {
    if (!callbacksRef) return
    callbacksRef.current = { onInsertStart: insertStart, onInsertActivity: insertActivity, onInsertEnd: insertEnd, onInsertQuelle: insertQuelle, onInsertDatenobjekt: insertDatenobjekt, hasStart, hasEnd }
  })

  return (
    <div className="w-full h-full relative" style={{ background: '#0f172a' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes}
        onDoubleClick={onPaneDoubleClick}
        onNodeDragStop={onNodeDragStop}
        fitView
        deleteKeyCode="Delete"
        style={{ background: '#0f172a' }}
      >
        <Background color="#1e293b" gap={24} />
        <Controls />
        <MiniMap nodeColor="#3b82f6" style={{ background: '#1e293b' }} />
      </ReactFlow>

      {createForm && (
        <CreateActivityForm position={createForm} onConfirm={handleCreateActivity} onCancel={() => setCreateForm(null)} />
      )}

      {detailActivity && (
        <ActivityDetailPopup
          activity={detailActivity}
          workspaceId={workspaceId ?? ''}
          parentActivityId={parentActivityId}
          onClose={() => setDetailActivityId(null)}
        />
      )}

      {dataObjectForPopup && (
        <DataObjectPopup
          canvasObject={dataObjectForPopup}
          workspaceId={workspaceId ?? ''}
          onClose={() => setDataObjectPopupId(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Tests ausführen — erwartet PASS**

```bash
cd frontend && npx vitest run src/components/canvas/WorkflowCanvas.test.tsx
```

Erwartet: PASS (1 Test grün).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/canvas/WorkflowCanvas.tsx \
        frontend/src/components/canvas/WorkflowCanvas.test.tsx
git commit -m "feat: integrate canvas objects, edges and popups into WorkflowCanvas"
```
