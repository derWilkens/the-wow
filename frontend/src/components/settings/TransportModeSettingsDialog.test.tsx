import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TransportModeSettingsDialog } from './TransportModeSettingsDialog'

const mutateCreateAsync = vi.fn()
const mutateUpdateAsync = vi.fn()
const mutateDeactivateAsync = vi.fn()

vi.mock('../../api/transportModes', () => ({
  useTransportModes: () => ({
    data: [
      {
        id: 'mode-direkt',
        organization_id: 'org-1',
        key: 'direkt',
        label: 'Direkt',
        description: 'Direkte Uebergabe',
        sort_order: 0,
        is_active: true,
        is_default: true,
        created_at: new Date().toISOString(),
        created_by: 'user-1',
      },
      {
        id: 'mode-mail',
        organization_id: 'org-1',
        key: 'mail',
        label: 'Mail',
        description: 'Mailversand',
        sort_order: 1,
        is_active: true,
        is_default: false,
        created_at: new Date().toISOString(),
        created_by: 'user-1',
      },
    ],
  }),
  useCreateTransportMode: () => ({
    isPending: false,
    mutateAsync: mutateCreateAsync,
  }),
  useUpdateTransportMode: () => ({
    mutateAsync: mutateUpdateAsync,
  }),
  useDeactivateTransportMode: () => ({
    mutateAsync: mutateDeactivateAsync,
  }),
}))

describe('TransportModeSettingsDialog', () => {
  it('creates a new transport mode', async () => {
    mutateCreateAsync.mockResolvedValue(undefined)

    render(
      <TransportModeSettingsDialog
        organizationId="org-1"
        organizationRole="owner"
        isOpen
        onClose={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByTestId('transport-mode-new-label'), {
      target: { value: 'Teams Nachricht' },
    })
    fireEvent.change(screen.getByTestId('transport-mode-new-description'), {
      target: { value: 'Hinweis ueber Teams' },
    })
    fireEvent.click(screen.getByTestId('transport-mode-create'))

    await waitFor(() =>
      expect(mutateCreateAsync).toHaveBeenCalledWith({
        label: 'Teams Nachricht',
        description: 'Hinweis ueber Teams',
        sort_order: 2,
        is_default: false,
      }),
    )
  })

  it('updates and deactivates existing transport modes for admins', () => {
    render(
      <TransportModeSettingsDialog
        organizationId="org-1"
        organizationRole="admin"
        isOpen
        onClose={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('Mail Bezeichnung'), {
      target: { value: 'E-Mail' },
    })
    fireEvent.click(screen.getByTestId('transport-mode-save-mode-mail'))

    expect(mutateUpdateAsync).toHaveBeenCalledWith({
      id: 'mode-mail',
      label: 'E-Mail',
      description: 'Mailversand',
      sort_order: 1,
      is_default: false,
    })

    fireEvent.click(screen.getByTestId('transport-mode-deactivate-mode-mail'))
    expect(mutateDeactivateAsync).toHaveBeenCalledWith('mode-mail')
  })
})
