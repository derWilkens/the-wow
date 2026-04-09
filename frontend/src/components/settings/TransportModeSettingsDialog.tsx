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
    <div className={`rounded-2xl border px-4 py-4 ${mode.is_active ? 'border-white/10 bg-white/[0.03]' : 'border-amber-300/20 bg-amber-400/5'}`}>
      <div className="grid gap-3 md:grid-cols-[1.2fr_1.6fr_110px_auto]">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          disabled={!isEditable}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none disabled:opacity-60"
          aria-label={`${mode.label} Bezeichnung`}
        />
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={!isEditable}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none disabled:opacity-60"
          aria-label={`${mode.label} Beschreibung`}
        />
        <input
          type="number"
          min={0}
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
          disabled={!isEditable}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none disabled:opacity-60"
          aria-label={`${mode.label} Reihenfolge`}
        />
        <label className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(event) => setIsDefault(event.target.checked)}
            disabled={!isEditable}
          />
          Default
        </label>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Key: {mode.key}
          {!mode.is_active ? ' · inaktiv' : ''}
        </div>
        {isEditable ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid={`transport-mode-save-${mode.id}`}
              disabled={!hasChanges || !label.trim()}
              onClick={() =>
                onSave({
                  id: mode.id,
                  label,
                  description,
                  sort_order: Number(sortOrder || mode.sort_order),
                  is_default: isDefault,
                })
              }
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-100 disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              Speichern
            </button>
            {mode.is_active ? (
              <button
                type="button"
                data-testid={`transport-mode-deactivate-${mode.id}`}
                onClick={() => onDeactivate(mode.id)}
                className="rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-100"
              >
                Deaktivieren
              </button>
            ) : null}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 text-xs text-slate-500">
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
    () =>
      [...transportModes].sort((left, right) => {
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
      <div className="wow-surface-dialog pointer-events-auto w-full max-w-4xl rounded-[30px] border border-white/10 p-6 shadow-[0_30px_90px_rgba(2,8,12,0.6)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-300/80">Einstellungen</p>
            <h2 className="mt-2 font-display text-3xl text-white">Transportmodi</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Verbindungen koennen zuerst frei gezogen werden. Den fachlichen Transportmodus pflegen wir erst danach hier oder direkt in den Verbindungsdetails.
            </p>
          </div>
          <button data-testid="transport-mode-settings-close" onClick={onClose} className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Settings2 className="h-4 w-4 text-cyan-200" />
            <span>Mandantenweite Liste verfuegbarer Transportmodi</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_1.6fr_auto]">
            <input
              data-testid="transport-mode-new-label"
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              disabled={!isEditable}
              placeholder="Neuer Transportmodus"
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none disabled:opacity-60"
            />
            <input
              data-testid="transport-mode-new-description"
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              disabled={!isEditable}
              placeholder="Beschreibung"
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none disabled:opacity-60"
            />
            <label className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
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
              className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40"
            >
              Modus anlegen
            </button>
          </div>
        </div>

        <div className="mt-5 max-h-[50vh] space-y-3 overflow-auto pr-1">
          {sortedModes.map((mode) => (
            <TransportModeRow
              key={mode.id}
              mode={mode}
              isEditable={isEditable}
              onSave={(input) => void updateTransportMode.mutateAsync(input)}
              onDeactivate={(id) => void deactivateTransportMode.mutateAsync(id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
