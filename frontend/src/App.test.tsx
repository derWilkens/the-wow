import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./hooks/useAuthSession', () => ({
  useAuthSession: () => ({ session: null, isLoading: false }),
}))

vi.mock('./api/organizations', () => ({
  useOrganizations: () => ({ data: [], isLoading: false }),
  usePendingOrganizationInvitations: () => ({ data: [], isLoading: false }),
  useCreateOrganization: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useAcceptOrganizationInvitation: () => ({ isPending: false, mutateAsync: vi.fn() }),
}))

describe('App', () => {
  it('renders the auth screen when no session is present', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Anmelden' })).toBeInTheDocument()
  })
})
