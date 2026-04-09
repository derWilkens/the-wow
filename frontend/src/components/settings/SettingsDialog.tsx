import { Pencil, Save, Settings2, ShieldAlert, Trash2, Wrench, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  useCreateOrganizationITTool,
  useDeleteOrganizationITTool,
  useOrganizationITTools,
  useUpdateOrganizationITTool,
} from '../../api/activityResources'
import {
  useCreateOrganizationRole,
  useDeleteOrganizationRole,
  useOrganizationRoles,
  useUpdateOrganizationRole,
} from '../../api/organizationRoles'
import { useUpdateOrganization } from '../../api/organizations'
import {
  useCreateTransportMode,
  useDeactivateTransportMode,
  useTransportModes,
  useUpdateTransportMode,
} from '../../api/transportModes'
import type { CatalogRole, CanvasGroupingMode, ITTool, OrganizationRole, TransportModeOption, UiPreferences } from '../../types'

type SettingsSection = 'company' | 'ui' | 'master-data'

const UI_PREFERENCES_STORAGE_KEY = 'wow-ui-preferences'

function readUiPreferences(): UiPreferences {
  if (typeof window === 'undefined') {
    return { default_grouping_mode: 'free', snap_to_grid: true }
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(UI_PREFERENCES_STORAGE_KEY) ?? '{}') as Partial<UiPreferences>
    return {
      default_grouping_mode:
        parsed.default_grouping_mode === 'role_lanes' || parsed.default_grouping_mode === 'free'
          ? parsed.default_grouping_mode
          : 'free',
      snap_to_grid: typeof parsed.snap_to_grid === 'boolean' ? parsed.snap_to_grid : true,
    }
  } catch {
    return { default_grouping_mode: 'free', snap_to_grid: true }
  }
}

function writeUiPreferences(preferences: UiPreferences) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
}

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
          <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} disabled={!isEditable} />
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

function ITToolRow({
  tool,
  isEditable,
  onSave,
  onDelete,
}: {
  tool: ITTool
  isEditable: boolean
  onSave: (input: { id: string; name: string; description: string }) => void
  onDelete: (id: string) => void
}) {
  const [name, setName] = useState(tool.name)
  const [description, setDescription] = useState(tool.description ?? '')
  const hasChanges = name.trim() !== tool.name || description.trim() !== (tool.description ?? '')

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
      <div className="grid gap-3 md:grid-cols-[1.2fr_1.6fr_auto]">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={!isEditable}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none disabled:opacity-60"
          aria-label={`${tool.name} Name`}
        />
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={!isEditable}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none disabled:opacity-60"
          aria-label={`${tool.name} Beschreibung`}
        />
        {isEditable ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid={`it-tool-save-${tool.id}`}
              disabled={!hasChanges || !name.trim()}
              onClick={() => onSave({ id: tool.id, name, description })}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100 disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              Speichern
            </button>
            <button
              type="button"
              data-testid={`it-tool-delete-${tool.id}`}
              onClick={() => onDelete(tool.id)}
              className="inline-flex items-center gap-2 rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Loeschen
            </button>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 text-xs text-slate-500">
            <ShieldAlert className="h-3.5 w-3.5" />
            Nur Admins duerfen IT-Tools aendern
          </div>
        )}
      </div>
    </div>
  )
}

function RoleRow({
  role,
  isEditable,
  onSave,
  onDelete,
}: {
  role: CatalogRole
  isEditable: boolean
  onSave: (input: { id: string; label: string; description: string }) => void
  onDelete: (id: string) => void
}) {
  const [label, setLabel] = useState(role.label)
  const [description, setDescription] = useState(role.description ?? '')
  const hasChanges = label.trim() !== role.label || description.trim() !== (role.description ?? '')

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
      <div className="grid gap-3 md:grid-cols-[1.2fr_1.6fr_auto]">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          disabled={!isEditable}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none disabled:opacity-60"
          aria-label={`${role.label} Rollenname`}
        />
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={!isEditable}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none disabled:opacity-60"
          aria-label={`${role.label} Rollenbeschreibung`}
        />
        {isEditable ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid={`settings-role-save-${role.id}`}
              disabled={!hasChanges || !label.trim()}
              onClick={() => onSave({ id: role.id, label, description })}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100 disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              Speichern
            </button>
            <button
              type="button"
              data-testid={`settings-role-delete-${role.id}`}
              onClick={() => onDelete(role.id)}
              className="inline-flex items-center gap-2 rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Loeschen
            </button>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 text-xs text-slate-500">
            <ShieldAlert className="h-3.5 w-3.5" />
            Nur Admins duerfen Rollen aendern
          </div>
        )}
      </div>
    </div>
  )
}

