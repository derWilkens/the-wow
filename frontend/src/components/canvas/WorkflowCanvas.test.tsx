import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { WorkflowCanvas } from './WorkflowCanvas'
import type { Activity, CanvasEdge, CanvasGroupingMode, CanvasObject } from '../../types'

const reactFlowSpy = vi.fn()

vi.mock('reactflow', async () => {
  const React = await import('react')

  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      reactFlowSpy(props)
      const nodes = (props.nodes as Array<{ id: string; position: { x: number; y: number } }>) ?? []
      const onNodeDrag = props.onNodeDrag as undefined | ((event: unknown, node: { id: string; position: { x: number; y: number } }) => void)
      const onNodeDragStop = props.onNodeDragStop as undefined | ((event: unknown, node: { id: string; position: { x: number; y: number } }) => void)
      const onConnectStart = props.onConnectStart as undefined | ((event: unknown, params: { nodeId: string; handleId: string | null; handleType: 'source' | 'target' | null }) => void)
      const onConnectEnd = props.onConnectEnd as undefined | ((event: { target: Element; clientX: number; clientY: number }) => void)
      const children = props.children as ReactNode

      return (
        <div data-testid="react-flow">
          <div data-testid="rf-node-element-activity-2" className="react-flow__node" data-id="activity-2">
            <div data-testid="rf-handle-activity-2" className="react-flow__handle" data-handleid="target-left" />
          </div>
          {nodes.map((node) => (
            <div
              key={node.id}
              data-testid={`rf-node-${node.id}`}
              data-x={String(node.position.x)}
              data-y={String(node.position.y)}
            />
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
              const target = document.querySelector('[data-testid="rf-node-element-activity-2"]') as Element
              onConnectEnd?.({ target, clientX: 100, clientY: 100 })
            }}
          >
            connect-node-body
          </button>
          {children}
        </div>
      )
    },
    Background: () => <div data-testid="rf-background" />,
    Controls: ({ position }: { position: string }) => <div data-testid="rf-controls" data-position={position} />,
    MarkerType: { ArrowClosed: 'arrowclosed' },
    applyNodeChanges: (_changes: unknown, nodes: unknown) => nodes,
    Position: {
      Left: 'left',
      Right: 'right',
      Top: 'top',
      Bottom: 'bottom',
    },
  }
})

