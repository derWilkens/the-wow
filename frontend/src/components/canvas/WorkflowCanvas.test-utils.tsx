import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import type { ComponentProps } from 'react'
import type { Activity, CanvasEdge, CanvasGroup, CanvasGroupingMode, CanvasObject } from '../../types'

let latestReactFlowProps: unknown = null

export const fitViewSpy = vi.fn()
export const setCenterSpy = vi.fn()

vi.mock('reactflow', async () => {
  const React = await import('react')

  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      latestReactFlowProps = props
      React.useEffect(() => {
        ;(props.onInit as undefined | ((instance: Record<string, unknown>) => void))?.({
          fitView: fitViewSpy,
          getZoom: () => 0.8,
          setCenter: setCenterSpy,
          getViewport: () => ({ x: 0, y: 0, zoom: 0.8 }),
          setViewport: vi.fn(),
          screenToFlowPosition: (position: { x: number; y: number }) => position,
        })
      }, [props])
      const nodes =
        (props.nodes as Array<{ id: string; position: { x: number; y: number }; width?: number; height?: number; style?: { width?: number; height?: number } }>) ?? []
      const onNodeDrag = props.onNodeDrag as undefined | ((event: unknown, node: { id: string; position: { x: number; y: number } }) => void)
      const onNodeDragStop = props.onNodeDragStop as undefined | ((event: unknown, node: { id: string; position: { x: number; y: number }; data?: unknown }) => void)
      const onConnectStart = props.onConnectStart as undefined | ((event: unknown, params: { nodeId: string; handleId: string | null; handleType: 'source' | 'target' | null }) => void)
      const onConnectEnd = props.onConnectEnd as undefined | ((event: { target: Element; clientX: number; clientY: number }) => void)
      const onMoveStart = props.onMoveStart as undefined | (() => void)
      const children = props.children as ReactNode

      return (
        <div data-testid="react-flow">
          {nodes.map((node) => (
            <div
              key={node.id}
              ref={(element) => {
                if (!element) {
                  return
                }

                const width = node.style?.width ?? node.width ?? 220
                const height = node.style?.height ?? node.height ?? 140

                Object.defineProperty(element, 'getBoundingClientRect', {
                  configurable: true,
                  value: () => ({
                    x: node.position.x,
                    y: node.position.y,
                    left: node.position.x,
                    top: node.position.y,
                    right: node.position.x + width,
                    bottom: node.position.y + height,
                    width,
                    height,
                    toJSON: () => ({}),
                  }),
                })
              }}
              data-testid={`rf-node-${node.id}`}
              className="react-flow__node"
              data-id={node.id}
              data-x={String(node.position.x)}
              data-y={String(node.position.y)}
            >
              <div data-testid={`rf-handle-${node.id}`} className="react-flow__handle" data-handleid="target-left" />
            </div>
          ))}
          <button
            type="button"
            data-testid="rf-drag-node-activity-1"
            onClick={() => onNodeDrag?.({}, { id: 'activity-1', position: { x: 480, y: 999 } })}
          >
            drag
          </button>
          <button
            type="button"
            data-testid="rf-stop-node-activity-1"
            onClick={() => onNodeDragStop?.({}, { id: 'activity-1', position: { x: 480, y: 999 } })}
          >
            stop
          </button>
          <button
            type="button"
            data-testid="rf-connect-node-body"
            onClick={() => {
              onConnectStart?.({}, { nodeId: 'activity-1', handleId: 'source-right', handleType: 'source' })
              const target = document.querySelector('[data-testid="rf-node-activity-2"]') as Element
              onConnectEnd?.({ target, clientX: 100, clientY: 100 })
            }}
          >
            connect-node-body
          </button>
          <button type="button" data-testid="rf-move-start" onClick={() => onMoveStart?.()}>
            move-start
          </button>
          {children}
        </div>
      )
    },
    Background: () => <div data-testid="rf-background" />,
    Controls: ({ position }: { position: string }) => <div data-testid="rf-controls" data-position={position} />,
    MarkerType: { ArrowClosed: 'arrowclosed' },
    SelectionMode: { Partial: 'partial' },
    applyNodeChanges: (_changes: unknown, nodes: unknown) => nodes,
    Position: {
      Left: 'left',
      Right: 'right',
      Top: 'top',
      Bottom: 'bottom',
    },
  }
})

import { WorkflowCanvas } from './WorkflowCanvas'

export function getLatestReactFlowProps<T>() {
  return latestReactFlowProps as T
}

