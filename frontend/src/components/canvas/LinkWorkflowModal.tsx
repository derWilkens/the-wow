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
      <div data-testid="link-workflow-modal" className="wow-ui-dialog w-full max-w-3xl p-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="wow-ui-eyebrow">Arbeitsablauf verlinken</p>
            <h2 className="wow-ui-title mt-2">Bestehenden Ablauf wiederverwenden</h2>
            <p className="wow-ui-subtitle mt-2">
              Wähle einen vorhandenen Ablauf und beschreibe kurz, was in diesen Schritt hinein- und zurückfliesst.
            </p>
          </div>
          <button type="button" className="wow-ui-button-secondary" onClick={onClose}>
            Schliessen
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[1.3fr_1fr]">
          <div className="wow-ui-card p-4">
            <p className="wow-ui-label">Verfuegbare Ablaeufe</p>
            <div className="mt-3 max-h-[360px] space-y-2 overflow-auto">
              {candidates.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  data-testid={`link-workflow-option-${workspace.id}`}
                  className={`w-full rounded-[var(--wow-panel-radius)] border px-4 py-3 text-left transition ${
                    selectedWorkspaceId === workspace.id
                      ? 'border-[var(--wow-primary)] bg-[var(--wow-primary-soft)] text-[var(--wow-primary)]'
                      : 'border-[var(--wow-panel-border)] bg-[var(--panel-strong)] text-[var(--text)]'
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
                    <span className="wow-ui-chip px-2 py-1 text-[10px] uppercase tracking-[0.2em]">
                      {workspace.workflow_scope === 'detail' ? 'Detailablauf' : 'Arbeitsablauf'}
                    </span>
                  </div>
                  {workspace.purpose ? <p className="mt-2 text-xs text-[var(--muted)]">{workspace.purpose}</p> : null}
                </button>
              ))}
            </div>
          </div>

          <div className="wow-ui-card space-y-4 p-4">
            <Field label="Was soll dieser verlinkte Ablauf hier leisten?">
              <textarea
                data-testid="link-workflow-goal"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                rows={4}
                className="wow-ui-textarea"
              />
            </Field>
            <Field label="Was wird in diesen Ablauf hineingegeben?">
              <textarea
                data-testid="link-workflow-inputs"
                value={inputsText}
                onChange={(event) => setInputsText(event.target.value)}
                rows={4}
                className="wow-ui-textarea"
              />
            </Field>
            <Field label="Was kommt aus dem Ablauf zurueck?">
              <textarea
                data-testid="link-workflow-outputs"
                value={outputsText}
                onChange={(event) => setOutputsText(event.target.value)}
                rows={4}
                className="wow-ui-textarea"
              />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="wow-ui-button-secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            data-testid="link-workflow-submit"
            className="wow-ui-button-primary disabled:opacity-40"
            onClick={handleSubmit}
            disabled={!selectedWorkspaceId || isSubmitting}
          >
            {isSubmitting ? 'Wird verknuepft ...' : 'Ablauf verknuepfen'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="wow-ui-label mb-2 block">{label}</span>
      {children}
    </label>
  )
}
