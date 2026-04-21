import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { Check, Pencil } from 'lucide-react'
import type { CatalogRole, EdgeDataObject, TransportModeOption, WorkflowSipocItem, WorkflowSipocRoleRef, WorkflowSipocRow } from '../../types'
import { CustomChoiceList, type CustomChoiceOption } from '../ui/CustomChoiceList'
import { buildCatalogRoleChoiceOptions } from '../../lib/catalogRoles'

function buildTransportModeOptions(transportModes: TransportModeOption[]): CustomChoiceOption[] {
  return transportModes
    .filter((mode) => mode.is_active)
    .slice()
    .sort((left, right) => {
      if (left.is_default !== right.is_default) {
        return left.is_default ? -1 : 1
      }
      if (left.sort_order !== right.sort_order) {
        return left.sort_order - right.sort_order
      }
      return left.label.localeCompare(right.label, 'de')
    })
    .map((mode) => ({
      id: mode.id,
      label: mode.label,
      description: mode.description,
      badges: mode.is_default ? ['Standard'] : [],
    }))
}

function formatRelatedActivity(roleRef: WorkflowSipocRoleRef) {
  return roleRef.activityLabel || 'Verknuepfte Aktivitaet'
}

function SipocRoleEditor({
  testId,
  roleRef,
  roles,
  onUpdateRole,
  onCreateRole,
}: {
  testId: string
  roleRef: WorkflowSipocRoleRef
  roles: CatalogRole[]
  onUpdateRole: (activityId: string, roleId: string | null) => void
  onCreateRole: (input: { label: string; description: string; acronym?: string | null }) => Promise<CatalogRole | void> | CatalogRole | void
}) {
  return (
    <div className="wow-ui-card p-3">
      <div className="mb-2 text-xs text-[var(--muted)]">{formatRelatedActivity(roleRef)}</div>
      <CustomChoiceList
        testId={testId}
        value={roleRef.roleId ?? ''}
        options={buildCatalogRoleChoiceOptions(roles)}
        placeholder="Nicht zugeordnet"
        allowClear
        clearLabel="Nicht zugeordnet"
        searchable
        searchPlaceholder="Rolle suchen"
        creatable
        createLabel="Neue Rolle anlegen"
        createPrimaryLabel="Rollenname"
        createPrimaryPlaceholder="z. B. BIM-Koordination"
        createSecondaryLabel="Beschreibung"
        createSecondaryPlaceholder="Optional: kurze Beschreibung"
        onSelect={(roleId) => onUpdateRole(roleRef.activityId, roleId || null)}
        onCreate={(input) => onCreateRole({ label: input.label, description: input.description, acronym: null })}
      />
    </div>
  )
}