export function SettingsDialog({
  organizationId,
  organizationName,
  organizationRole,
  isOpen,
  onClose,
  onOrganizationRenamed,
  onUiPreferencesChange,
}: {
  organizationId: string
  organizationName: string
  organizationRole: OrganizationRole | null
  isOpen: boolean
  onClose: () => void
  onOrganizationRenamed: (name: string) => void
  onUiPreferencesChange: (preferences: UiPreferences) => void
}) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('company')
  const [organizationFormName, setOrganizationFormName] = useState(organizationName)
  const [organizationError, setOrganizationError] = useState<string | null>(null)
  const [masterDataError, setMasterDataError] = useState<string | null>(null)
  const [newTransportLabel, setNewTransportLabel] = useState('')
  const [newTransportDescription, setNewTransportDescription] = useState('')
  const [newTransportIsDefault, setNewTransportIsDefault] = useState(false)
  const [newToolName, setNewToolName] = useState('')
  const [newToolDescription, setNewToolDescription] = useState('')
  const [newRoleLabel, setNewRoleLabel] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [uiPreferences, setUiPreferences] = useState<UiPreferences>(() => readUiPreferences())

  const { data: transportModes = [] } = useTransportModes(isOpen ? organizationId : null)
  const { data: itTools = [] } = useOrganizationITTools(isOpen ? organizationId : null)
  const { data: roles = [] } = useOrganizationRoles(isOpen ? organizationId : null)
  const updateOrganization = useUpdateOrganization()
  const createTransportMode = useCreateTransportMode(organizationId)
  const updateTransportMode = useUpdateTransportMode(organizationId)
  const deactivateTransportMode = useDeactivateTransportMode(organizationId)
  const createOrganizationITTool = useCreateOrganizationITTool(organizationId)
  const updateOrganizationITTool = useUpdateOrganizationITTool(organizationId)
  const deleteOrganizationITTool = useDeleteOrganizationITTool(organizationId)
  const createOrganizationRole = useCreateOrganizationRole(organizationId)
  const updateOrganizationRole = useUpdateOrganizationRole(organizationId)
  const deleteOrganizationRole = useDeleteOrganizationRole(organizationId)
  const isEditable = organizationRole === 'owner' || organizationRole === 'admin'

  useEffect(() => {
    setOrganizationFormName(organizationName)
  }, [organizationName])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setUiPreferences(readUiPreferences())
  }, [isOpen])

  const sortedTransportModes = useMemo(
    () =>
      [...transportModes].sort((left, right) => {
        if (left.is_active !== right.is_active) {
          return left.is_active ? -1 : 1
        }
        return left.sort_order - right.sort_order
      }),
    [transportModes],
  )

  const sortedItTools = useMemo(() => [...itTools].sort((left, right) => left.name.localeCompare(right.name, 'de')), [itTools])
  const sortedRoles = useMemo(() => [...roles].sort((left, right) => left.label.localeCompare(right.label, 'de')), [roles])

  if (!isOpen) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 px-4">
      <div className="pointer-events-auto flex h-[min(86vh,860px)] w-full max-w-6xl overflow-hidden rounded-[30px] border border-white/10 bg-slate-950/95 shadow-[0_30px_90px_rgba(2,8,12,0.6)] backdrop-blur-xl">
        <aside className="w-full max-w-[260px] border-r border-white/10 bg-white/[0.03] p-5">
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-300/80">Einstellungen</p>
          <h2 className="mt-2 font-display text-3xl text-white">Verwaltung</h2>
          <div className="mt-6 space-y-2">
            {[
              { id: 'company' as const, label: 'Firma', icon: Pencil },
              { id: 'ui' as const, label: 'UI', icon: Settings2 },
              { id: 'master-data' as const, label: 'Stammdaten', icon: Wrench },
            ].map((section) => (
              <button
                key={section.id}
                type="button"
                data-testid={`settings-nav-${section.id}`}
                onClick={() => setActiveSection(section.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left ${
                  activeSection === section.id ? 'bg-cyan-400/10 text-cyan-100' : 'text-slate-300 hover:bg-white/[0.04]'
                }`}
              >
                <section.icon className="h-4 w-4" />
                {section.label}
              </button>
            ))}
          </div>
        </aside>
        <section className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                {activeSection === 'company' ? 'Firma' : activeSection === 'ui' ? 'UI' : 'Stammdaten'}
              </p>
              <h3 className="mt-2 font-display text-2xl text-white">
                {activeSection === 'company'
                  ? 'Firmenprofil'
                  : activeSection === 'ui'
                    ? 'Oberflaechenpraeferenzen'
                    : 'Firmenkataloge'}
              </h3>
            </div>
            <button data-testid="settings-dialog-close" onClick={onClose} className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
            {activeSection === 'company' ? (
              <div className="max-w-2xl space-y-5">
                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">Firmenname</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Dieser Name wird in der Arbeitsablauf-Uebersicht und in organisationsbezogenen Dialogen angezeigt.
                  </p>
                  <div className="mt-4 flex gap-3">
                    <input
                      data-testid="settings-company-name"
                      value={organizationFormName}
                      onChange={(event) => setOrganizationFormName(event.target.value)}
                      disabled={!isEditable}
                      className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none disabled:opacity-60"
                    />
                    <button
                      type="button"
                      data-testid="settings-company-save"
                      disabled={!isEditable || !organizationFormName.trim() || updateOrganization.isPending}
                      onClick={async () => {
                        setOrganizationError(null)
                        try {
                          const organization = await updateOrganization.mutateAsync({
                            organizationId,
                            name: organizationFormName.trim(),
                          })
                          onOrganizationRenamed(organization.name)
                        } catch (error) {
                          setOrganizationError(error instanceof Error ? error.message : 'Firma konnte nicht aktualisiert werden.')
                        }
                      }}
                      className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40"
                    >
                      Speichern
                    </button>
                  </div>
                  {organizationError ? <p className="mt-3 text-sm text-rose-200">{organizationError}</p> : null}
                </div>
              </div>
            ) : null}

            {activeSection === 'ui' ? (
              <div className="max-w-2xl space-y-5">
                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">Canvas-Default</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Lege fest, mit welcher Gruppierung neue oder neu geoeffnete Zeichenflaechen standardmaessig starten.
                  </p>
                  <div className="mt-4 inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
                    <button
                      type="button"
                      data-testid="settings-ui-grouping-free"
                      onClick={() => setUiPreferences((current) => ({ ...current, default_grouping_mode: 'free' }))}
                      className={`rounded-full px-4 py-2 text-sm ${uiPreferences.default_grouping_mode === 'free' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}
                    >
                      Ohne Gruppierung
                    </button>
                    <button
                      type="button"
                      data-testid="settings-ui-grouping-lanes"
                      onClick={() => setUiPreferences((current) => ({ ...current, default_grouping_mode: 'role_lanes' }))}
                      className={`rounded-full px-4 py-2 text-sm ${uiPreferences.default_grouping_mode === 'role_lanes' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}
                    >
                      Nach Rollen gruppieren
                    </button>
                  </div>
                  <div className="mt-5">
                    <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">Snap to Grid</p>
                    <p className="mt-2 text-sm text-slate-400">
                      Bestimmt, ob Knoten beim Verschieben standardmaessig auf dem Raster einrasten. Standard ist eingeschaltet.
                    </p>
                    <div className="mt-4 inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
                      <button
                        type="button"
                        data-testid="settings-ui-snap-on"
                        onClick={() => setUiPreferences((current) => ({ ...current, snap_to_grid: true }))}
                        className={`rounded-full px-4 py-2 text-sm ${uiPreferences.snap_to_grid ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}
                      >
                        Eingeschaltet
                      </button>
                      <button
                        type="button"
                        data-testid="settings-ui-snap-off"
                        onClick={() => setUiPreferences((current) => ({ ...current, snap_to_grid: false }))}
                        className={`rounded-full px-4 py-2 text-sm ${!uiPreferences.snap_to_grid ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}
                      >
                        Ausgeschaltet
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      data-testid="settings-ui-save"
                      onClick={() => {
                        writeUiPreferences(uiPreferences)
                        onUiPreferencesChange(uiPreferences)
                      }}
                      className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950"
                    >
                      Praeferenzen speichern
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {activeSection === 'master-data' ? (
              <div className="space-y-8">
                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Settings2 className="h-4 w-4 text-cyan-200" />
                    <span>Transportmodi</span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_1.6fr_auto]">
                    <input
                      data-testid="settings-transport-mode-new-label"
                      value={newTransportLabel}
                      onChange={(event) => setNewTransportLabel(event.target.value)}
                      disabled={!isEditable}
                      placeholder="Neuer Transportmodus"
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none disabled:opacity-60"
                    />
                    <input
                      data-testid="settings-transport-mode-new-description"
                      value={newTransportDescription}
                      onChange={(event) => setNewTransportDescription(event.target.value)}
                      disabled={!isEditable}
                      placeholder="Beschreibung"
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none disabled:opacity-60"
                    />
                    <label className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
                      <input type="checkbox" checked={newTransportIsDefault} onChange={(event) => setNewTransportIsDefault(event.target.checked)} disabled={!isEditable} />
                      Default
                    </label>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      data-testid="settings-transport-mode-create"
                      disabled={!isEditable || !newTransportLabel.trim() || createTransportMode.isPending}
                      onClick={async () => {
                        setMasterDataError(null)
                        try {
                          await createTransportMode.mutateAsync({
                            label: newTransportLabel,
                            description: newTransportDescription.trim() || null,
                            sort_order: transportModes.length,
                            is_default: newTransportIsDefault,
                          })
                          setNewTransportLabel('')
                          setNewTransportDescription('')
                          setNewTransportIsDefault(false)
                        } catch (error) {
                          setMasterDataError(error instanceof Error ? error.message : 'Transportmodus konnte nicht angelegt werden.')
                        }
                      }}
                      className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40"
                    >
                      Modus anlegen
                    </button>
                  </div>
                  <div className="mt-5 space-y-3">
                    {sortedTransportModes.map((mode) => (
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

                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <ShieldAlert className="h-4 w-4 text-cyan-200" />
                    <span>Rollen</span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_1.6fr_auto]">
                    <input
                      data-testid="settings-role-new-label"
                      value={newRoleLabel}
                      onChange={(event) => setNewRoleLabel(event.target.value)}
                      disabled={!isEditable}
                      placeholder="Neue Rolle"
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none disabled:opacity-60"
                    />
                    <input
                      data-testid="settings-role-new-description"
                      value={newRoleDescription}
                      onChange={(event) => setNewRoleDescription(event.target.value)}
                      disabled={!isEditable}
                      placeholder="Beschreibung"
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none disabled:opacity-60"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        data-testid="settings-role-create"
                        disabled={!isEditable || !newRoleLabel.trim() || createOrganizationRole.isPending}
                        onClick={async () => {
                          setMasterDataError(null)
                          try {
                            await createOrganizationRole.mutateAsync({
                              label: newRoleLabel,
                              description: newRoleDescription.trim() || null,
                            })
                            setNewRoleLabel('')
                            setNewRoleDescription('')
                          } catch (error) {
                            setMasterDataError(error instanceof Error ? error.message : 'Rolle konnte nicht angelegt werden.')
                          }
                        }}
                        className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40"
                      >
                        Rolle anlegen
                      </button>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {sortedRoles.map((role) => (
                      <RoleRow
                        key={role.id}
                        role={role}
                        isEditable={isEditable}
                        onSave={(input) =>
                          void updateOrganizationRole.mutateAsync({
                            id: input.id,
                            label: input.label,
                            description: input.description.trim() || null,
                          })
                        }
                        onDelete={(id) =>
                          void deleteOrganizationRole.mutateAsync(id).catch((error) => {
                            setMasterDataError(error instanceof Error ? error.message : 'Rolle konnte nicht geloescht werden.')
                          })
                        }
                      />
                    ))}
                    {sortedRoles.length === 0 ? <p className="text-sm text-slate-500">Noch keine Rollen im Firmenkatalog.</p> : null}
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Wrench className="h-4 w-4 text-cyan-200" />
                    <span>IT-Tools</span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_1.6fr_auto]">
                    <input
                      data-testid="settings-it-tool-new-name"
                      value={newToolName}
                      onChange={(event) => setNewToolName(event.target.value)}
                      disabled={!isEditable}
                      placeholder="Neues IT-Tool"
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none disabled:opacity-60"
                    />
                    <input
                      data-testid="settings-it-tool-new-description"
                      value={newToolDescription}
                      onChange={(event) => setNewToolDescription(event.target.value)}
                      disabled={!isEditable}
                      placeholder="Beschreibung"
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none disabled:opacity-60"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        data-testid="settings-it-tool-create"
                        disabled={!isEditable || !newToolName.trim() || createOrganizationITTool.isPending}
                        onClick={async () => {
                          setMasterDataError(null)
                          try {
                            await createOrganizationITTool.mutateAsync({
                              name: newToolName,
                              description: newToolDescription.trim() || null,
                            })
                            setNewToolName('')
                            setNewToolDescription('')
                          } catch (error) {
                            setMasterDataError(error instanceof Error ? error.message : 'IT-Tool konnte nicht angelegt werden.')
                          }
                        }}
                        className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40"
                      >
                        IT-Tool anlegen
                      </button>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {sortedItTools.map((tool) => (
                      <ITToolRow
                        key={tool.id}
                        tool={tool}
                        isEditable={isEditable}
                        onSave={(input) =>
                          void updateOrganizationITTool.mutateAsync({
                            id: input.id,
                            name: input.name,
                            description: input.description.trim() || null,
                          })
                        }
                        onDelete={(id) =>
                          void deleteOrganizationITTool.mutateAsync(id).catch((error) => {
                            setMasterDataError(error instanceof Error ? error.message : 'IT-Tool konnte nicht geloescht werden.')
                          })
                        }
                      />
                    ))}
                    {sortedItTools.length === 0 ? <p className="text-sm text-slate-500">Noch keine IT-Tools im Firmenkatalog.</p> : null}
                  </div>
                  {masterDataError ? <p className="mt-3 text-sm text-rose-200">{masterDataError}</p> : null}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
