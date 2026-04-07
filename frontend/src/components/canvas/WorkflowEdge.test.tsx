import { fireEvent, render, screen } from '@testing-library/react'
import { Position } from 'reactflow'
import { describe, expect, it, vi } from 'vitest'
import { WorkflowEdge } from './WorkflowEdge'
import type { EdgeDataObject } from '../../types'

vi.mock('reactflow', async () => {
  const React = await import('react')

  return {
    Position: {
      Left: 'left',
      Right: 'right',
      Top: 'top',
      Bottom: 'bottom',
    },
    BaseEdge: ({ id }: { id: string }) => <div data-testid={`base-edge-${id}`} />,
    EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    getSmoothStepPath: () => ['M0,0', 120, 80],
  }
})

function createDataObject(id: string, name: string, edgeId = 'edge-1', edgeSortOrder = 0): EdgeDataObject {
  return {
    id,
    workspace_id: 'workspace-1',
    parent_activity_id: null,
    object_type: 'datenobjekt',
    name,
    edge_id: edgeId,
    edge_sort_order: edgeSortOrder,
    updated_at: '2026-04-03T00:00:00.000Z',
    fields: [],
  }
}

describe('WorkflowEdge', () => {
  it('renders a named chip for a single data object and opens quick actions on click', () => {
    const dataObject = createDataObject('data-1', 'Gepruefte Rechnung')
    const onTogglePopover = vi.fn()
    const onOpenDataObject = vi.fn()
    const onSelectDataObject = vi.fn()

    render(
      <WorkflowEdge
        id="edge-1"
        source="activity-a"
        target="activity-b"
        sourceX={0}
        sourceY={0}
        targetX={100}
        targetY={100}
        sourcePosition={Position.Right}
        targetPosition={Position.Left}
        markerEnd={undefined}
        style={undefined}
        selected={false}
        data={{
          label: 'Ja',
          dataObjects: [dataObject],
          reusableDataObjects: [createDataObject('data-2', 'Lieferschein', 'edge-2')],
          selectedDataObjectId: null,
          onSelectDataObject,
          onOpenDataObject,
          onCreateDataObject: vi.fn(),
          onAddExistingDataObject: vi.fn(),
          isPopoverOpen: true,
          onTogglePopover,
        }}
      />,
    )

    const chip = screen.getByTestId('edge-data-object-chip-data-1')
    expect(chip).toHaveTextContent('Gepruefte Rechnung')
    expect(screen.getByTestId('edge-label-edge-1')).toHaveTextContent('Ja')

    fireEvent.click(chip)
    expect(onSelectDataObject).toHaveBeenCalledWith(dataObject)
    expect(screen.getByTestId('edge-data-object-popover-edge-1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Details der Verbindung' })).toBeInTheDocument()
    expect(screen.getByTestId('edge-data-object-existing-select-edge-1')).toBeInTheDocument()

    fireEvent.doubleClick(chip)
    expect(onOpenDataObject).toHaveBeenCalledWith(dataObject)
  })

  it('renders an aggregate button and shows the same quick actions for multiple data objects', () => {
    const onTogglePopover = vi.fn()

    render(
      <WorkflowEdge
        id="edge-1"
        source="activity-a"
        target="activity-b"
        sourceX={0}
        sourceY={0}
        targetX={100}
        targetY={100}
        sourcePosition={Position.Right}
        targetPosition={Position.Left}
        markerEnd={undefined}
        style={undefined}
        selected
        data={{
          label: 'Betrag > 1000 EUR',
          dataObjects: [
            createDataObject('data-1', 'Gepruefte Rechnung', 'edge-1', 0),
            createDataObject('data-2', 'Lieferschein', 'edge-1', 1),
          ],
          reusableDataObjects: [createDataObject('data-3', 'Wareneingang', 'edge-2', 0)],
          selectedDataObjectId: null,
          onSelectDataObject: vi.fn(),
          onOpenDataObject: vi.fn(),
          onCreateDataObject: vi.fn(),
          onAddExistingDataObject: vi.fn(),
          isPopoverOpen: true,
          onTogglePopover,
        }}
      />,
    )

    const aggregate = screen.getByTestId('edge-data-object-aggregate-edge-1')
    expect(screen.getByTestId('edge-label-edge-1')).toHaveTextContent('Betrag > 1000 EUR')
    expect(aggregate).toHaveTextContent('2')
    expect(aggregate).toHaveAttribute('title', expect.stringContaining('Gepruefte Rechnung'))
    expect(aggregate).toHaveAttribute('title', expect.stringContaining('Lieferschein'))

    fireEvent.click(aggregate)
    expect(onTogglePopover).toHaveBeenCalled()
    expect(screen.getByTestId('edge-data-object-popover-edge-1')).toBeInTheDocument()
    expect(screen.getByTestId('edge-data-object-item-data-1')).toBeInTheDocument()
    expect(screen.getByTestId('edge-data-object-item-data-2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Details der Verbindung' })).toBeInTheDocument()
  })
})
