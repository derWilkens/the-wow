import { Save, Settings2, ShieldAlert, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  useCreateTransportMode,
  useDeactivateTransportMode,
  useTransportModes,
  useUpdateTransportMode,
} from '../../api/transportModes'
import type { OrganizationRole, TransportModeOption } from '../../types'

function TransportModeRow({
  mode,
  isEditable,
  onSave,
  onDeactivate,
}: {
  mode: TransportModeOption
  isEditable: boolean
  onSave: (input: { id: string; label: string; description: string; sort_order: number; is_default: boolean }) => void
  onDeactivate: (id: string) => void
}) {
  const [label, setLabel] = useState(mode.label)
  const [description, setDescription] = useState(mode.description ?? '')
  const [sortOrder, setSortOrder] = useState(String(mode.sort_order))
  const [isDefault, setIsDefault] = useState(mode.is_default)
  const hasChanges =
    label.trim() !== mode.label ||
    description.trim() !== (mode.description ?? '') ||
    Number(sortOrder || mode.sort_order) !== mode.sort_order ||
    isDefault !== mode.is_default

  return (
    <div className="wow-ui-card px-4 py-4">
      <div className="grid gap-3 md:grid-cols-[1.2fr_1.6fr_110px_auto]">
        <input value={label} onChange={(event) => setLabel(event.target.value)} disabled={!isEditable} className="wow-ui-input disabled:opacity-60" aria-label={`${mode.label} Bezeichnung`} />
        <input value={description} onChange={(event) => setDescription(event.target.value)} disabled={!isEditable} className="wow-ui-input disabled:opacity-60" aria-label={`${mode.label} Beschreibung`} />
        <input type="number" min={0} value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} disabled={!isEditable} className="wow-ui-input disabled:opacity-60" aria-label={`${mode.label} Reihenfolge`} />
        <label className="wow-ui-section inline-flex items-center gap-2 px-4 py-3 text-sm text-[var(--text)]">
          <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} disabled={!isEditable} />
          Default
        </label>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-[var(--muted)]">
          Key: {mode.key}
          {!mode.is_active ? ' · inaktiv' : ''}
        </div>
        {isEditable ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid={`transport-mode-save-${mode.id}`}
              disabled={!hasChanges || !label.trim()}
              onClick={() => onSave({ id: mode.id, label, description, sort_order: Number(sortOrder || mode.sort_order), is_default: isDefault })}
              className="wow-ui-button-primary min-h-0 px-3 py-1.5 text-xs disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              Speichern
            </button>
            {mode.is_active ? (
              <button type="button" data-testid={`transport-mode-deactivate-${mode.id}`} onClick={() => onDeactivate(mode.id)} className="wow-ui-button-secondary min-h-0 px-3 py-1.5 text-xs">
                Deaktivieren
              </button>
            ) : null}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 text-xs text-[var(--muted)]">
            <ShieldAlert className="h-3.5 w-3.5" />
            Nur Admins duerfen Modi aendern
          </div>
        )}
      </div>
    </div>
  )
}

export function TransportModeSettingsDialog({
  organizationId,
  organizationRole,
  isOpen,
  onClose,
}: {
  organizationId: string
  organizationRole: OrganizationRole | null
  isOpen: boolean
  onClose: () => void
}) {
  const { data: transportModes = [] } = useTransportModes(isOpen ? organizationId : null)
  const createTransportMode = useCreateTransportMode(organizationId)
  const updateTransportMode = useUpdateTransportMode(organizationId)
  const deactivateTransportMode = useDeactivateTransportMode(organizationId)
  const isEditable = organizationRole === 'owner' || organizationRole === 'admin'
  const [newLabel, setNewLabel] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [isDefault, setIsDefault] = useState(false)

  const sortedModes = useMemo(
    () => [...transportModes].sort((left, right) => {
      if (left.is_active !== right.is_active) {
        return left.is_active ? -1 : 1
      }
      return left.sort_order - right.sort_order
    }),
    [transportModes],
  )

  if (!isOpen) {
    return null
  }

  return (
    <div className="wow-overlay-scrim pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="wow-ui-dialog pointer-events-auto w-full max-w-4xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="wow-ui-eyebrow">Einstellungen</p>
            <h2 className="wow-ui-title mt-2 text-3xl">Transportmodi</h2>
            <p className="wow-ui-subtitle mt-2 max-w-2xl">
              Verbindungen koennen zuerst frei gezogen werden. Den fachlichen Transportmodus pflegen wir erst danach hier oder direkt in den Verbindungsdetails.
            </p>
          </div>
          <button data-testid="transport-mode-settings-close" onClick={onClose} className="wow-ui-icon-button">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="wow-ui-card mt-6 p-4">
          <div className="flex items-center gap-2 text-sm text-[var(--text)]">
            <Settings2 className="h-4 w-4 text-[var(--wow-primary)]" />
            <span>Mandantenweite Liste verfuegbarer Transportmodi</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_1.6fr_auto]">
            <input data-testid="transport-mode-new-label" value={newLabel} onChange={(event) => setNewLabel(event.target.value)} disabled={!isEditable} placeholder="Neuer Transportmodus" className="wow-ui-input disabled:opacity-60" />
            <input data-testid="transport-mode-new-description" value={newDescription} onChange={(event) => setNewDescription(event.target.value)} disabled={!isEditable} placeholder="Beschreibung" className="wow-ui-input disabled:opacity-60" />
            <label className="wow-ui-section inline-flex items-center gap-2 px-4 py-3 text-sm text-[var(--text)]">
              <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} disabled={!isEditable} />
              Default
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              data-testid="transport-mode-create"
              disabled={!isEditable || !newLabel.trim() || createTransportMode.isPending}
              onClick={async () => {
                await createTransportMode.mutateAsync({
                  label: newLabel,
                  description: newDescription.trim() || null,
                  sort_order: transportModes.length,
                  is_default: isDefault,
                })
                setNewLabel('')
                setNewDescription('')
                setIsDefault(false)
              }}
              className="wow-ui-button-primary disabled:opacity-40"
            >
              Modus anlegen
            </button>
          </div>
        </div>

        <div className="mt-5 max-h-[50vh] space-y-3 overflow-auto pr-1">
          {sortedModes.map((mode) => (
            <TransportModeRow key={mode.id} mode={mode} isEditable={isEditable} onSave={(input) => void updateTransportMode.mutateAsync(input)} onDeactivate={(id) => void deactivateTransportMode.mutateAsync(id)} />
          ))}
        </div>
      </div>
    </div>
  )
}
