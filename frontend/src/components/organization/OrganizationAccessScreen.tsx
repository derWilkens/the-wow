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
        <p className="text-[11px] uppercase tracking-[0.32em] text-cyan-300/70">Organisation</p>
        <h1 className="mt-2 font-display text-4xl text-white">
          {organizations.length > 0 ? 'Firma auswaehlen' : 'Firma anlegen'}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-400">
          Superpowers laeuft jetzt mandantenbasiert. Arbeitsablaeufe, IT-Tools und Einladungen gehoeren zu einer Firma
          und werden innerhalb dieses Mandanten gemeinsam genutzt.
        </p>
      </div>

      {pendingInvitations.length > 0 ? (
        <section className="mt-8 rounded-[28px] border border-white/10 bg-slate-950/70 p-5">
          <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">Offene Einladungen</p>
          <div className="mt-4 grid gap-3">
            {pendingInvitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between gap-4 rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                <div>
                  <p className="font-medium text-white">{invitation.organization.name}</p>
                  <p className="mt-1 text-sm text-slate-400">Rolle: {invitation.role}</p>
                </div>
                <button
                  onClick={() => void onAcceptInvitation(invitation.id)}
                  disabled={isAccepting}
                  className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60"
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
              className="rounded-[24px] border border-white/10 bg-slate-950/60 p-5 text-left transition hover:border-cyan-300/30 hover:bg-slate-900/80"
            >
              <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-100">
                <Users className="h-5 w-5" />
              </div>
              <h2 className="mt-4 font-display text-xl text-white">{organization.name}</h2>
              <p className="mt-2 text-sm text-slate-400">Deine Rolle: {organization.membership_role}</p>
            </button>
          ))}
        </section>
      ) : null}

      <section className="mt-8 rounded-[28px] border border-white/10 bg-slate-950/70 p-5">
        <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">Neue Firma anlegen</p>
        <div className="mt-4 flex gap-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name der Firma"
            className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
          />
          <button
            data-testid="organization-create-submit"
            onClick={() => void handleCreate()}
            disabled={isCreating}
            className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60"
          >
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Firma anlegen'}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}
      </section>
    </div>
  )
}
