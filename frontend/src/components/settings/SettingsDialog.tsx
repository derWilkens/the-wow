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
import { normalizeUiPreferences } from '../../lib/uiPreferences'
import type { CatalogRole, CanvasGroupingMode, ITTool, OrganizationRole, TransportModeOption, UiPreferences } from '../../types'

type SettingsSection = 'company' | 'ui' | 'master-data'

function segmentButtonClass(isActive: boolean) {
  return `rounded-[var(--wow-control-radius)] px-4 py-2 text-sm ${
    isActive ? 'bg-[var(--wow-primary)] text-white' : 'text-[var(--muted)]'
  }`
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
    <div className="wow-ui-card px-4 py-4">
      <div className="grid gap-3 md:grid-cols-[1.2fr_1.6fr_110px_auto]">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          disabled={!isEditable}
          className="wow-ui-input disabled:opacity-60"
          aria-label={`${mode.label} Bezeichnung`}
        />
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={!isEditable}
          className="wow-ui-input disabled:opacity-60"
          aria-label={`${mode.label} Beschreibung`}
        />
        <input
          type="number"
          min={0}
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
          disabled={!isEditable}
          className="wow-ui-input disabled:opacity-60"
          aria-label={`${mode.label} Reihenfolge`}
        />
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
              onClick={() =>
                onSave({
                  id: mode.id,
                  label,
                  description,
                  sort_order: Number(sortOrder || mode.sort_order),
                  is_default: isDefault,
                })
              }
              className="wow-ui-button-primary min-h-0 px-3 py-1.5 text-xs disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              Speichern
            </button>
            {mode.is_active ? (
              <button
                type="button"
                data-testid={`transport-mode-deactivate-${mode.id}`}
                onClick={() => onDeactivate(mode.id)}
                className="wow-ui-button-secondary min-h-0 px-3 py-1.5 text-xs"
              >
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
    <div className="wow-ui-card px-4 py-4">
      <div className="grid gap-3 md:grid-cols-[1.2fr_1.6fr_auto]">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={!isEditable}
          className="wow-ui-input disabled:opacity-60"
          aria-label={`${tool.name} Name`}
        />
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={!isEditable}
          className="wow-ui-input disabled:opacity-60"
          aria-label={`${tool.name} Beschreibung`}
        />
        {isEditable ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid={`it-tool-save-${tool.id}`}
              disabled={!hasChanges || !name.trim()}
              onClick={() => onSave({ id: tool.id, name, description })}
              className="wow-ui-button-primary min-h-0 px-3 py-2 text-xs disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              Speichern
            </button>
            <button
              type="button"
              data-testid={`it-tool-delete-${tool.id}`}
              onClick={() => onDelete(tool.id)}
              className="wow-ui-button-danger min-h-0 px-3 py-2 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Loeschen
            </button>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 text-xs text-[var(--muted)]">
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
  onSave: (input: { id: string; label: string; acronym: string; description: string }) => void
  onDelete: (id: string) => void
}) {
  const [label, setLabel] = useState(role.label)
  const [acronym, setAcronym] = useState(role.acronym)
  const [description, setDescription] = useState(role.description ?? '')
  const hasChanges =
    label.trim() !== role.label ||
    acronym.trim() !== role.acronym ||
    description.trim() !== (role.description ?? '')

  return (
    <div className="wow-ui-card px-4 py-4">
      <div className="grid gap-3 md:grid-cols-[1.1fr_140px_1.4fr_auto]">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          disabled={!isEditable}
          className="wow-ui-input disabled:opacity-60"
          aria-label={`${role.label} Rollenname`}
        />
        <input
          value={acronym}
          onChange={(event) => setAcronym(event.target.value)}
          disabled={!isEditable}
          className="wow-ui-input disabled:opacity-60"
          aria-label={`${role.label} Akronym`}
        />
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={!isEditable}
          className="wow-ui-input disabled:opacity-60"
          aria-label={`${role.label} Rollenbeschreibung`}
        />
        {isEditable ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid={`settings-role-save-${role.id}`}
              disabled={!hasChanges || !label.trim()}
              onClick={() => onSave({ id: role.id, label, acronym, description })}
              className="wow-ui-button-primary min-h-0 px-3 py-2 text-xs disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              Speichern
            </button>
            <button
              type="button"
              data-testid={`settings-role-delete-${role.id}`}
              onClick={() => onDelete(role.id)}
              className="wow-ui-button-danger min-h-0 px-3 py-2 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Loeschen
            </button>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 text-xs text-[var(--muted)]">
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
  uiPreferences: persistedUiPreferences,
  isSavingUiPreferences,
  onClose,
  onOrganizationRenamed,
  onUiPreferencesChange,
}: {
  organizationId: string
  organizationName: string
  organizationRole: OrganizationRole | null
  isOpen: boolean
  uiPreferences: UiPreferences
  isSavingUiPreferences: boolean
  onClose: () => void
  onOrganizationRenamed: (name: string) => void
  onUiPreferencesChange: (preferences: UiPreferences) => Promise<void> | void
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
  const [newRoleAcronym, setNewRoleAcronym] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [uiPreferences, setUiPreferences] = useState<UiPreferences>(() => normalizeUiPreferences(persistedUiPreferences))
  const [uiPreferencesError, setUiPreferencesError] = useState<string | null>(null)

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

    setUiPreferences(normalizeUiPreferences(persistedUiPreferences))
    setUiPreferencesError(null)
  }, [isOpen, persistedUiPreferences])

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
    <div className="wow-overlay-scrim pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="wow-ui-dialog pointer-events-auto flex h-[min(86vh,860px)] w-full max-w-6xl overflow-hidden">
        <aside className="wow-engineering-sidebar w-full max-w-[260px] rounded-none border-r p-5 shadow-none">
          <p className="wow-ui-eyebrow">Einstellungen</p>
          <h2 className="wow-ui-title mt-2 text-3xl">Verwaltung</h2>
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
                className={`flex w-full items-center gap-3 rounded-[var(--wow-control-radius)] px-4 py-3 text-left ${
                  activeSection === section.id ? 'bg-[var(--wow-primary-soft)] text-[var(--wow-primary)]' : 'text-[var(--muted)] hover:bg-[var(--wow-secondary-soft)]'
                }`}
              >
                <section.icon className="h-4 w-4" />
                {section.label}
              </button>
            ))}
          </div>
        </aside>
        <section className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--wow-panel-border)] px-6 py-5">
            <div>
              <p className="wow-ui-eyebrow">
                {activeSection === 'company' ? 'Firma' : activeSection === 'ui' ? 'UI' : 'Stammdaten'}
              </p>
              <h3 className="wow-ui-title mt-2">
                {activeSection === 'company'
                  ? 'Firmenprofil'
                  : activeSection === 'ui'
                    ? 'Oberflaechenpraeferenzen'
                    : 'Firmenkataloge'}
              </h3>
            </div>
            <button data-testid="settings-dialog-close" onClick={onClose} className="wow-ui-icon-button">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
            {activeSection === 'company' ? (
              <div className="max-w-2xl space-y-5">
                <div className="wow-ui-card p-5">
                  <p className="wow-ui-label">Firmenname</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    Dieser Name wird in der Arbeitsablauf-Uebersicht und in organisationsbezogenen Dialogen angezeigt.
                  </p>
                  <div className="mt-4 flex gap-3">
                    <input
                      data-testid="settings-company-name"
                      value={organizationFormName}
                      onChange={(event) => setOrganizationFormName(event.target.value)}
                      disabled={!isEditable}
                      className="wow-ui-input flex-1 disabled:opacity-60"
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
                      className="wow-ui-button-primary disabled:opacity-40"
                    >
                      Speichern
                    </button>
                  </div>
                  {organizationError ? <p className="mt-3 text-sm text-[var(--danger)]">{organizationError}</p> : null}
                </div>
              </div>
            ) : null}

            {activeSection === 'ui' ? (
              <div className="max-w-2xl space-y-5">
                <div className="wow-ui-card p-5">
                  <p className="wow-ui-label">Canvas-Default</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    Lege fest, mit welcher Gruppierung neue oder neu geoeffnete Zeichenflaechen standardmaessig starten.
                  </p>
                  <div className="mt-4 inline-flex rounded-[var(--wow-control-radius)] border border-[var(--wow-panel-border)] bg-[var(--panel-strong)] p-1">
                    <button
                      type="button"
                      data-testid="settings-ui-grouping-free"
                      onClick={() => setUiPreferences((current) => ({ ...current, default_grouping_mode: 'free' }))}
                      className={segmentButtonClass(uiPreferences.default_grouping_mode === 'free')}
                    >
                      Ohne Gruppierung
                    </button>
                    <button
                      type="button"
                      data-testid="settings-ui-grouping-lanes"
                      onClick={() => setUiPreferences((current) => ({ ...current, default_grouping_mode: 'role_lanes' }))}
                      className={segmentButtonClass(uiPreferences.default_grouping_mode === 'role_lanes')}
                      >
                        Nach Rollen gruppieren
                    </button>
                  </div>
                  <div className="mt-5">
                    <p className="wow-ui-label">Theme</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Waehlt aus, ob die Oberflaeche dem System folgt oder explizit im hellen bzw. dunklen Modus dargestellt wird.
                    </p>
                    <div className="mt-4 inline-flex rounded-[var(--wow-control-radius)] border border-[var(--wow-panel-border)] bg-[var(--panel-strong)] p-1">
                      <button
                        type="button"
                        data-testid="settings-ui-theme-system"
                        onClick={() => setUiPreferences((current) => ({ ...current, theme_mode: 'system' }))}
                        className={segmentButtonClass(uiPreferences.theme_mode === 'system' )}
                      >
                        System
                      </button>
                      <button
                        type="button"
                        data-testid="settings-ui-theme-light"
                        onClick={() => setUiPreferences((current) => ({ ...current, theme_mode: 'light' }))}
                        className={segmentButtonClass(uiPreferences.theme_mode === 'light' )}
                      >
                        Hell
                      </button>
                      <button
                        type="button"
                        data-testid="settings-ui-theme-dark"
                        onClick={() => setUiPreferences((current) => ({ ...current, theme_mode: 'dark' }))}
                        className={segmentButtonClass(uiPreferences.theme_mode === 'dark' )}
                      >
                        Dunkel
                      </button>
                    </div>
                  </div>
                  <div className="mt-5">
                    <p className="wow-ui-label">Canvas-Startansicht</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Legt fest, ob ein Ablauf beim Oeffnen im Fit View startet oder die zuletzt gespeicherte Sicht wiederherstellt.
                    </p>
                    <div className="mt-4 inline-flex rounded-[var(--wow-control-radius)] border border-[var(--wow-panel-border)] bg-[var(--panel-strong)] p-1">
                      <button
                        type="button"
                        data-testid="settings-ui-canvas-open-fit-view"
                        onClick={() => setUiPreferences((current) => ({ ...current, canvas_open_behavior: 'fit_view' }))}
                        className={segmentButtonClass(uiPreferences.canvas_open_behavior === 'fit_view' )}
                      >
                        Fit View
                      </button>
                      <button
                        type="button"
                        data-testid="settings-ui-canvas-open-remember-last-view"
                        onClick={() => setUiPreferences((current) => ({ ...current, canvas_open_behavior: 'remember_last_view' }))}
                        className={segmentButtonClass(uiPreferences.canvas_open_behavior === 'remember_last_view' )}
                      >
                        Letzte Sicht
                      </button>
                    </div>
                  </div>
                  <div className="mt-5">
                    <p className="wow-ui-label">Tabellensicht</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Steuert, ob die Umschaltung zur tabellarischen SIPOC-Ansicht im Header sichtbar ist.
                    </p>
                    <div className="mt-4 inline-flex rounded-[var(--wow-control-radius)] border border-[var(--wow-panel-border)] bg-[var(--panel-strong)] p-1">
                      <button
                        type="button"
                        data-testid="settings-ui-table-view-on"
                        onClick={() => setUiPreferences((current) => ({ ...current, enable_table_view: true }))}
                        className={segmentButtonClass(uiPreferences.enable_table_view )}
                      >
                        Eingeschaltet
                      </button>
                      <button
                        type="button"
                        data-testid="settings-ui-table-view-off"
                        onClick={() => setUiPreferences((current) => ({ ...current, enable_table_view: false }))}
                        className={segmentButtonClass(!uiPreferences.enable_table_view )}
                      >
                        Ausgeschaltet
                      </button>
                    </div>
                  </div>
                  <div className="mt-5">
                    <p className="wow-ui-label">Swimlane View</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Steuert, ob die Rollen-Gruppierung im Header sichtbar und nutzbar ist. Standard ist ausgeschaltet.
                    </p>
                    <div className="mt-4 inline-flex rounded-[var(--wow-control-radius)] border border-[var(--wow-panel-border)] bg-[var(--panel-strong)] p-1">
                      <button
                        type="button"
                        data-testid="settings-ui-swimlane-on"
                        onClick={() => setUiPreferences((current) => ({ ...current, enable_swimlane_view: true }))}
                        className={segmentButtonClass(uiPreferences.enable_swimlane_view )}
                      >
                        Eingeschaltet
                      </button>
                      <button
                        type="button"
                        data-testid="settings-ui-swimlane-off"
                        onClick={() => setUiPreferences((current) => ({ ...current, enable_swimlane_view: false }))}
                        className={segmentButtonClass(!uiPreferences.enable_swimlane_view )}
                      >
                        Ausgeschaltet
                      </button>
                    </div>
                  </div>
                  <div className="mt-5">
                    <p className="wow-ui-label">Snap to Grid</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Bestimmt, ob Knoten beim Verschieben standardmaessig auf dem Raster einrasten. Standard ist eingeschaltet.
                    </p>
                    <div className="mt-4 inline-flex rounded-[var(--wow-control-radius)] border border-[var(--wow-panel-border)] bg-[var(--panel-strong)] p-1">
                      <button
                        type="button"
                        data-testid="settings-ui-snap-on"
                        onClick={() => setUiPreferences((current) => ({ ...current, snap_to_grid: true }))}
                        className={segmentButtonClass(uiPreferences.snap_to_grid )}
                      >
                        Eingeschaltet
                      </button>
                      <button
                        type="button"
                        data-testid="settings-ui-snap-off"
                        onClick={() => setUiPreferences((current) => ({ ...current, snap_to_grid: false }))}
                        className={segmentButtonClass(!uiPreferences.snap_to_grid )}
                      >
                        Ausgeschaltet
                      </button>
                    </div>
                  </div>
                  <div className="mt-5">
                    <p className="wow-ui-label">Kollisionserkennung</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Verschiebt beim manuellen Ziehen lokal kollidierende Nachbarknoten. Standard ist eingeschaltet.
                    </p>
                    <div className="mt-4 inline-flex rounded-[var(--wow-control-radius)] border border-[var(--wow-panel-border)] bg-[var(--panel-strong)] p-1">
                      <button
                        type="button"
                        data-testid="settings-ui-collision-on"
                        onClick={() => setUiPreferences((current) => ({ ...current, enable_node_collision_avoidance: true }))}
                        className={segmentButtonClass(uiPreferences.enable_node_collision_avoidance )}
                      >
                        Eingeschaltet
                      </button>
                      <button
                        type="button"
                        data-testid="settings-ui-collision-off"
                        onClick={() => setUiPreferences((current) => ({ ...current, enable_node_collision_avoidance: false }))}
                        className={segmentButtonClass(!uiPreferences.enable_node_collision_avoidance )}
                      >
                        Ausgeschaltet
                      </button>
                    </div>
                  </div>
                  <div className="mt-5">
                    <p className="wow-ui-label">Ausrichtungshilfen</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Zeigt beim manuellen Ziehen Hilfslinien fuer gleiche Kanten und Zentren. Standard ist eingeschaltet.
                    </p>
                    <div className="mt-4 inline-flex rounded-[var(--wow-control-radius)] border border-[var(--wow-panel-border)] bg-[var(--panel-strong)] p-1">
                      <button
                        type="button"
                        data-testid="settings-ui-alignment-guides-on"
                        onClick={() => setUiPreferences((current) => ({ ...current, enable_alignment_guides: true }))}
                        className={segmentButtonClass(uiPreferences.enable_alignment_guides )}
                      >
                        Eingeschaltet
                      </button>
                      <button
                        type="button"
                        data-testid="settings-ui-alignment-guides-off"
                        onClick={() => setUiPreferences((current) => ({ ...current, enable_alignment_guides: false }))}
                        className={segmentButtonClass(!uiPreferences.enable_alignment_guides )}
                      >
                        Ausgeschaltet
                      </button>
                    </div>
                  </div>
                  <div className="mt-5">
                    <p className="wow-ui-label">Magnetische Verbindungsziele</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Hebt naheliegende Zielknoten beim Kantenziehen hervor und verstaerkt den Snap auf sinnvolle Ziele. Standard ist eingeschaltet.
                    </p>
                    <div className="mt-4 inline-flex rounded-[var(--wow-control-radius)] border border-[var(--wow-panel-border)] bg-[var(--panel-strong)] p-1">
                      <button
                        type="button"
                        data-testid="settings-ui-magnetic-targets-on"
                        onClick={() => setUiPreferences((current) => ({ ...current, enable_magnetic_connection_targets: true }))}
                        className={segmentButtonClass(uiPreferences.enable_magnetic_connection_targets )}
                      >
                        Eingeschaltet
                      </button>
                      <button
                        type="button"
                        data-testid="settings-ui-magnetic-targets-off"
                        onClick={() => setUiPreferences((current) => ({ ...current, enable_magnetic_connection_targets: false }))}
                        className={segmentButtonClass(!uiPreferences.enable_magnetic_connection_targets )}
                      >
                        Ausgeschaltet
                      </button>
                    </div>
                  </div>
                  {uiPreferencesError ? <p className="mt-4 text-sm text-[var(--danger)]">{uiPreferencesError}</p> : null}
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      data-testid="settings-ui-save"
                      disabled={isSavingUiPreferences}
                      onClick={async () => {
                        setUiPreferencesError(null)
                        const nextPreferences = {
                          ...uiPreferences,
                          default_grouping_mode:
                            uiPreferences.enable_swimlane_view ? uiPreferences.default_grouping_mode : 'free',
                        }
                        try {
                          await onUiPreferencesChange(nextPreferences)
                        } catch (error) {
                          setUiPreferencesError(error instanceof Error ? error.message : 'Praeferenzen konnten nicht gespeichert werden.')
                        }
                      }}
                      className="wow-ui-button-primary disabled:opacity-40"
                    >
                      Praeferenzen speichern
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {activeSection === 'master-data' ? (
              <div className="space-y-8">
                <div className="wow-ui-card p-5">
                  <div className="flex items-center gap-2 text-sm text-[var(--text)]">
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
                      className="wow-ui-input disabled:opacity-60"
                    />
                    <input
                      data-testid="settings-transport-mode-new-description"
                      value={newTransportDescription}
                      onChange={(event) => setNewTransportDescription(event.target.value)}
                      disabled={!isEditable}
                      placeholder="Beschreibung"
                      className="wow-ui-input disabled:opacity-60"
                    />
                    <label className="wow-ui-section inline-flex items-center gap-2 px-4 py-3 text-sm text-[var(--text)]">
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
                      className="wow-ui-button-primary disabled:opacity-40"
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

                <div className="wow-ui-card p-5">
                  <div className="flex items-center gap-2 text-sm text-[var(--text)]">
                    <ShieldAlert className="h-4 w-4 text-cyan-200" />
                    <span>Rollen</span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-[1.1fr_140px_1.4fr_auto]">
                    <input
                      data-testid="settings-role-new-label"
                      value={newRoleLabel}
                      onChange={(event) => setNewRoleLabel(event.target.value)}
                      disabled={!isEditable}
                      placeholder="Neue Rolle"
                      className="wow-ui-input disabled:opacity-60"
                    />
                    <input
                      data-testid="settings-role-new-acronym"
                      value={newRoleAcronym}
                      onChange={(event) => setNewRoleAcronym(event.target.value)}
                      disabled={!isEditable}
                      placeholder="Akronym optional"
                      className="wow-ui-input disabled:opacity-60"
                    />
                    <input
                      data-testid="settings-role-new-description"
                      value={newRoleDescription}
                      onChange={(event) => setNewRoleDescription(event.target.value)}
                      disabled={!isEditable}
                      placeholder="Beschreibung"
                      className="wow-ui-input disabled:opacity-60"
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
                              acronym: newRoleAcronym.trim() || null,
                              description: newRoleDescription.trim() || null,
                            })
                            setNewRoleLabel('')
                            setNewRoleAcronym('')
                            setNewRoleDescription('')
                          } catch (error) {
                            setMasterDataError(error instanceof Error ? error.message : 'Rolle konnte nicht angelegt werden.')
                          }
                        }}
                        className="wow-ui-button-primary disabled:opacity-40"
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
                            acronym: input.acronym.trim() || null,
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
                    {sortedRoles.length === 0 ? <p className="text-sm text-[var(--muted)]">Noch keine Rollen im Firmenkatalog.</p> : null}
                  </div>
                </div>

                <div className="wow-ui-card p-5">
                  <div className="flex items-center gap-2 text-sm text-[var(--text)]">
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
                      className="wow-ui-input disabled:opacity-60"
                    />
                    <input
                      data-testid="settings-it-tool-new-description"
                      value={newToolDescription}
                      onChange={(event) => setNewToolDescription(event.target.value)}
                      disabled={!isEditable}
                      placeholder="Beschreibung"
                      className="wow-ui-input disabled:opacity-60"
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
                        className="wow-ui-button-primary disabled:opacity-40"
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
                    {sortedItTools.length === 0 ? <p className="text-sm text-[var(--muted)]">Noch keine IT-Tools im Firmenkatalog.</p> : null}
                  </div>
                  {masterDataError ? <p className="mt-3 text-sm text-[var(--danger)]">{masterDataError}</p> : null}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}






