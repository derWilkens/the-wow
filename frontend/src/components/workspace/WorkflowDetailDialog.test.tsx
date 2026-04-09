import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WorkflowDetailDialog } from './WorkflowDetailDialog'
import type { Workspace } from '../../types'

const workspace: Workspace = {
  id: 'workspace-1',
  organization_id: 'org-1',
  name: 'Rechnungseingang',
  created_by: 'user-1',
  created_at: '2026-04-09T10:00:00.000Z',
  parent_workspace_id: null,
  parent_activity_id: null,
  workflow_scope: 'standalone',
  purpose: 'Rechnungen sicher pruefen und freigeben',
  expected_inputs: ['Rechnung', 'Bestellung'],
  expected_outputs: ['Freigabe'],
}

describe('WorkflowDetailDialog', () => {
  it('renders the current workspace values', () => {
    render(
      <WorkflowDetailDialog workspace={workspace} isOpen isSaving={false} onClose={vi.fn()} onSave={vi.fn()} />,
    )

    expect(screen.getByTestId('workflow-detail-name')).toHaveValue('Rechnungseingang')
    expect(screen.getByTestId('workflow-detail-purpose')).toHaveValue('Rechnungen sicher pruefen und freigeben')
    expect(screen.getByTestId('workflow-detail-inputs')).toHaveValue('Rechnung\nBestellung')
    expect(screen.getByTestId('workflow-detail-outputs')).toHaveValue('Freigabe')
  })

  it('saves edited values as normalized arrays', () => {
    const onSave = vi.fn()

    render(
      <WorkflowDetailDialog workspace={workspace} isOpen isSaving={false} onClose={vi.fn()} onSave={onSave} />,
    )

    fireEvent.change(screen.getByTestId('workflow-detail-name'), { target: { value: ' Rechnung pruefen ' } })
    fireEvent.change(screen.getByTestId('workflow-detail-purpose'), { target: { value: 'Neue Wirkung' } })
    fireEvent.change(screen.getByTestId('workflow-detail-inputs'), { target: { value: ' Rechnung\n\n Bestellung ' } })
    fireEvent.change(screen.getByTestId('workflow-detail-outputs'), { target: { value: ' Freigabe \n Buchung ' } })

    fireEvent.click(screen.getByTestId('workflow-detail-save'))

    expect(onSave).toHaveBeenCalledWith({
      name: 'Rechnung pruefen',
      purpose: 'Neue Wirkung',
      expected_inputs: ['Rechnung', 'Bestellung'],
      expected_outputs: ['Freigabe', 'Buchung'],
    })
  })

  it('does not render when closed', () => {
    render(
      <WorkflowDetailDialog workspace={workspace} isOpen={false} isSaving={false} onClose={vi.fn()} onSave={vi.fn()} />,
    )

    expect(screen.queryByTestId('workflow-detail-dialog')).not.toBeInTheDocument()
  })
})
