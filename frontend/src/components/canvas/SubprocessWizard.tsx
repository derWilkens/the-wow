import { useMemo, useState, type ReactNode } from 'react'
import type { CreateSubprocessInput } from '../../types'

function toLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function SubprocessWizard({
  activityLabel,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  activityLabel: string
  onClose: () => void
  onSubmit: (input: CreateSubprocessInput) => void
  isSubmitting: boolean
}) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState(`${activityLabel} - Detailablauf`)
  const [goal, setGoal] = useState('')
  const [inputsText, setInputsText] = useState('')
  const [outputsText, setOutputsText] = useState('')
  const [stepsText, setStepsText] = useState('')

  const parsedSteps = useMemo(() => toLines(stepsText), [stepsText])

  const canContinue = [goal.trim().length > 0, true, parsedSteps.length > 0][step]

  function handleSubmit() {
    onSubmit({
      name: name.trim(),
      goal: goal.trim(),
      expected_inputs: toLines(inputsText),
      expected_outputs: toLines(outputsText),
      steps: parsedSteps,
    })
  }

  return (
    <div className="wow-overlay-scrim absolute inset-0 z-40 flex items-center justify-center p-4">
      <div data-testid="subprocess-wizard" className="wow-ui-dialog w-full max-w-2xl p-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="wow-ui-eyebrow">Detailablauf anlegen</p>
            <h2 className="wow-ui-title mt-2">Diesen Schritt genauer ausarbeiten</h2>
            <p className="wow-ui-subtitle mt-2 max-w-xl">
              Wir fuehren dich kurz durch Ziel, Ein- und Ausgaben sowie die wichtigsten Teilschritte.
            </p>
          </div>
          <button type="button" className="wow-ui-button-secondary" onClick={onClose}>
            Schliessen
          </button>
        </div>

        <div className="mt-6 flex gap-2">
          {[0, 1, 2].map((value) => (
            <div
              key={value}
              className={`h-1.5 flex-1 rounded-full ${value <= step ? 'bg-[var(--wow-primary)]' : 'bg-[var(--wow-panel-border)]'}`}
            />
          ))}
        </div>

        <div className="mt-6">
          {step === 0 ? (
            <section className="space-y-4">
              <Field label="Wie soll der Detailablauf heissen?">
                <input
                  data-testid="subprocess-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="wow-ui-input"
                />
              </Field>
              <Field label="Was genau soll in diesem Schritt passieren?">
                <textarea
                  data-testid="subprocess-goal"
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  rows={4}
                  className="wow-ui-textarea"
                />
              </Field>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="grid gap-4 md:grid-cols-2">
              <Field label="Was wird fuer diesen Schritt benoetigt?">
                <textarea
                  data-testid="subprocess-inputs"
                  value={inputsText}
                  onChange={(event) => setInputsText(event.target.value)}
                  rows={6}
                  placeholder={'Ein Punkt pro Zeile\nz. B. Kundenstammdaten'}
                  className="wow-ui-textarea"
                />
              </Field>
              <Field label="Was kommt am Ende dieses Schritts heraus?">
                <textarea
                  data-testid="subprocess-outputs"
                  value={outputsText}
                  onChange={(event) => setOutputsText(event.target.value)}
                  rows={6}
                  placeholder={'Ein Punkt pro Zeile\nz. B. Freigegebene Buchung'}
                  className="wow-ui-textarea"
                />
              </Field>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="space-y-4">
              <Field label="Welche Teilschritte gehoeren typischerweise dazu?">
                <textarea
                  data-testid="subprocess-steps"
                  value={stepsText}
                  onChange={(event) => setStepsText(event.target.value)}
                  rows={7}
                  placeholder={'Ein Schritt pro Zeile\nz. B. Unterlagen pruefen'}
                  className="wow-ui-textarea"
                />
              </Field>
              <div className="wow-ui-section p-4 text-sm text-[var(--text)]">
                Der neue Detailablauf startet mit <strong>Start</strong>, enthaelt deine Teilschritte als Aktivitaeten und endet mit <strong>Ende</strong>.
              </div>
            </section>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            className="wow-ui-button-secondary disabled:opacity-40"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            disabled={step === 0 || isSubmitting}
          >
            Zurueck
          </button>
          <div className="flex gap-3">
            {step < 2 ? (
              <button
                type="button"
                data-testid="subprocess-next"
                className="wow-ui-button-primary disabled:opacity-40"
                onClick={() => setStep((current) => Math.min(2, current + 1))}
                disabled={!canContinue || isSubmitting}
              >
                Weiter
              </button>
            ) : (
              <button
                type="button"
                data-testid="subprocess-submit"
                className="wow-ui-button-primary disabled:opacity-40"
                onClick={handleSubmit}
                disabled={!canContinue || isSubmitting}
              >
                {isSubmitting ? 'Wird angelegt ...' : 'Detailablauf anlegen'}
              </button>
            )}
          </div>
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
