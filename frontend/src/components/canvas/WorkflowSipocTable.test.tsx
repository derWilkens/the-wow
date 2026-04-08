import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WorkflowSipocTable } from './WorkflowSipocTable'
import type { WorkflowSipocRow } from '../../types'

const rows: WorkflowSipocRow[] = [
  {
    activityId: 'activity-1',
    processLabel: 'Unterlagen pruefen',
    processRoleLabel: 'BIM-Koordination',
    supplierRoleLabels: ['Fachplanung'],
    consumerRoleLabels: ['Projektleitung'],
    inputs: [
      {
        edgeId: 'edge-1',
        objectName: 'Unterlagenpaket',
        transportModeLabel: 'Per E-Mail',
      },
    ],
    outputs: [
      {
        edgeId: 'edge-2',
        objectName: 'Pruefbericht',
        transportModeLabel: '—',
      },
    ],
  },
  {
    activityId: 'activity-2',
    processLabel: 'Freigeben',
    processRoleLabel: 'Nicht zugeordnet',
    supplierRoleLabels: [],
    consumerRoleLabels: [],
    inputs: [],
    outputs: [],
  },
]

describe('WorkflowSipocTable', () => {
  it('renders sipoc columns and aggregated content', () => {
    render(<WorkflowSipocTable rows={rows} />)

    expect(screen.getByTestId('workflow-sipoc-table')).toBeInTheDocument()
    expect(screen.getByText('Supplier')).toBeInTheDocument()
    expect(screen.getByText('Input')).toBeInTheDocument()
    expect(screen.getByText('Prozess')).toBeInTheDocument()
    expect(screen.getByText('Prozessrolle')).toBeInTheDocument()
    expect(screen.getByText('Output')).toBeInTheDocument()
    expect(screen.getByText('Consumer')).toBeInTheDocument()
    expect(screen.getByTestId('sipoc-row-activity-1')).toBeInTheDocument()
    expect(screen.getByText('Unterlagenpaket')).toBeInTheDocument()
    expect(screen.getByText('Per E-Mail')).toBeInTheDocument()
    expect(screen.getByText('Fachplanung')).toBeInTheDocument()
    expect(screen.getByText('Projektleitung')).toBeInTheDocument()
  })

  it('shows stable defaults for empty supplier consumer and io cells', () => {
    render(<WorkflowSipocTable rows={rows.slice(1)} />)

    expect(screen.getAllByText('Nicht zugeordnet').length).toBeGreaterThanOrEqual(3)
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
  })

  it('calls onSelectActivity when the process cell is clicked', () => {
    const onSelectActivity = vi.fn()
    render(<WorkflowSipocTable rows={rows} onSelectActivity={onSelectActivity} />)

    fireEvent.click(screen.getByTestId('sipoc-process-activity-1'))
    expect(onSelectActivity).toHaveBeenCalledWith('activity-1')
  })
})
