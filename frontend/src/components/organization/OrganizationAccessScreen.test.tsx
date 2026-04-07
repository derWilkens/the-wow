import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OrganizationAccessScreen } from './OrganizationAccessScreen'
import type { Organization, OrganizationInvitation } from '../../types'

function createOrganization(id: string, name: string, role: 'owner' | 'admin' | 'member' = 'owner'): Organization {
  return {
    id,
    name,
    created_at: '2026-04-03T00:00:00.000Z',
    created_by: 'user-1',
    membership_role: role,
  }
}

function createInvitation(id: string, organizationName: string): OrganizationInvitation {
  return {
    id,
    email: 'invitee@example.com',
    role: 'member',
    token: `token-${id}`,
    created_at: '2026-04-03T00:00:00.000Z',
    organization: {
      id: `org-${id}`,
      name: organizationName,
      created_at: '2026-04-03T00:00:00.000Z',
      created_by: 'user-1',
    },
  }
}

describe('OrganizationAccessScreen', () => {
  it('creates a new organization from the onboarding form', async () => {
    const onCreateOrganization = vi.fn().mockResolvedValue(undefined)

    render(
      <OrganizationAccessScreen
        organizations={[]}
        pendingInvitations={[]}
        isCreating={false}
        isAccepting={false}
        onCreateOrganization={onCreateOrganization}
        onAcceptInvitation={vi.fn()}
        onSelectOrganization={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('Name der Firma'), { target: { value: 'Acme GmbH' } })
    fireEvent.click(screen.getByRole('button', { name: /^Firma anlegen$/i }))

    await waitFor(() => {
      expect(onCreateOrganization).toHaveBeenCalledWith('Acme GmbH')
    })
  })

  it('shows pending invitations and accepts them', async () => {
    const onAcceptInvitation = vi.fn().mockResolvedValue(undefined)

    render(
      <OrganizationAccessScreen
        organizations={[]}
        pendingInvitations={[createInvitation('invite-1', 'Acme GmbH')]}
        isCreating={false}
        isAccepting={false}
        onCreateOrganization={vi.fn()}
        onAcceptInvitation={onAcceptInvitation}
        onSelectOrganization={vi.fn()}
      />,
    )

    expect(screen.getByText('Acme GmbH')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /Einladung annehmen/i }))

    await waitFor(() => {
      expect(onAcceptInvitation).toHaveBeenCalledWith('invite-1')
    })
  })

  it('lets the user select an existing organization card', () => {
    const onSelectOrganization = vi.fn()
    const organization = createOrganization('org-1', 'Acme GmbH', 'admin')

    render(
      <OrganizationAccessScreen
        organizations={[organization]}
        pendingInvitations={[]}
        isCreating={false}
        isAccepting={false}
        onCreateOrganization={vi.fn()}
        onAcceptInvitation={vi.fn()}
        onSelectOrganization={onSelectOrganization}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Acme GmbH/i }))
    expect(onSelectOrganization).toHaveBeenCalledWith(organization)
  })
})
