import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createActivity, createCanvasGroup, createSourceObject, getLatestReactFlowProps, renderWorkflowCanvas } from './WorkflowCanvas.test-utils'

describe('WorkflowCanvas layout interactions', () => {
  it('keeps the freeform y-position while dragging in lane mode and persists only the x-change', () => {
    const onMoveNode = vi.fn()

    renderWorkflowCanvas({
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

    renderWorkflowCanvas({
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

    renderWorkflowCanvas({
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

    renderWorkflowCanvas({
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

    renderWorkflowCanvas({
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

  it('renders canvas groups and persists group drags', async () => {
    const onMoveGroup = vi.fn()

    renderWorkflowCanvas({
      activities: [createActivity({ id: 'activity-1', group_id: 'group-1' })],
      canvasGroups: [createCanvasGroup()],
      onMoveGroup,
    })

    expect(screen.getByTestId('rf-node-group-1')).toBeInTheDocument()

    const latestProps = getLatestReactFlowProps<{
      onNodeDragStop?: (event: unknown, node: { id: string; position: { x: number; y: number }; data?: unknown }) => void
    }>()

    act(() => {
      latestProps.onNodeDragStop?.({}, {
        id: 'group-1',
        position: { x: 180, y: 120 },
        data: { canvasGroup: createCanvasGroup() },
      })
    })

    await waitFor(() => {
      expect(onMoveGroup).toHaveBeenCalledWith('group-1', { x: 180, y: 120 })
    })
  })

  it('uses the group header as explicit drag handle and keeps unselected groups behind content nodes', () => {
    renderWorkflowCanvas({
      activities: [createActivity({ id: 'activity-1' })],
      canvasGroups: [createCanvasGroup({ id: 'group-1' })],
    })

    const latestProps = getLatestReactFlowProps<{ nodes: Array<{ id: string; dragHandle?: string; style?: { zIndex?: number } }> }>()
    const groupNode = latestProps.nodes.find((node) => node.id === 'group-1')
    const activityNode = latestProps.nodes.find((node) => node.id === 'activity-1')

    expect(groupNode?.dragHandle).toBe('.wow-group-node__header')
    expect(groupNode?.style?.zIndex).toBe(0)
    expect(activityNode?.style?.zIndex).toBe(2)
  })

  it('raises selected groups above content nodes so the header stays clickable', () => {
    renderWorkflowCanvas({
      selectedNodeId: 'group-1',
      activities: [createActivity({ id: 'activity-1' })],
      canvasGroups: [createCanvasGroup({ id: 'group-1' })],
    })

    const latestProps = getLatestReactFlowProps<{ nodes: Array<{ id: string; style?: { zIndex?: number } }> }>()
    const groupNode = latestProps.nodes.find((node) => node.id === 'group-1')
    const activityNode = latestProps.nodes.find((node) => node.id === 'activity-1')

    expect(groupNode?.style?.zIndex).toBe(3)
    expect(activityNode?.style?.zIndex).toBe(2)
  })

  it('shrinks collapsed groups to header height and exposes rename/collapse callbacks', () => {
    const onRenameGroup = vi.fn()
    const onToggleCollapseGroup = vi.fn()

    renderWorkflowCanvas({
      canvasGroups: [createCanvasGroup({ id: 'group-1', collapsed: true })],
      onRenameGroup,
      onToggleCollapseGroup,
    })

    const latestProps = getLatestReactFlowProps<{
      nodes: Array<{
        id: string
        style?: { height?: number }
        data?: { onRename?: (groupId: string, label: string) => void; onToggleCollapsed?: (groupId: string) => void }
      }>
    }>()
    const groupNode = latestProps.nodes.find((node) => node.id === 'group-1')

    expect(groupNode?.style?.height).toBe(72)

    groupNode?.data?.onRename?.('group-1', 'Neue Gruppe')
    groupNode?.data?.onToggleCollapsed?.('group-1')

    expect(onRenameGroup).toHaveBeenCalledWith('group-1', 'Neue Gruppe')
    expect(onToggleCollapseGroup).toHaveBeenCalledWith('group-1')
  })

  it('does not persist drags for locked canvas groups', () => {
    const onMoveGroup = vi.fn()

    renderWorkflowCanvas({
      canvasGroups: [createCanvasGroup({ locked: true })],
      onMoveGroup,
    })

    const latestProps = getLatestReactFlowProps<{
      onNodeDrag?: (event: unknown, node: { id: string; position: { x: number; y: number }; data?: unknown }) => void
      onNodeDragStop?: (event: unknown, node: { id: string; position: { x: number; y: number }; data?: unknown }) => void
    }>()

    act(() => {
      latestProps.onNodeDrag?.({}, {
        id: 'group-1',
        position: { x: 180, y: 120 },
        data: { canvasGroup: createCanvasGroup({ locked: true }) },
      })
      latestProps.onNodeDragStop?.({}, {
        id: 'group-1',
        position: { x: 180, y: 120 },
        data: { canvasGroup: createCanvasGroup({ locked: true }) },
      })
    })

    expect(onMoveGroup).not.toHaveBeenCalled()
  })

  it('shows alignment guides while a node is dragged near another node', async () => {
    renderWorkflowCanvas({
      activities: [
        createActivity({ id: 'activity-1', position_x: 200, position_y: 120 }),
        createActivity({ id: 'activity-2', position_x: 520, position_y: 999 }),
      ],
    })

    fireEvent.click(screen.getByTestId('rf-drag-node-activity-1'))

    await waitFor(() => {
      expect(screen.getByTestId('canvas-alignment-guide-horizontal')).toBeVisible()
    })
  })
})