export function createActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'activity-1',
    workspace_id: 'workspace-1',
    parent_id: null,
    owner_id: 'user-1',
    assignee_label: 'AG BIM-Koordinator',
    role_id: 'role-1',
    node_type: 'activity',
    label: 'Pruefen',
    trigger_type: null,
    position_x: 200,
    position_y: 120,
    status: 'draft',
    status_icon: null,
    activity_type: null,
    description: null,
    notes: null,
    duration_minutes: null,
    linked_workflow_id: null,
    linked_workflow_mode: null,
    linked_workflow_purpose: null,
    linked_workflow_inputs: [],
    linked_workflow_outputs: [],
    updated_at: '2026-04-04T00:00:00.000Z',
    ...overrides,
  }
}

export function createSourceObject(overrides: Partial<Extract<CanvasObject, { object_type: 'quelle' }>> = {}): Extract<CanvasObject, { object_type: 'quelle' }> {
  return {
    id: 'source-1',
    workspace_id: 'workspace-1',
    parent_activity_id: null,
    object_type: 'quelle',
    name: 'Archiv',
    edge_id: null,
    edge_sort_order: null,
    position_x: 80,
    position_y: 320,
    updated_at: '2026-04-04T00:00:00.000Z',
    ...overrides,
  }
}

export function createCanvasGroup(overrides: Partial<CanvasGroup> = {}): CanvasGroup {
  return {
    id: 'group-1',
    workspace_id: 'workspace-1',
    parent_activity_id: null,
    label: 'Gruppe 1',
    position_x: 120,
    position_y: 80,
    width: 520,
    height: 340,
    locked: false,
    collapsed: false,
    z_index: 0,
    created_at: '2026-04-16T00:00:00.000Z',
    created_by: 'user-1',
    ...overrides,
  }
}

type WorkflowCanvasProps = ComponentProps<typeof WorkflowCanvas>

export function buildWorkflowCanvasProps(overrides: Partial<WorkflowCanvasProps> = {}): WorkflowCanvasProps {
  return {
    workspaceId: 'workspace-1',
    autoFitOnLoad: true,
    viewportRestoreRequest: null,
    onViewportRestoreApplied: vi.fn(),
    activities: [createActivity()],
    canvasGroups: [],
    canvasObjects: [],
    canvasEdges: [],
    selectedNodeId: null,
    selectedEdgeId: null,
    selectedDataObjectId: null,
    groupingMode: 'free' as CanvasGroupingMode,
    snapToGridEnabled: true,
    collisionAvoidanceEnabled: true,
    alignmentGuidesEnabled: true,
    magneticConnectionTargetsEnabled: true,
    activityRolesById: {},
    activityRoleAcronymsById: {},
    organizationRoles: [],
    activityAssigneesById: {},
    focusNodeId: null,
    onInterruptFocusAnimation: vi.fn(),
    onViewportCenterChange: vi.fn(),
    onSelectionChange: vi.fn(),
    onToolbarDrop: vi.fn(),
    onSelectActivity: vi.fn(),
    onOpenDataObject: vi.fn(),
    onOpenSubprocess: vi.fn(),
    onCreateSubprocess: vi.fn(),
    onLinkSubprocess: vi.fn(),
    onUnlinkSubprocess: vi.fn(),
    onDeleteLinkedSubprocess: vi.fn(),
    onInlineRenameActivity: vi.fn(),
    onQuickChangeActivityType: vi.fn(),
    onQuickChangeActivityRole: vi.fn(),
    onCreateRole: vi.fn(),
    onConnectEdge: vi.fn(),
    onCreateActivityFromConnectionDrop: vi.fn(),
    onMoveNode: vi.fn(),
    onToggleLockSelection: vi.fn(),
    onDuplicateSelection: vi.fn(),
    onNudgeSelection: vi.fn(),
    onAlignSelection: vi.fn(),
    onCreateGroup: vi.fn(),
    onMoveGroup: vi.fn(),
    onRenameGroup: vi.fn(),
    onToggleCollapseGroup: vi.fn(),
    onAggregateActivities: vi.fn(),
    onDeleteEdges: vi.fn(),
    onDeleteDataObject: vi.fn(),
    onDeleteSelection: vi.fn(),
    onCreateDataObjectOnEdge: vi.fn(),
    onAddExistingDataObjectToEdge: vi.fn(),
    ...overrides,
  }
}

export function renderWorkflowCanvas(overrides: Partial<WorkflowCanvasProps> = {}) {
  const props = buildWorkflowCanvasProps(overrides)
  const utils = render(
    <div style={{ width: 1200, height: 800 }}>
      <WorkflowCanvas {...props} />
    </div>,
  )

  return {
    ...utils,
    props,
  }
}

export { WorkflowCanvas }
export type { CanvasEdge, CanvasGroup, CanvasObject }
