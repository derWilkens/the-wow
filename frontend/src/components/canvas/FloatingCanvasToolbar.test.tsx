import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FloatingCanvasToolbar } from './FloatingCanvasToolbar'

function renderToolbar(overrides: Partial<Parameters<typeof FloatingCanvasToolbar>[0]> = {}) {
  const props: Parameters<typeof FloatingCanvasToolbar>[0] = {
    onInsertStart: vi.fn(),
    onInsertActivity: vi.fn(),
    onInsertDecision: vi.fn(),
    onInsertMerge: vi.fn(),
    onInsertEnd: vi.fn(),
    onInsertQuelle: vi.fn(),
    onInsertDatenobjekt: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    canUndo: true,
    canRedo: false,
    hasStart: false,
    hasEnd: false,
    onToolbarDragStart: vi.fn(),
    dataObjectToolbarHint: 'Markiere zuerst die Verbindung, auf der das Objekt transportiert wird',
    ...overrides,
  }

  return {
    ...render(<FloatingCanvasToolbar {...props} />),
    props,
  }
}

describe('FloatingCanvasToolbar', () => {
  it('renders as a left floating toolbar with stable tool ids', () => {
    renderToolbar()

    expect(screen.getByTestId('floating-canvas-toolbar')).toBeInTheDocument()
    expect(screen.getByTestId('toolbar-activity')).toBeInTheDocument()
    expect(screen.getByTestId('toolbar-decision')).toBeInTheDocument()
    expect(screen.getByTestId('toolbar-data-object')).toBeInTheDocument()
  })

  it('shows the tool name as a tooltip on hover instead of expanding the button', () => {
    renderToolbar()

    const activityButton = screen.getByTestId('toolbar-activity')
    expect(screen.queryByTestId('toolbar-activity-tooltip')).not.toBeInTheDocument()

    fireEvent.mouseEnter(activityButton)
    expect(screen.getByTestId('toolbar-activity-tooltip')).toHaveTextContent('Aktivitaet')

    fireEvent.mouseLeave(activityButton)
    expect(screen.queryByTestId('toolbar-activity-tooltip')).not.toBeInTheDocument()
  })

  it('disables start and end when those nodes already exist', () => {
    renderToolbar({
      hasStart: true,
      hasEnd: true,
    })

    expect(screen.getByTestId('toolbar-start')).toBeDisabled()
    expect(screen.getByTestId('toolbar-end')).toBeDisabled()
  })

  it('triggers actions and keeps redo disabled when unavailable', () => {
    const onInsertActivity = vi.fn()
    const onUndo = vi.fn()

    renderToolbar({
      onInsertActivity,
      onUndo,
      canRedo: false,
    })

    fireEvent.click(screen.getByTestId('toolbar-activity'))
    fireEvent.click(screen.getByTestId('toolbar-undo'))

    expect(onInsertActivity).toHaveBeenCalled()
    expect(onUndo).toHaveBeenCalled()
    expect(screen.getByTestId('toolbar-redo')).toBeDisabled()
  })

  it('publishes drag metadata for draggable tools', () => {
    const onToolbarDragStart = vi.fn()
    renderToolbar({ onToolbarDragStart })

    const setData = vi.fn()
    const toolbarButton = screen.getByTestId('toolbar-activity')

    fireEvent.dragStart(toolbarButton, {
      dataTransfer: {
        effectAllowed: '',
        setData,
      },
    })

    expect(setData).toHaveBeenCalledWith('application/x-wow-toolbar-item', 'activity')
    expect(onToolbarDragStart).toHaveBeenCalledWith('activity')
  })
})