function createActivity(overrides: Partial<Activity> = {}): Activity {
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

function createSourceObject(overrides: Partial<Extract<CanvasObject, { object_type: 'quelle' }>> = {}): Extract<CanvasObject, { object_type: 'quelle' }> {
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

function renderCanvas({
  activities = [createActivity()],
  canvasObjects = [] as CanvasObject[],
  canvasEdges = [] as CanvasEdge[],
  groupingMode = 'free' as CanvasGroupingMode,
  activityRolesById = {} as Record<string, string>,
  activityAssigneesById = {} as Record<string, string | null>,
  onMoveNode = vi.fn(),
} = {}) {
  const utils = render(
    <div style={{ width: 1200, height: 800 }}>
      <WorkflowCanvas
        activities={activities}
        canvasObjects={canvasObjects}
        canvasEdges={canvasEdges}
        selectedNodeId={null}
        selectedEdgeId={null}
        selectedDataObjectId={null}
        groupingMode={groupingMode}
        activityRolesById={activityRolesById}
        activityAssigneesById={activityAssigneesById}
        focusNodeId={null}
        onViewportCenterChange={vi.fn()}
        onSelectionChange={vi.fn()}
        onToolbarDrop={vi.fn()}
        onSelectActivity={vi.fn()}
        onOpenDataObject={vi.fn()}
        onOpenSubprocessMenu={vi.fn()}
        onOpenSubprocess={vi.fn()}
        onInlineRenameActivity={vi.fn()}
        onConnectEdge={vi.fn()}
        onCreateActivityFromConnectionDrop={vi.fn()}
        onMoveNode={onMoveNode}
        onDeleteEdges={vi.fn()}
        onDeleteDataObject={vi.fn()}
        onDeleteSelection={vi.fn()}
        onCreateDataObjectOnEdge={vi.fn()}
        onAddExistingDataObjectToEdge={vi.fn()}
      />
    </div>,
  )

  return {
    ...utils,
    onMoveNode,
  }
}

describe('WorkflowCanvas', () => {
  it('renders role lanes and snaps activities into the matching lane when grouped by role', () => {
    renderCanvas({
      groupingMode: 'role_lanes',
      activities: [
        createActivity({ id: 'activity-1', label: 'Pruefen', position_x: 220, position_y: 100 }),
        createActivity({ id: 'activity-2', label: 'Freigeben', position_x: 520, position_y: 260, role_id: null, assignee_label: null }),
      ],
      canvasObjects: [createSourceObject()],
      activityRolesById: {
        'activity-1': 'Sachbearbeitung',
      },
    })

    expect(screen.getByTestId('role-lane-overlay')).toBeInTheDocument()
    expect(screen.getByTestId('role-lane-Sachbearbeitung')).toBeInTheDocument()
    expect(screen.getByTestId('role-lane-Nicht zugeordnet')).toBeInTheDocument()
    expect(screen.getByTestId('rf-node-activity-1')).toHaveAttribute('data-y', '126')
    expect(screen.getByTestId('rf-node-activity-2')).toHaveAttribute('data-y', '326')
    expect(screen.getByTestId('rf-node-source-1')).toHaveAttribute('data-y', '320')
  })

  it('keeps the freeform y-position while dragging in lane mode and persists only the x-change', () => {
    const onMoveNode = vi.fn()

    renderCanvas({
      groupingMode: 'role_lanes',
      activityRolesById: { 'activity-1': 'Sachbearbeitung' },
      onMoveNode,
    })

    fireEvent.click(screen.getByTestId('rf-drag-node-activity-1'))
    expect(screen.getByTestId('rf-node-activity-1')).toHaveAttribute('data-y', '126')

    fireEvent.click(screen.getByTestId('rf-stop-node-activity-1'))
    expect(onMoveNode).toHaveBeenCalledWith('activity-1', {
      x: 480,
      y: 120,
    })
  })

  it('does not render lane backgrounds in free mode', () => {
    renderCanvas({
      groupingMode: 'free',
      activityRolesById: { 'activity-1': 'Sachbearbeitung' },
    })

    expect(screen.queryByTestId('role-lane-overlay')).not.toBeInTheDocument()
    expect(screen.getByTestId('rf-node-activity-1')).toHaveAttribute('data-y', '120')
  })

  it('creates a connection when the drag ends over the highlighted node body', async () => {
    const onConnectEdge = vi.fn()

    render(
      <div style={{ width: 1200, height: 800 }}>
        <WorkflowCanvas
          activities={[
            createActivity({ id: 'activity-1' }),
            createActivity({ id: 'activity-2', position_x: 520, position_y: 120 }),
          ]}
          canvasObjects={[]}
          canvasEdges={[]}
          selectedNodeId={null}
          selectedEdgeId={null}
          selectedDataObjectId={null}
          groupingMode="free"
          activityRolesById={{}}
          activityAssigneesById={{}}
          focusNodeId={null}
          onViewportCenterChange={vi.fn()}
          onSelectionChange={vi.fn()}
          onToolbarDrop={vi.fn()}
          onSelectActivity={vi.fn()}
          onOpenDataObject={vi.fn()}
          onOpenSubprocessMenu={vi.fn()}
          onOpenSubprocess={vi.fn()}
          onInlineRenameActivity={vi.fn()}
          onConnectEdge={onConnectEdge}
          onCreateActivityFromConnectionDrop={vi.fn()}
          onMoveNode={vi.fn()}
          onDeleteEdges={vi.fn()}
          onDeleteDataObject={vi.fn()}
          onDeleteSelection={vi.fn()}
          onCreateDataObjectOnEdge={vi.fn()}
          onAddExistingDataObjectToEdge={vi.fn()}
        />
      </div>,
    )

    fireEvent.click(screen.getByTestId('rf-connect-node-body'))

    await waitFor(() => {
      expect(onConnectEdge).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'activity-1',
          sourceHandle: 'source-right',
          target: 'activity-2',
        }),
      )
    })
  })
})
