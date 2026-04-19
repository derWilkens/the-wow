import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createActivity, createCanvasGroup, createSourceObject, getLatestReactFlowProps, renderWorkflowCanvas } from './WorkflowCanvas.test-utils'

describe('WorkflowCanvas selection actions', () => {
  it('shows the multi-selection action popover and locks the selected nodes', async () => {
    const onToggleLockSelection = vi.fn()

    renderWorkflowCanvas({
      activities: [
        createActivity({ id: 'activity-1', position_x: 200, position_y: 120 }),
        createActivity({ id: 'activity-2', position_x: 520, position_y: 120 }),
      ],
      onToggleLockSelection,
    })

    const latestProps = getLatestReactFlowProps<{
      onSelectionStart?: () => void
      onSelectionChange?: (params: { nodes: Array<{ id: string }>; edges: Array<{ id: string }> }) => void
      onSelectionEnd?: () => void
    }>()

    act(() => {
      latestProps.onSelectionStart?.()
      latestProps.onSelectionChange?.({
        nodes: [{ id: 'activity-1' }, { id: 'activity-2' }],
        edges: [],
      })
      latestProps.onSelectionEnd?.()
    })

    await waitFor(() => {
      expect(screen.getByTestId('canvas-selection-actions')).toBeVisible()
    })

    fireEvent.click(screen.getByTestId('canvas-selection-action-lock'))

    expect(onToggleLockSelection).toHaveBeenCalledWith(['activity-1', 'activity-2'])
    await waitFor(() => {
      expect(screen.queryByTestId('canvas-selection-actions')).not.toBeInTheDocument()
    })
  })

  it('aligns the selected nodes through the selection popover', async () => {
    const onAlignSelection = vi.fn()

    renderWorkflowCanvas({
      activities: [
        createActivity({ id: 'activity-1', position_x: 200, position_y: 120 }),
        createActivity({ id: 'activity-2', position_x: 520, position_y: 240 }),
      ],
      onAlignSelection,
    })

    const latestProps = getLatestReactFlowProps<{
      onSelectionStart?: () => void
      onSelectionChange?: (params: { nodes: Array<{ id: string }>; edges: Array<{ id: string }> }) => void
      onSelectionEnd?: () => void
    }>()

    act(() => {
      latestProps.onSelectionStart?.()
      latestProps.onSelectionChange?.({
        nodes: [{ id: 'activity-1' }, { id: 'activity-2' }],
        edges: [],
      })
      latestProps.onSelectionEnd?.()
    })

    await waitFor(() => {
      expect(screen.getByTestId('canvas-selection-actions')).toBeVisible()
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('canvas-selection-action-align-left'))
    })

    expect(onAlignSelection).toHaveBeenCalledWith(['activity-1', 'activity-2'], 'left')
  })

  it('groups the selected nodes through the selection popover', async () => {
    const onCreateGroup = vi.fn()

    renderWorkflowCanvas({
      activities: [
        createActivity({ id: 'activity-1', position_x: 200, position_y: 120 }),
        createActivity({ id: 'activity-2', position_x: 520, position_y: 240 }),
      ],
      onCreateGroup,
    })

    const latestProps = getLatestReactFlowProps<{
      onSelectionStart?: () => void
      onSelectionChange?: (params: { nodes: Array<{ id: string }>; edges: Array<{ id: string }> }) => void
      onSelectionEnd?: () => void
    }>()

    act(() => {
      latestProps.onSelectionStart?.()
      latestProps.onSelectionChange?.({
        nodes: [{ id: 'activity-1' }, { id: 'activity-2' }],
        edges: [],
      })
      latestProps.onSelectionEnd?.()
    })

    await waitFor(() => {
      expect(screen.getByTestId('canvas-selection-action-group')).toBeEnabled()
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('canvas-selection-action-group'))
    })

    expect(onCreateGroup).toHaveBeenCalledWith(['activity-1', 'activity-2'])
  })

  it('renders a bounding box around the multi-selection', async () => {
    renderWorkflowCanvas({
      activities: [
        createActivity({ id: 'activity-1', position_x: 200, position_y: 120 }),
        createActivity({ id: 'activity-2', position_x: 520, position_y: 120 }),
      ],
    })

    const latestProps = getLatestReactFlowProps<{
      onSelectionStart?: () => void
      onSelectionChange?: (params: { nodes: Array<{ id: string }>; edges: Array<{ id: string }> }) => void
      onSelectionEnd?: () => void
    }>()

    act(() => {
      latestProps.onSelectionStart?.()
      latestProps.onSelectionChange?.({
        nodes: [{ id: 'activity-1' }, { id: 'activity-2' }],
        edges: [],
      })
      latestProps.onSelectionEnd?.()
    })

    await waitFor(() => {
      expect(screen.getByTestId('canvas-selection-bounds')).toBeVisible()
    })
  })

  it('enables aggregation only for selections with at least two regular activities', async () => {
    const onAggregateActivities = vi.fn()

    renderWorkflowCanvas({
      activities: [
        createActivity({ id: 'activity-1', position_x: 200, position_y: 120 }),
        createActivity({ id: 'activity-2', position_x: 520, position_y: 120 }),
      ],
      canvasObjects: [createSourceObject({ id: 'source-1', position_x: 840, position_y: 120 })],
      onAggregateActivities,
    })

    let latestProps = getLatestReactFlowProps<{
      onSelectionStart?: () => void
      onSelectionChange?: (params: { nodes: Array<{ id: string }>; edges: Array<{ id: string }> }) => void
      onSelectionEnd?: () => void
    }>()

    act(() => {
      latestProps.onSelectionStart?.()
      latestProps.onSelectionChange?.({
        nodes: [{ id: 'activity-1' }, { id: 'source-1' }],
        edges: [],
      })
      latestProps.onSelectionEnd?.()
    })

    await waitFor(() => {
      expect(screen.getByTestId('canvas-selection-action-aggregate')).toBeDisabled()
    })

    act(() => {
      latestProps = getLatestReactFlowProps()
      latestProps.onSelectionStart?.()
      latestProps.onSelectionChange?.({
        nodes: [{ id: 'activity-1' }, { id: 'activity-2' }],
        edges: [],
      })
      latestProps.onSelectionEnd?.()
    })

    await waitFor(() => {
      expect(screen.getByTestId('canvas-selection-action-aggregate')).toBeEnabled()
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('canvas-selection-action-aggregate'))
    })

    expect(onAggregateActivities).toHaveBeenCalledWith(['activity-1', 'activity-2'])
  })

  it('supports keyboard lock, duplicate and nudge for the current node selection', () => {
    const onToggleLockSelection = vi.fn()
    const onDuplicateSelection = vi.fn()
    const onNudgeSelection = vi.fn()

    renderWorkflowCanvas({
      activities: [
        createActivity({ id: 'activity-1', position_x: 200, position_y: 120 }),
        createActivity({ id: 'activity-2', position_x: 520, position_y: 120 }),
      ],
      onToggleLockSelection,
      onDuplicateSelection,
      onNudgeSelection,
    })

    const latestProps = getLatestReactFlowProps<{
      onSelectionChange?: (params: { nodes: Array<{ id: string }>; edges: Array<{ id: string }> }) => void
    }>()

    act(() => {
      latestProps.onSelectionChange?.({
        nodes: [{ id: 'activity-1' }, { id: 'activity-2' }],
        edges: [],
      })
    })

    fireEvent.keyDown(window, { key: 'l' })
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'ArrowRight', shiftKey: true })

    expect(onToggleLockSelection).toHaveBeenCalledWith(['activity-1', 'activity-2'])
    expect(onDuplicateSelection).toHaveBeenCalledWith(['activity-1', 'activity-2'])
    expect(onNudgeSelection).toHaveBeenCalledWith(['activity-1', 'activity-2'], { x: 84, y: 0 })
  })

  it('includes selected groups in the shared lock action', async () => {
    const onToggleLockSelection = vi.fn()

    renderWorkflowCanvas({
      activities: [createActivity({ id: 'activity-1' })],
      canvasGroups: [createCanvasGroup({ id: 'group-1' })],
      onToggleLockSelection,
    })

    const latestProps = getLatestReactFlowProps<{
      onSelectionStart?: () => void
      onSelectionChange?: (params: { nodes: Array<{ id: string }>; edges: Array<{ id: string }> }) => void
      onSelectionEnd?: () => void
    }>()

    act(() => {
      latestProps.onSelectionStart?.()
      latestProps.onSelectionChange?.({
        nodes: [{ id: 'group-1' }, { id: 'activity-1' }],
        edges: [],
      })
      latestProps.onSelectionEnd?.()
    })

    await waitFor(() => {
      expect(screen.getByTestId('canvas-selection-action-lock')).toBeVisible()
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('canvas-selection-action-lock'))
    })

    expect(onToggleLockSelection).toHaveBeenCalledWith(['group-1', 'activity-1'])
  })

  it('wires selected group quick actions into the shared canvas callbacks', () => {
    const onToggleLockSelection = vi.fn()
    const onDeleteSelection = vi.fn()
    const onBringNodeToFront = vi.fn()
    const onSendNodeToBack = vi.fn()

    renderWorkflowCanvas({
      canvasGroups: [createCanvasGroup({ id: 'group-1' })],
      onToggleLockSelection,
      onDeleteSelection,
      onBringNodeToFront,
      onSendNodeToBack,
      selectedNodeId: 'group-1',
    })

    const latestProps = getLatestReactFlowProps<{ nodes: Array<{ id: string; data?: { onToggleLock?: (groupId: string) => void; onDelete?: (groupId: string) => void; onBringToFront?: (groupId: string) => void; onSendToBack?: (groupId: string) => void } }> }>()
    const groupNode = latestProps.nodes.find((node) => node.id === 'group-1')

    groupNode?.data?.onBringToFront?.('group-1')
    groupNode?.data?.onSendToBack?.('group-1')
    groupNode?.data?.onToggleLock?.('group-1')
    groupNode?.data?.onDelete?.('group-1')

    expect(onBringNodeToFront).toHaveBeenCalledWith('group-1')
    expect(onSendNodeToBack).toHaveBeenCalledWith('group-1')
    expect(onToggleLockSelection).toHaveBeenCalledWith(['group-1'])
    expect(onDeleteSelection).toHaveBeenCalledWith({ nodeIds: ['group-1'], edgeIds: [] })
  })

  it('reports single group selections back to the parent as node selections', () => {
    const onSelectionChange = vi.fn()

    renderWorkflowCanvas({
      canvasGroups: [createCanvasGroup({ id: 'group-1' })],
      onSelectionChange,
    })

    let latestProps = getLatestReactFlowProps<{
      onNodeClick?: (event: unknown, node: { id: string }) => void
      onSelectionChange?: (params: { nodes: Array<{ id: string }>; edges: Array<{ id: string }> }) => void
    }>()

    act(() => {
      latestProps.onNodeClick?.({}, { id: 'group-1' })
    })

    expect(onSelectionChange).toHaveBeenCalledWith({ nodeId: 'group-1', edgeId: null, dataObjectId: null })

    act(() => {
      latestProps = getLatestReactFlowProps()
      latestProps.onSelectionChange?.({
        nodes: [{ id: 'group-1' }],
        edges: [],
      })
    })

    expect(onSelectionChange).toHaveBeenLastCalledWith({ nodeId: 'group-1', edgeId: null, dataObjectId: null })
  })

  it('wires selected source z-layer actions into the shared canvas callbacks', () => {
    const onBringNodeToFront = vi.fn()
    const onSendNodeToBack = vi.fn()

    renderWorkflowCanvas({
      canvasObjects: [createSourceObject({ id: 'source-1' })],
      onBringNodeToFront,
      onSendNodeToBack,
      selectedNodeId: 'source-1',
    })

    const latestProps = getLatestReactFlowProps<{ nodes: Array<{ id: string; data?: { onBringToFront?: (id: string) => void; onSendToBack?: (id: string) => void } }> }>()
    const sourceNode = latestProps.nodes.find((node) => node.id === 'source-1')

    sourceNode?.data?.onBringToFront?.('source-1')
    sourceNode?.data?.onSendToBack?.('source-1')

    expect(onBringNodeToFront).toHaveBeenCalledWith('source-1')
    expect(onSendNodeToBack).toHaveBeenCalledWith('source-1')
  })
})
