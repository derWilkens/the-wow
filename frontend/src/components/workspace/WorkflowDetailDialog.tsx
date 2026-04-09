import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Workspace } from '../../types'

function joinLines(values: string[] | null | undefined) {
  return (values ?? []).join('\n')
}

function toLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function WorkflowDetailDialog({
  workspace,
  isOpen,
  isSaving,
  onClose,
  onSave,
}: {
  workspace: Workspace | null
  isOpen: boolean
  isSaving: boolean
  onClose: () => void
  onSave: (input: { name: string; purpose: string | null; expected_inputs: string[]; expected_outputs: string[] }) => Promise<void> | void
}) {
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [inputsText, setInputsText] = useState('')
  const [outputsText, setOutputsText] = useState('')

  useEffect(() => {
    if (!isOpen || !workspace) {
      return
    }

    setName(workspace.name)
    setPurpose(workspace.purpose ?? '')
    setInputsText(joinLines(workspace.expected_inputs))
    setOutputsText(joinLines(workspace.expected_outputs))
  }, [isOpen, workspace])

  const canSave = useMemo(() => name.trim().length > 0 && !isSaving, [isSaving, name])

  if (!isOpen || !workspace) {
    return null
  }

  return (
    <div className="wow-overlay-scrim absolute inset-0 z-40 flex items-center justify-center p-4">
      <div
        data-testid="workflow-detail-dialog"
        className="wow-surface-dialog w-full max-w-3xl rounded-[30px] border border-white/10 p-6 shadow-[0_40px_120px_rgba(2,8,12,0.72)]"
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-300/80">Ablaufdetails</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Aktuellen Arbeitsablauf bearbeiten</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Diese Details beschreiben denselben fachlichen Kontext wie bei einer Aktivitaet, nur auf Ebene des gerade geoeffneten Arbeitsablaufs.
            </p>
          </div>
          <button
            type="button"
            data-testid="workflow-detail-close"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300"
            onClick={onClose}
          >
            Schliessen
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Name des Arbeitsablaufs">
            <input
              data-testid="workflow-detail-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
            />
          </Field>
          <Field label="Zweck / Wirkung">
            <textarea
              data-testid="workflow-detail-purpose"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Erwartete Eingaben">
            <textarea
              data-testid="workflow-detail-inputs"
              value={inputsText}
              onChange={(event) => setInputsText(event.target.value)}
              rows={7}
              placeholder={'Ein Eintrag pro Zeile\nz. B. Kundenanfrage'}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
            />
          </Field>
          <Field label="Erwartete Ergebnisse">
            <textarea
              data-testid="workflow-detail-outputs"
              value={outputsText}
              onChange={(event) => setOutputsText(event.target.value)}
              rows={7}
              placeholder={'Ein Eintrag pro Zeile\nz. B. Freigegebener Auftrag'}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white"
            onClick={onClose}
          >
            Abbrechen
          </button>
          <button
            type="button"
            data-testid="workflow-detail-save"
            className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-40"
            disabled={!canSave}
            onClick={() =>
              void onSave({
                name: name.trim(),
                purpose: purpose.trim() || null,
                expected_inputs: toLines(inputsText),
                expected_outputs: toLines(outputsText),
              })
            }
          >
            {isSaving ? 'Wird gespeichert ...' : 'Speichern'}
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
