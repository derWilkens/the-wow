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
        className="wow-ui-dialog w-full max-w-3xl p-6"
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="wow-ui-eyebrow">Ablaufdetails</p>
            <h2 className="wow-ui-title mt-2">Aktuellen Arbeitsablauf bearbeiten</h2>
            <p className="wow-ui-subtitle mt-2 max-w-2xl">
              Diese Details beschreiben denselben fachlichen Kontext wie bei einer Aktivitaet, nur auf Ebene des gerade geoeffneten Arbeitsablaufs.
            </p>
          </div>
          <button
            type="button"
            data-testid="workflow-detail-close"
            className="wow-ui-button-secondary"
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
              className="wow-ui-input"
            />
          </Field>
          <Field label="Zweck / Wirkung">
            <textarea
              data-testid="workflow-detail-purpose"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              rows={4}
              className="wow-ui-textarea"
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
              className="wow-ui-textarea"
            />
          </Field>
          <Field label="Erwartete Ergebnisse">
            <textarea
              data-testid="workflow-detail-outputs"
              value={outputsText}
              onChange={(event) => setOutputsText(event.target.value)}
              rows={7}
              placeholder={'Ein Eintrag pro Zeile\nz. B. Freigegebener Auftrag'}
              className="wow-ui-textarea"
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="wow-ui-button-secondary"
            onClick={onClose}
          >
            Abbrechen
          </button>
          <button
            type="button"
            data-testid="workflow-detail-save"
            className="wow-ui-button-primary disabled:opacity-40"
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
      <span className="wow-ui-label mb-2">{label}</span>
      {children}
    </label>
  )
}
