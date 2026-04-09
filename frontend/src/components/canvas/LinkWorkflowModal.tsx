import { useMemo, useState, type ReactNode } from 'react'
import type { LinkSubprocessInput, Workspace } from '../../types'

function toLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function LinkWorkflowModal({
  currentWorkspaceId,
  workspaces,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  currentWorkspaceId: string
  workspaces: Workspace[]
  onClose: () => void
  onSubmit: (input: LinkSubprocessInput) => void
  isSubmitting: boolean
}) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('')
  const [purpose, setPurpose] = useState('')
  const [inputsText, setInputsText] = useState('')
  const [outputsText, setOutputsText] = useState('')

  const candidates = useMemo(
    () => workspaces.filter((workspace) => workspace.id !== currentWorkspaceId),
    [currentWorkspaceId, workspaces],
  )

  function handleSubmit() {
    if (!selectedWorkspaceId) {
      return
    }

    onSubmit({
      linked_workflow_id: selectedWorkspaceId,
      linked_workflow_mode: 'reference',
      linked_workflow_purpose: purpose.trim() || null,
      linked_workflow_inputs: toLines(inputsText),
      linked_workflow_outputs: toLines(outputsText),
    })
  }

  return (
    <div className="wow-overlay-scrim absolute inset-0 z-40 flex items-center justify-center p-4">
      <div data-testid="link-workflow-modal" className="wow-surface-dialog w-full max-w-3xl rounded-[30px] border border-white/10 p-6 shadow-[0_40px_120px_rgba(2,8,12,0.72)]">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-300/80">Arbeitsablauf verlinken</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Bestehenden Ablauf wiederverwenden</h2>
            <p className="mt-2 text-sm text-slate-400">Wähle einen vorhandenen Ablauf und beschreibe kurz, was in diesen Schritt hinein- und zurückfließt.</p>
          </div>
          <button type="button" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300" onClick={onClose}>
            Schließen
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[1.3fr_1fr]">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">Verfügbare Abläufe</p>
            <div className="mt-3 max-h-[360px] space-y-2 overflow-auto">
              {candidates.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  data-testid={`link-workflow-option-${workspace.id}`}
                  className={`w-full rounded-[20px] border px-4 py-3 text-left transition ${
                    selectedWorkspaceId === workspace.id
                      ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-50'
                      : 'border-white/10 bg-slate-950/60 text-slate-200 hover:border-white/20'
                  }`}
                  onClick={() => {
                    setSelectedWorkspaceId(workspace.id)
                    setPurpose(workspace.purpose ?? '')
                    setInputsText((workspace.expected_inputs ?? []).join('\n'))
                    setOutputsText((workspace.expected_outputs ?? []).join('\n'))
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{workspace.name}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                      {workspace.workflow_scope === 'detail' ? 'Detailablauf' : 'Arbeitsablauf'}
                    </span>
                  </div>
                  {workspace.purpose ? <p className="mt-2 text-xs text-slate-500">{workspace.purpose}</p> : null}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
            <Field label="Was soll dieser verlinkte Ablauf hier leisten?">
              <textarea
                data-testid="link-workflow-goal"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
              />
            </Field>
            <Field label="Was wird in diesen Ablauf hineingegeben?">
              <textarea
                data-testid="link-workflow-inputs"
                value={inputsText}
                onChange={(event) => setInputsText(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
              />
            </Field>
            <Field label="Was kommt aus dem Ablauf zurück?">
              <textarea
                data-testid="link-workflow-outputs"
                value={outputsText}
                onChange={(event) => setOutputsText(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
              />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            data-testid="link-workflow-submit"
            className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-40"
            onClick={handleSubmit}
            disabled={!selectedWorkspaceId || isSubmitting}
          >
            {isSubmitting ? 'Wird verknüpft ...' : 'Ablauf verknüpfen'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      {children}
    </label>
  )
}
