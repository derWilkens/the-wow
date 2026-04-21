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
        <p className="wow-ui-label">{heading}</p>
        {onCancel ? (
          <button
            type="button"
            data-testid={cancelTestId}
            onClick={onCancel}
            className="wow-ui-button-secondary min-h-0 px-3 py-1.5 text-xs"
          >
            Schliessen
          </button>
        ) : null}
      </div>
      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="wow-ui-label">Rollenname</span>
          <input
            data-testid={nameTestId}
            value={label}
            onChange={(event) => onLabelChange(event.target.value)}
            placeholder="z. B. BIM-Koordination"
            className="wow-ui-input"
          />
        </label>
        <label className="grid gap-1">
          <span className="wow-ui-label">Akronym optional</span>
          <input
            data-testid={acronymTestId}
            value={acronym}
            onChange={(event) => onAcronymChange(event.target.value)}
            placeholder="z. B. BK"
            className="wow-ui-input uppercase"
          />
        </label>
        <label className="grid gap-1">
          <span className="wow-ui-label">Beschreibung</span>
          <textarea
            data-testid={descriptionTestId}
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            rows={2}
            placeholder="Optional: kurze Beschreibung"
            className="wow-ui-textarea"
          />
        </label>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          data-testid={submitTestId}
          disabled={!label.trim() || isSubmitting}
          onClick={onSubmit}
          className="wow-ui-button-primary disabled:opacity-40"
        >
          Rolle anlegen
        </button>
      </div>
    </div>
  )
}
