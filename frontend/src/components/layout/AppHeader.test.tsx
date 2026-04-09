import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppHeader } from './AppHeader'

function renderHeader(overrides: Partial<Parameters<typeof AppHeader>[0]> = {}) {
  const props: Parameters<typeof AppHeader>[0] = {
    workspaceName: 'Rechnungseingang',
    workspaceTrail: [],
    onResetRoot: vi.fn(),
    onNavigateWorkspaceTrail: vi.fn(),
    onLeaveWorkspace: vi.fn(),
    onSignOut: vi.fn(),
    onOpenSettings: vi.fn(),
    showTableViewToggle: true,
    workflowViewMode: 'canvas',
    onWorkflowViewModeChange: vi.fn(),
    groupingMode: 'free',
    showSwimlaneToggle: true,
    onToggleGroupingMode: vi.fn(),
    ...overrides,
  }

  return {
    ...render(<AppHeader {...props} />),
    props,
  }
}

describe('AppHeader', () => {
  it('toggles the grouping mode and reflects the current label', () => {
    const onToggleGroupingMode = vi.fn()
    renderHeader({
      groupingMode: 'role_lanes',
      onToggleGroupingMode,
    })

    const toggle = screen.getByTestId('toolbar-grouping-toggle')
    expect(toggle).toHaveTextContent('Nach Rollen gruppieren')

    fireEvent.click(toggle)
    expect(onToggleGroupingMode).toHaveBeenCalled()
  })

  it('switches between canvas and sipoc view modes', () => {
    const onWorkflowViewModeChange = vi.fn()

    renderHeader({
      workflowViewMode: 'sipoc_table',
      onWorkflowViewModeChange,
    })

    fireEvent.click(screen.getByTestId('toolbar-view-canvas'))
    expect(onWorkflowViewModeChange).toHaveBeenCalledWith('canvas')
    expect(screen.queryByTestId('toolbar-grouping-toggle')).not.toBeInTheDocument()
  })

  it('keeps insert tools out of the header DOM', () => {
    renderHeader()

    expect(screen.queryByTestId('toolbar-activity')).not.toBeInTheDocument()
    expect(screen.queryByTestId('toolbar-data-object')).not.toBeInTheDocument()
  })

  it('opens the workflow detail dialog from the dedicated header button', () => {
    const onOpenWorkflowDetails = vi.fn()

    renderHeader({
      onOpenWorkflowDetails,
    })

    fireEvent.click(screen.getByTestId('toolbar-workflow-details'))
    expect(onOpenWorkflowDetails).toHaveBeenCalled()
  })

  it('hides table and swimlane controls when the corresponding preferences are disabled', () => {
    renderHeader({
      showTableViewToggle: false,
      showSwimlaneToggle: false,
    })

    expect(screen.queryByTestId('toolbar-view-canvas')).not.toBeInTheDocument()
    expect(screen.queryByTestId('toolbar-view-sipoc')).not.toBeInTheDocument()
    expect(screen.queryByTestId('toolbar-grouping-toggle')).not.toBeInTheDocument()
  })

  it('does not render undo redo search or export in the header anymore', () => {
    renderHeader()

    expect(screen.queryByTestId('toolbar-undo')).not.toBeInTheDocument()
    expect(screen.queryByTestId('toolbar-redo')).not.toBeInTheDocument()
    expect(screen.queryByTestId('toolbar-canvas-search')).not.toBeInTheDocument()
    expect(screen.queryByTestId('toolbar-export')).not.toBeInTheDocument()
  })
})
