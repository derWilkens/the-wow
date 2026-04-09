export function RoleCreateForm({
  heading = 'Neue Rolle anlegen',
  label,
  acronym,
  description,
  isSubmitting,
  nameTestId,
  acronymTestId,
  descriptionTestId,
  submitTestId,
  cancelTestId,
  onLabelChange,
  onAcronymChange,
  onDescriptionChange,
  onSubmit,
  onCancel,
}: {
  heading?: string
  label: string
  acronym: string
  description: string
  isSubmitting?: boolean
  nameTestId: string
  acronymTestId: string
  descriptionTestId: string
  submitTestId: string
  cancelTestId?: string
  onLabelChange: (value: string) => void
  onAcronymChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onSubmit: () => void
  onCancel?: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{heading}</p>
        {onCancel ? (
          <button
            type="button"
            data-testid={cancelTestId}
            onClick={onCancel}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300"
          >
            Schliessen
          </button>
        ) : null}
      </div>
      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Rollenname</span>
          <input
            data-testid={nameTestId}
            value={label}
            onChange={(event) => onLabelChange(event.target.value)}
            placeholder="z. B. BIM-Koordination"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Akronym optional</span>
          <input
            data-testid={acronymTestId}
            value={acronym}
            onChange={(event) => onAcronymChange(event.target.value)}
            placeholder="z. B. BK"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm uppercase text-white outline-none placeholder:text-slate-500"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Beschreibung</span>
          <textarea
            data-testid={descriptionTestId}
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            rows={2}
            placeholder="Optional: kurze Beschreibung"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500"
          />
        </label>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          data-testid={submitTestId}
          disabled={!label.trim() || isSubmitting}
          onClick={onSubmit}
          className="rounded-2xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-40"
        >
          Rolle anlegen
        </button>
      </div>
    </div>
  )
}
