import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { fitViewSpy, getLatestReactFlowProps, renderWorkflowCanvas, setCenterSpy, createActivity, createSourceObject } from './WorkflowCanvas.test-utils'

describe('WorkflowCanvas viewport', () => {
  it('fits the loaded workflow into view once by default', async () => {
    fitViewSpy.mockClear()

    renderWorkflowCanvas()

    await waitFor(() => {
      expect(fitViewSpy).toHaveBeenCalledTimes(1)
    })

    expect(fitViewSpy).toHaveBeenCalledWith({
      padding: 0.18,
      duration: 250,
    })
  })

  it('does not auto-fit when fit on load is disabled', async () => {
    fitViewSpy.mockClear()

    renderWorkflowCanvas({ autoFitOnLoad: false })

    await waitFor(() => {
      expect(screen.getByTestId('react-flow')).toBeInTheDocument()
    })

    expect(fitViewSpy).not.toHaveBeenCalled()
  })

  it('restores the requested viewport center and zoom for the matching workspace', async () => {
    setCenterSpy.mockClear()

    renderWorkflowCanvas({
      autoFitOnLoad: false,
      viewportRestoreRequest: {
        workspaceId: 'workspace-1',
        center: { x: 720, y: 410, zoom: 1.25 },
      },
    })

    await waitFor(() => {
      expect(setCenterSpy).toHaveBeenCalledWith(720, 410, {
        zoom: 1.25,
        duration: 0,
      })
    })
  })

  it('passes snap to grid preferences through to React Flow', () => {
    renderWorkflowCanvas({ snapToGridEnabled: false })

    const latestProps = getLatestReactFlowProps<{ snapToGrid?: boolean; snapGrid?: [number, number] }>()
    expect(latestProps.snapToGrid).toBe(false)
    expect(latestProps.snapGrid).toEqual([28, 28])
  })

  it('uses middle mouse panning by default and enables left-drag pan while space is held', () => {
    renderWorkflowCanvas()

    let latestProps = getLatestReactFlowProps<{ panOnDrag?: number[] }>()
    expect(latestProps.panOnDrag).toEqual([1])

    fireEvent.keyDown(window, { code: 'Space', key: ' ' })
    latestProps = getLatestReactFlowProps<{ panOnDrag?: number[] }>()
    expect(latestProps.panOnDrag).toEqual([0, 1])

    fireEvent.keyUp(window, { code: 'Space', key: ' ' })
    latestProps = getLatestReactFlowProps<{ panOnDrag?: number[] }>()
    expect(latestProps.panOnDrag).toEqual([1])
  })

  it('renders role lanes and snaps activities into the matching lane when grouped by role', () => {
    renderWorkflowCanvas({
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

  it('does not render lane backgrounds in free mode', () => {
    renderWorkflowCanvas({
      groupingMode: 'free',
      activityRolesById: { 'activity-1': 'Sachbearbeitung' },
    })

    expect(screen.queryByTestId('role-lane-overlay')).not.toBeInTheDocument()
    expect(screen.getByTestId('rf-node-activity-1')).toHaveAttribute('data-y', '120')
  })
})
