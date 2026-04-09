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

  const canContinue = [
    goal.trim().length > 0,
    true,
    parsedSteps.length > 0,
  ][step]

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
      <div data-testid="subprocess-wizard" className="wow-surface-dialog w-full max-w-2xl rounded-[30px] border border-white/10 p-6 shadow-[0_40px_120px_rgba(2,8,12,0.72)]">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-300/80">Detailablauf anlegen</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Diesen Schritt genauer ausarbeiten</h2>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Wir führen dich kurz durch Ziel, Ein- und Ausgaben sowie die wichtigsten Teilschritte.
            </p>
          </div>
          <button type="button" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300" onClick={onClose}>
            Schließen
          </button>
        </div>

        <div className="mt-6 flex gap-2">
          {[0, 1, 2].map((value) => (
            <div key={value} className={`h-1.5 flex-1 rounded-full ${value <= step ? 'bg-cyan-300' : 'bg-white/10'}`} />
          ))}
        </div>

        <div className="mt-6">
          {step === 0 ? (
            <section className="space-y-4">
              <Field label="Wie soll der Detailablauf heißen?">
                <input
                  data-testid="subprocess-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
                />
              </Field>
              <Field label="Was genau soll in diesem Schritt passieren?">
                <textarea
                  data-testid="subprocess-goal"
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
                />
              </Field>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="grid gap-4 md:grid-cols-2">
              <Field label="Was wird für diesen Schritt benötigt?">
                <textarea
                  data-testid="subprocess-inputs"
                  value={inputsText}
                  onChange={(event) => setInputsText(event.target.value)}
                  rows={6}
                  placeholder={'Ein Punkt pro Zeile\nz. B. Kundenstammdaten'}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
                />
              </Field>
              <Field label="Was kommt am Ende dieses Schritts heraus?">
                <textarea
                  data-testid="subprocess-outputs"
                  value={outputsText}
                  onChange={(event) => setOutputsText(event.target.value)}
                  rows={6}
                  placeholder={'Ein Punkt pro Zeile\nz. B. Freigegebene Buchung'}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
                />
              </Field>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="space-y-4">
              <Field label="Welche Teilschritte gehören typischerweise dazu?">
                <textarea
                  data-testid="subprocess-steps"
                  value={stepsText}
                  onChange={(event) => setStepsText(event.target.value)}
                  rows={7}
                  placeholder={'Ein Schritt pro Zeile\nz. B. Unterlagen prüfen'}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
                />
              </Field>
              <div className="rounded-[22px] border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm text-cyan-50">
                Der neue Detailablauf startet mit <strong>Start</strong>, enthält deine Teilschritte als Aktivitäten und endet mit <strong>Ende</strong>.
              </div>
            </section>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white disabled:opacity-40"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            disabled={step === 0 || isSubmitting}
          >
            Zurück
          </button>
          <div className="flex gap-3">
            {step < 2 ? (
              <button
                type="button"
                data-testid="subprocess-next"
                className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-40"
                onClick={() => setStep((current) => Math.min(2, current + 1))}
                disabled={!canContinue || isSubmitting}
              >
                Weiter
              </button>
            ) : (
              <button
                type="button"
                data-testid="subprocess-submit"
                className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-40"
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
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      {children}
    </label>
  )
}