function SipocObjectEditor({
  title,
  testId,
  items,
  transportModes,
  reusableDataObjects,
  onUpdateTransportMode,
  onAddExistingDataObject,
  onCreateDataObject,
}: {
  title: string
  testId: string
  items: WorkflowSipocItem[]
  transportModes: TransportModeOption[]
  reusableDataObjects: EdgeDataObject[]
  onUpdateTransportMode: (edgeId: string, transportModeId: string | null) => void
  onAddExistingDataObject: (edgeId: string, dataObjectId: string) => void
  onCreateDataObject: (edgeId: string, name: string) => Promise<EdgeDataObject | void> | EdgeDataObject | void
}) {
  const byEdge = useMemo(() => {
    const groups = new Map<string, WorkflowSipocItem[]>()
    for (const item of items) {
      const current = groups.get(item.edgeId) ?? []
      current.push(item)
      groups.set(item.edgeId, current)
    }
    return Array.from(groups.entries()).map(([edgeId, edgeItems]) => ({ edgeId, edgeItems }))
  }, [items])

  if (byEdge.length === 0) {
    return <span className="text-[var(--muted)]">—</span>
  }

  return (
    <div className="space-y-3">
      {byEdge.map(({ edgeId, edgeItems }) => {
        const selectedIds = new Set(edgeItems.map((item) => item.id))
        const dataObjectOptions = reusableDataObjects
          .filter((candidate) => !selectedIds.has(candidate.id))
          .sort((left, right) => left.name.localeCompare(right.name, 'de'))
          .map((candidate) => ({
            id: candidate.id,
            label: candidate.name,
            description: candidate.fields?.length ? `${candidate.fields.length} Feld${candidate.fields.length === 1 ? '' : 'er'}` : undefined,
          }))

        return (
          <div key={edgeId} className="wow-ui-card p-3">
            <div className="mb-3">
              <div className="flex flex-wrap gap-2">
                {edgeItems.map((item) => (
                  <span
                    key={item.id}
                    className="wow-ui-chip px-2.5 py-1 text-[11px]"
                  >
                    {item.objectName}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid gap-3">
              <div>
                <div className="wow-ui-label mb-2">{title} Transport</div>
                <CustomChoiceList
                  testId={`${testId}-transport-${edgeId}`}
                  value={edgeItems[0]?.transportModeId ?? ''}
                  options={buildTransportModeOptions(transportModes)}
                  placeholder="Nicht festgelegt"
                  allowClear
                  clearLabel="Nicht festgelegt"
                  searchable
                  searchPlaceholder="Transportmodus suchen"
                  onSelect={(transportModeId) => onUpdateTransportMode(edgeId, transportModeId || null)}
                />
              </div>
              <div>
                <div className="wow-ui-label mb-2">{title} Datenobjekte</div>
                <CustomChoiceList
                  testId={`${testId}-data-object-${edgeId}`}
                  value=""
                  options={dataObjectOptions}
                  placeholder="Bestehendes Datenobjekt hinzufuegen"
                  searchable
                  searchPlaceholder="Datenobjekt suchen"
                  creatable
                  createLabel="Neues Datenobjekt anlegen"
                  createPrimaryLabel="Name"
                  createPrimaryPlaceholder="Name des Datenobjekts"
                  createSecondaryLabel="Beschreibung"
                  createSecondaryPlaceholder="Optional, wird aktuell nicht gespeichert"
                  autoSelectCreated={false}
                  onSelect={(dataObjectId) => {
                    if (dataObjectId) {
                      onAddExistingDataObject(edgeId, dataObjectId)
                    }
                  }}
                  onCreate={async (input) => {
                    const createdObject = await onCreateDataObject(edgeId, input.label)
                    if (!createdObject) {
                      return
                    }
                    return {
                      id: createdObject.id,
                      label: createdObject.name,
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function WorkflowSipocTable({
  rows,
  roles,
  transportModes,
  reusableDataObjects,
  onSelectActivity,
  onRenameProcess,
  onUpdateProcessRole,
  onUpdateRelatedRole,
  onCreateRole,
  onUpdateEdgeTransportMode,
  onAddExistingDataObjectToEdge,
  onCreateDataObjectOnEdge,
}: {
  rows: WorkflowSipocRow[]
  roles: CatalogRole[]
  transportModes: TransportModeOption[]
  reusableDataObjects: EdgeDataObject[]
  onSelectActivity?: (activityId: string) => void
  onRenameProcess: (activityId: string, label: string) => Promise<void> | void
  onUpdateProcessRole: (activityId: string, roleId: string | null) => Promise<void> | void
  onUpdateRelatedRole: (activityId: string, roleId: string | null) => Promise<void> | void
  onCreateRole: (input: { label: string; description: string; acronym?: string | null }) => Promise<CatalogRole | void> | CatalogRole | void
  onUpdateEdgeTransportMode: (edgeId: string, transportModeId: string | null) => Promise<void> | void
  onAddExistingDataObjectToEdge: (edgeId: string, dataObjectId: string) => Promise<void> | void
  onCreateDataObjectOnEdge: (edgeId: string, name: string) => Promise<EdgeDataObject | void> | EdgeDataObject | void
}) {
  const [draftLabels, setDraftLabels] = useState<Record<string, string>>({})
  const [editingProcessId, setEditingProcessId] = useState<string | null>(null)

  useEffect(() => {
    setDraftLabels((current) => {
      const next = { ...current }
      for (const row of rows) {
        if (!(row.activityId in next)) {
          next[row.activityId] = row.processLabel
        }
      }
      for (const key of Object.keys(next)) {
        if (!rows.some((row) => row.activityId === key)) {
          delete next[key]
        }
      }
      return next
    })
  }, [rows])

  async function commitProcessLabel(activityId: string) {
    const row = rows.find((candidate) => candidate.activityId === activityId)
    if (!row) {
      return
    }

    const nextLabel = (draftLabels[activityId] ?? row.processLabel).trim() || row.processLabel
    setDraftLabels((current) => ({ ...current, [activityId]: nextLabel }))
    setEditingProcessId(null)

    if (nextLabel !== row.processLabel) {
      await onRenameProcess(activityId, nextLabel)
    }
  }

  function handleProcessKeyDown(activityId: string, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void commitProcessLabel(activityId)
    }
    if (event.key === 'Escape') {
      const row = rows.find((candidate) => candidate.activityId === activityId)
      setDraftLabels((current) => ({
        ...current,
        [activityId]: row?.processLabel ?? current[activityId] ?? '',
      }))
      setEditingProcessId(null)
    }
  }

  return (
    <div
      data-testid="workflow-sipoc-table"
      className="h-full overflow-auto rounded-[var(--wow-panel-radius)] border border-[var(--wow-panel-border)] bg-[var(--panel)] p-4"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="wow-ui-eyebrow">SIPOC</p>
          <h2 className="wow-ui-title mt-2 text-xl">Tabellarische View</h2>
        </div>
        <p className="text-sm text-[var(--muted)]">Eine Zeile pro Aktivitaet, bearbeitbar ohne neue SIPOC-Zeilen anzulegen.</p>
      </div>

      <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-[22px]">
        <thead>
          <tr className="bg-[var(--panel-strong)] text-left text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
            <th className="px-4 py-3">Supplier</th>
            <th className="px-4 py-3">Input</th>
            <th className="px-4 py-3">Prozess</th>
            <th className="px-4 py-3">Output</th>
            <th className="px-4 py-3">Consumer</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.activityId}
              data-testid={`sipoc-row-${row.activityId}`}
              className="align-top text-sm text-[var(--text)] transition hover:bg-[var(--wow-secondary-soft)]"
            >
              <td className="border-t border-[var(--wow-panel-border)] px-4 py-4">
                {row.supplierRoles.length > 0 ? (
                  <div className="space-y-3">
                    {row.supplierRoles.map((roleRef) => (
                      <SipocRoleEditor
                        key={roleRef.activityId}
                        testId={`sipoc-supplier-role-${roleRef.activityId}`}
                        roleRef={roleRef}
                        roles={roles}
                        onUpdateRole={onUpdateRelatedRole}
                        onCreateRole={onCreateRole}
                      />
                    ))}
                  </div>
                ) : (
                  <span className="text-[var(--muted)]">Nicht zugeordnet</span>
                )}
              </td>
              <td className="border-t border-[var(--wow-panel-border)] px-4 py-4">
                <SipocObjectEditor
                  title="Input"
                  testId="sipoc-input"
                  items={row.inputs}
                  transportModes={transportModes}
                  reusableDataObjects={reusableDataObjects}
                  onUpdateTransportMode={onUpdateEdgeTransportMode}
                  onAddExistingDataObject={onAddExistingDataObjectToEdge}
                  onCreateDataObject={onCreateDataObjectOnEdge}
                />
              </td>
              <td className="border-t border-[var(--wow-panel-border)] px-4 py-4">
                <div className="space-y-3">
                  <div className="wow-ui-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <input
                          data-testid={`sipoc-process-input-${row.activityId}`}
                          value={draftLabels[row.activityId] ?? row.processLabel}
                          onFocus={() => setEditingProcessId(row.activityId)}
                          onChange={(event) =>
                            setDraftLabels((current) => ({
                              ...current,
                              [row.activityId]: event.target.value,
                            }))
                          }
                          onBlur={() => void commitProcessLabel(row.activityId)}
                          onKeyDown={(event) => handleProcessKeyDown(row.activityId, event)}
                          className="wow-ui-input font-medium text-[var(--wow-primary)]"
                        />
                      </div>
                      {onSelectActivity ? (
                        <button
                          type="button"
                          data-testid={`sipoc-process-${row.activityId}`}
                          onClick={() => onSelectActivity(row.activityId)}
                          className="wow-ui-icon-button p-2 text-[var(--text)]"
                          aria-label="Im Zeichenmodus fokussieren"
                        >
                          {editingProcessId === row.activityId ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-3">
                      <div className="wow-ui-label mb-2">Prozessrolle</div>
                      <CustomChoiceList
                        testId={`sipoc-process-role-${row.activityId}`}
                        value={row.processRoleId ?? ''}
                        options={buildCatalogRoleChoiceOptions(roles)}
                        placeholder="Nicht zugeordnet"
                        allowClear
                        clearLabel="Nicht zugeordnet"
                        searchable
                        searchPlaceholder="Rolle suchen"
                        creatable
                        createLabel="Neue Rolle anlegen"
                        createPrimaryLabel="Rollenname"
                        createPrimaryPlaceholder="z. B. Projektleitung"
                        createSecondaryLabel="Beschreibung"
                        createSecondaryPlaceholder="Optional: kurze Beschreibung"
                        onSelect={(roleId) => onUpdateProcessRole(row.activityId, roleId || null)}
                        onCreate={(input) => onCreateRole({ label: input.label, description: input.description })}
                      />
                    </div>
                  </div>
                </div>
              </td>
              <td className="border-t border-[var(--wow-panel-border)] px-4 py-4">
                <SipocObjectEditor
                  title="Output"
                  testId="sipoc-output"
                  items={row.outputs}
                  transportModes={transportModes}
                  reusableDataObjects={reusableDataObjects}
                  onUpdateTransportMode={onUpdateEdgeTransportMode}
                  onAddExistingDataObject={onAddExistingDataObjectToEdge}
                  onCreateDataObject={onCreateDataObjectOnEdge}
                />
              </td>
              <td className="border-t border-[var(--wow-panel-border)] px-4 py-4">
                {row.consumerRoles.length > 0 ? (
                  <div className="space-y-3">
                    {row.consumerRoles.map((roleRef) => (
                      <SipocRoleEditor
                        key={roleRef.activityId}
                        testId={`sipoc-consumer-role-${roleRef.activityId}`}
                        roleRef={roleRef}
                        roles={roles}
                        onUpdateRole={onUpdateRelatedRole}
                        onCreateRole={onCreateRole}
                      />
                    ))}
                  </div>
                ) : (
                  <span className="text-[var(--muted)]">Nicht zugeordnet</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

