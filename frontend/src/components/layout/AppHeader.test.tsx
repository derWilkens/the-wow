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
    onExportPng: vi.fn(),
    onExportPdf: vi.fn(),
    onOpenSettings: vi.fn(),
    workflowViewMode: 'canvas',
    onWorkflowViewModeChange: vi.fn(),
    groupingMode: 'free',
    onToggleGroupingMode: vi.fn(),
    canvasSearchOptions: [],
    onSelectCanvasSearchResult: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    canUndo: true,
    canRedo: false,
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

  it('opens the export menu and triggers PNG/PDF actions', () => {
    const onExportPng = vi.fn()
    const onExportPdf = vi.fn()

    renderHeader({
      onExportPng,
      onExportPdf,
    })

    fireEvent.click(screen.getByTestId('toolbar-export'))
    fireEvent.click(screen.getByTestId('export-png'))
    expect(onExportPng).toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('toolbar-export'))
    fireEvent.click(screen.getByTestId('export-pdf'))
    expect(onExportPdf).toHaveBeenCalled()
  })

  it('filters canvas search results and selects a node from the dropdown', () => {
    const onSelectCanvasSearchResult = vi.fn()

    renderHeader({
      onSelectCanvasSearchResult,
      canvasSearchOptions: [
        {
          id: 'activity-1',
          label: 'Rechnung pruefen',
          kind: 'activity',
          subtitle: 'Sachbearbeitung',
        },
        {
          id: 'source-1',
          label: 'Archiv',
          kind: 'source',
          subtitle: 'Datenspeicher',
        },
      ],
    })

    fireEvent.change(screen.getByTestId('toolbar-canvas-search'), {
      target: { value: 'rech' },
    })

    expect(screen.getByTestId('toolbar-canvas-search-results')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('toolbar-canvas-search-option-activity-1'))
    expect(onSelectCanvasSearchResult).toHaveBeenCalledWith('activity-1')
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
})
