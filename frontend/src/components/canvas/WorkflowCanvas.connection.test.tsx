import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createActivity, getLatestReactFlowProps, renderWorkflowCanvas } from './WorkflowCanvas.test-utils'

describe('WorkflowCanvas connection behavior', () => {
  it('creates a connection when the drag ends over the highlighted node body', async () => {
    const onConnectEdge = vi.fn()

    renderWorkflowCanvas({
      activities: [
        createActivity({ id: 'activity-1' }),
        createActivity({ id: 'activity-2', position_x: 520, position_y: 120 }),
      ],
      onConnectEdge,
    })

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
    renderWorkflowCanvas({
      activities: [
        createActivity({ id: 'activity-1', position_x: 100, position_y: 120 }),
        createActivity({ id: 'activity-2', position_x: 460, position_y: 120 }),
        createActivity({ id: 'activity-3', position_x: 820, position_y: 120 }),
      ],
      selectedNodeId: 'activity-1',
    })

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
      const updatedProps = getLatestReactFlowProps<{ nodes: Array<{ id: string; data: { isConnectionPreviewTarget?: boolean } }> }>()
      const previewNode = updatedProps.nodes.find((node) => node.id === 'activity-2')
      expect(previewNode?.data.isConnectionPreviewTarget).not.toBe(true)
    })
  })

  it('disables magnetic connection target previews when the preference is off', async () => {
    renderWorkflowCanvas({
      activities: [
        createActivity({ id: 'activity-1', position_x: 100, position_y: 120 }),
        createActivity({ id: 'activity-2', position_x: 460, position_y: 120 }),
      ],
      selectedNodeId: 'activity-1',
      magneticConnectionTargetsEnabled: false,
    })

    const latestProps = getLatestReactFlowProps<Record<string, unknown>>()
    const onConnectStart = latestProps.onConnectStart as (event: unknown, params: { nodeId: string; handleId: string | null; handleType: 'source' | 'target' | null }) => void

    await act(async () => {
      onConnectStart({}, { nodeId: 'activity-1', handleId: 'source-right', handleType: 'source' })
    })
    fireEvent.mouseMove(screen.getByTestId('workflow-canvas'), { clientX: 470, clientY: 150 })

    await waitFor(() => {
      const updatedProps = getLatestReactFlowProps<{ nodes: Array<{ id: string; data: { isConnectionPreviewTarget?: boolean } }> }>()
      const previewNode = updatedProps.nodes.find((node) => node.id === 'activity-2')
      expect(previewNode?.data.isConnectionPreviewTarget).not.toBe(true)
    })
  })

  it('interrupts a focus animation when the user pans or clicks the pane', () => {
    const onInterruptFocusAnimation = vi.fn()

    renderWorkflowCanvas({
      activities: [createActivity({ id: 'activity-1', position_x: 200, position_y: 120 })],
      focusNodeId: 'activity-1',
      onInterruptFocusAnimation,
    })

    fireEvent.click(screen.getByTestId('rf-move-start'))
    fireEvent.click(screen.getByTestId('workflow-canvas'))

    expect(onInterruptFocusAnimation).toHaveBeenCalled()
  })
})
