import { Loader2, Users } from 'lucide-react'
import { useState } from 'react'
import type { Organization, OrganizationInvitation } from '../../types'

export function OrganizationAccessScreen({
  organizations,
  pendingInvitations,
  isCreating,
  isAccepting,
  onCreateOrganization,
  onAcceptInvitation,
  onSelectOrganization,
}: {
  organizations: Organization[]
  pendingInvitations: OrganizationInvitation[]
  isCreating: boolean
  isAccepting: boolean
  onCreateOrganization: (name: string) => Promise<void>
  onAcceptInvitation: (invitationId: string) => Promise<void>
  onSelectOrganization: (organization: Organization) => void
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!name.trim()) {
      return
    }

    setError(null)
    try {
      await onCreateOrganization(name.trim())
      setName('')
    } catch (creationError) {
      setError(creationError instanceof Error ? creationError.message : 'Organisation konnte nicht angelegt werden.')
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-10">
      <div>
        <p className="wow-ui-eyebrow">Organisation</p>
        <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.02em] text-slate-900">
          {organizations.length > 0 ? 'Firma auswaehlen' : 'Firma anlegen'}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-500">
          Superpowers laeuft jetzt mandantenbasiert. Arbeitsablaeufe, IT-Tools und Einladungen gehoeren zu einer Firma
          und werden innerhalb dieses Mandanten gemeinsam genutzt.
        </p>
      </div>

      {pendingInvitations.length > 0 ? (
        <section className="wow-ui-card mt-8 p-5">
          <p className="wow-ui-eyebrow">Offene Einladungen</p>
          <div className="mt-4 grid gap-3">
            {pendingInvitations.map((invitation) => (
              <div key={invitation.id} className="wow-ui-section flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium text-slate-900">{invitation.organization.name}</p>
                  <p className="mt-1 text-sm text-slate-500">Rolle: {invitation.role}</p>
                </div>
                <button
                  onClick={() => void onAcceptInvitation(invitation.id)}
                  disabled={isAccepting}
                  className="wow-ui-button-primary disabled:opacity-60"
                >
                  {isAccepting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Einladung annehmen'}
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {organizations.length > 0 ? (
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {organizations.map((organization) => (
            <button
              key={organization.id}
              data-testid={`organization-select-${organization.id}`}
              onClick={() => onSelectOrganization(organization)}
              className="wow-ui-card p-5 text-left transition hover:border-slate-300"
            >
              <div className="inline-flex rounded-md border border-blue-200 bg-blue-50 p-2 text-blue-700">
                <Users className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-slate-900">{organization.name}</h2>
              <p className="mt-2 text-sm text-slate-500">Deine Rolle: {organization.membership_role}</p>
            </button>
          ))}
        </section>
      ) : null}

      <section className="wow-ui-card mt-8 p-5">
        <p className="wow-ui-eyebrow">Neue Firma anlegen</p>
        <div className="mt-4 flex gap-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name der Firma"
            className="wow-ui-input flex-1"
          />
          <button
            data-testid="organization-create-submit"
            onClick={() => void handleCreate()}
            disabled={isCreating}
            className="wow-ui-button-primary disabled:opacity-60"
          >
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Firma anlegen'}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      </section>
    </div>
  )
}
