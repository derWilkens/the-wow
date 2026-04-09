import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

                Object.defineProperty(element, 'getBoundingClientRect', {
                  configurable: true,
                  value: () => ({
                    x: node.position.x,
                    y: node.position.y,
                    left: node.position.x,
                    top: node.position.y,
                    right: node.position.x + 220,
                    bottom: node.position.y + 140,
                    width: 220,
                    height: 140,
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
  snapToGridEnabled = true,
  collisionAvoidanceEnabled = true,
  activityRolesById = {} as Record<string, string>,
  activityRoleAcronymsById = {} as Record<string, string | null>,
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
        snapToGridEnabled={snapToGridEnabled}
        collisionAvoidanceEnabled={collisionAvoidanceEnabled}
        activityRolesById={activityRolesById}
        activityRoleAcronymsById={activityRoleAcronymsById}
        organizationRoles={[]}
        activityAssigneesById={activityAssigneesById}
        focusNodeId={null}
        onInterruptFocusAnimation={vi.fn()}
        onViewportCenterChange={vi.fn()}
        onSelectionChange={vi.fn()}
        onToolbarDrop={vi.fn()}
        onSelectActivity={vi.fn()}
        onOpenDataObject={vi.fn()}
        onOpenSubprocessMenu={vi.fn()}
        onOpenSubprocess={vi.fn()}
        onInlineRenameActivity={vi.fn()}
        onQuickChangeActivityType={vi.fn()}
        onQuickChangeActivityRole={vi.fn()}
        onCreateRole={vi.fn()}
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
  function getLatestReactFlowProps<T>() {
    return reactFlowSpy.mock.calls[reactFlowSpy.mock.calls.length - 1]?.[0] as T
  }

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

  it('passes snap to grid preferences through to React Flow', () => {
    renderCanvas({ snapToGridEnabled: false })

    const latestProps = getLatestReactFlowProps<{ snapToGrid?: boolean; snapGrid?: [number, number] }>()
    expect(latestProps.snapToGrid).toBe(false)
    expect(latestProps.snapGrid).toEqual([28, 28])
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

  it('moves a collided neighbor aside when collision avoidance is enabled during drag stop', () => {
    const onMoveNode = vi.fn()

    renderCanvas({
      activities: [
        createActivity({ id: 'activity-1', position_x: 200, position_y: 120 }),
        createActivity({ id: 'activity-2', position_x: 520, position_y: 120 }),
      ],
      onMoveNode,
    })

    const latestProps = getLatestReactFlowProps<{ onNodeDragStop?: (event: unknown, node: { id: string; position: { x: number; y: number } }) => void }>()

    act(() => {
      latestProps.onNodeDragStop?.({}, { id: 'activity-1', position: { x: 460, y: 120 } })
    })

    expect(onMoveNode).toHaveBeenCalledWith('activity-2', { x: 708, y: 120 })
    expect(onMoveNode).toHaveBeenCalledWith('activity-1', { x: 460, y: 120 })
  })

  it('also applies collision avoidance when a start node collides with another node', () => {
    const onMoveNode = vi.fn()

    renderCanvas({
      activities: [
        createActivity({ id: 'start-1', node_type: 'start_event', label: 'Start', position_x: 200, position_y: 120 }),
        createActivity({ id: 'activity-2', position_x: 320, position_y: 120 }),
      ],
      onMoveNode,
    })

    const latestProps = getLatestReactFlowProps<{ onNodeDragStop?: (event: unknown, node: { id: string; position: { x: number; y: number } }) => void }>()

    act(() => {
      latestProps.onNodeDragStop?.({}, { id: 'start-1', position: { x: 300, y: 120 } })
    })

    expect(onMoveNode).toHaveBeenCalledWith('activity-2', { x: 384, y: 120 })
    expect(onMoveNode).toHaveBeenCalledWith('start-1', { x: 300, y: 120 })
  })

  it('also applies collision avoidance when a source node collides with another node', () => {
    const onMoveNode = vi.fn()

    renderCanvas({
      activities: [createActivity({ id: 'activity-1', position_x: 420, position_y: 120 })],
      canvasObjects: [createSourceObject({ id: 'source-1', position_x: 200, position_y: 120 })],
      onMoveNode,
    })

    const latestProps = getLatestReactFlowProps<{ onNodeDragStop?: (event: unknown, node: { id: string; position: { x: number; y: number } }) => void }>()

    act(() => {
      latestProps.onNodeDragStop?.({}, { id: 'source-1', position: { x: 360, y: 120 } })
    })

    expect(onMoveNode).toHaveBeenCalledWith('activity-1', { x: 564, y: 120 })
    expect(onMoveNode).toHaveBeenCalledWith('source-1', { x: 360, y: 120 })
  })

  it('does not move neighboring nodes when collision avoidance is disabled', () => {
    const onMoveNode = vi.fn()

    renderCanvas({
      activities: [
        createActivity({ id: 'activity-1', position_x: 200, position_y: 120 }),
        createActivity({ id: 'activity-2', position_x: 520, position_y: 120 }),
      ],
      collisionAvoidanceEnabled: false,
      onMoveNode,
    })

    const latestProps = getLatestReactFlowProps<{ onNodeDragStop?: (event: unknown, node: { id: string; position: { x: number; y: number } }) => void }>()

    act(() => {
      latestProps.onNodeDragStop?.({}, { id: 'activity-1', position: { x: 460, y: 120 } })
    })

    expect(onMoveNode).toHaveBeenCalledTimes(1)
    expect(onMoveNode).toHaveBeenCalledWith('activity-1', { x: 460, y: 120 })
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
          activityRoleAcronymsById={{}}
          organizationRoles={[]}
          activityAssigneesById={{}}
          focusNodeId={null}
          onInterruptFocusAnimation={vi.fn()}
          onViewportCenterChange={vi.fn()}
          onSelectionChange={vi.fn()}
          onToolbarDrop={vi.fn()}
          onSelectActivity={vi.fn()}
          onOpenDataObject={vi.fn()}
          onOpenSubprocessMenu={vi.fn()}
          onOpenSubprocess={vi.fn()}
          onInlineRenameActivity={vi.fn()}
          onQuickChangeActivityType={vi.fn()}
          onQuickChangeActivityRole={vi.fn()}
          onCreateRole={vi.fn()}
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

  it('shows handles only for the nearest target node while a connection is dragged nearby', async () => {
    render(
      <div style={{ width: 1200, height: 800 }}>
        <WorkflowCanvas
          activities={[
            createActivity({ id: 'activity-1', position_x: 100, position_y: 120 }),
            createActivity({ id: 'activity-2', position_x: 460, position_y: 120 }),
            createActivity({ id: 'activity-3', position_x: 820, position_y: 120 }),
          ]}
          canvasObjects={[]}
          canvasEdges={[]}
          selectedNodeId="activity-1"
          selectedEdgeId={null}
          selectedDataObjectId={null}
          groupingMode="free"
          activityRolesById={{}}
          activityRoleAcronymsById={{}}
          organizationRoles={[]}
          activityAssigneesById={{}}
          focusNodeId={null}
          onInterruptFocusAnimation={vi.fn()}
          onViewportCenterChange={vi.fn()}
          onSelectionChange={vi.fn()}
          onToolbarDrop={vi.fn()}
          onSelectActivity={vi.fn()}
          onOpenDataObject={vi.fn()}
          onOpenSubprocessMenu={vi.fn()}
          onOpenSubprocess={vi.fn()}
          onInlineRenameActivity={vi.fn()}
          onQuickChangeActivityType={vi.fn()}
          onQuickChangeActivityRole={vi.fn()}
          onCreateRole={vi.fn()}
          onConnectEdge={vi.fn()}
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

    const latestProps = getLatestReactFlowProps<Record<string, unknown>>()
    const onConnectStart = latestProps.onConnectStart as (event: unknown, params: { nodeId: string; handleId: string | null; handleType: 'source' | 'target' | null }) => void

    await act(async () => {
      onConnectStart({}, { nodeId: 'activity-1', handleId: 'source-right', handleType: 'source' })
    })
    fireEvent.mouseMove(screen.getByTestId('workflow-canvas'), { clientX: 470, clientY: 150 })

    await waitFor(() => {
      const updatedProps = getLatestReactFlowProps<{ nodes: Array<{ id: string; data: { showHandles?: boolean; isConnectionPreviewTarget?: boolean } }> }>()
      const sourceNode = updatedProps.nodes.find((node) => node.id === 'activity-1')
      const previewNode = updatedProps.nodes.find((node) => node.id === 'activity-2')
      const farNode = updatedProps.nodes.find((node) => node.id === 'activity-3')

      expect(sourceNode?.data.showHandles).toBe(true)
      expect(previewNode?.data.showHandles).toBe(true)
      expect(previewNode?.data.isConnectionPreviewTarget).toBe(true)
      expect(farNode?.data.showHandles).not.toBe(true)
    })

    fireEvent.mouseMove(screen.getByTestId('workflow-canvas'), { clientX: 40, clientY: 40 })

    await waitFor(() => {
      const updatedProps = getLatestReactFlowProps<{ nodes: Array<{ id: string; data: { showHandles?: boolean; isConnectionPreviewTarget?: boolean } }> }>()
      const previewNode = updatedProps.nodes.find((node) => node.id === 'activity-2')
      expect(previewNode?.data.isConnectionPreviewTarget).not.toBe(true)
    })
  })

  it('interrupts a focus animation when the user pans or clicks the pane', () => {
    const onInterruptFocusAnimation = vi.fn()

    render(
      <div style={{ width: 1200, height: 800 }}>
        <WorkflowCanvas
          activities={[createActivity({ id: 'activity-1', position_x: 200, position_y: 120 })]}
          canvasObjects={[]}
          canvasEdges={[]}
          selectedNodeId={null}
          selectedEdgeId={null}
          selectedDataObjectId={null}
          groupingMode="free"
          activityRolesById={{}}
          activityRoleAcronymsById={{}}
          organizationRoles={[]}
          activityAssigneesById={{}}
          focusNodeId="activity-1"
          onInterruptFocusAnimation={onInterruptFocusAnimation}
          onViewportCenterChange={vi.fn()}
          onSelectionChange={vi.fn()}
          onToolbarDrop={vi.fn()}
          onSelectActivity={vi.fn()}
          onOpenDataObject={vi.fn()}
          onOpenSubprocessMenu={vi.fn()}
          onOpenSubprocess={vi.fn()}
          onInlineRenameActivity={vi.fn()}
          onQuickChangeActivityType={vi.fn()}
          onQuickChangeActivityRole={vi.fn()}
          onCreateRole={vi.fn()}
          onConnectEdge={vi.fn()}
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

    fireEvent.click(screen.getByTestId('rf-move-start'))
    fireEvent.click(screen.getByTestId('workflow-canvas'))

    expect(onInterruptFocusAnimation).toHaveBeenCalled()
  })
})
