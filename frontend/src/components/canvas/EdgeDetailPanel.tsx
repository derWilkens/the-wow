import { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, Check, Database, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react'
import type { CanvasEdge, EdgeDataObject, TransportModeOption } from '../../types'
import { CustomChoiceList } from '../ui/CustomChoiceList'

function buildVisibleTransportModes(edge: CanvasEdge, transportModes: TransportModeOption[]) {
  const currentMode = edge.transport_mode
  const activeModes = transportModes
    .filter((mode) => mode.is_active)
    .sort((left, right) => {
      if (left.is_default !== right.is_default) {
        return left.is_default ? -1 : 1
      }
      if (left.sort_order !== right.sort_order) {
        return left.sort_order - right.sort_order
      }
      return left.label.localeCompare(right.label, 'de')
    })

  if (!currentMode || activeModes.some((mode) => mode.id === currentMode.id)) {
    return activeModes
  }

  return [...activeModes, currentMode]
}

function getFieldSummary(dataObject: EdgeDataObject) {
  const fieldCount = dataObject.fields?.length ?? 0
  if (fieldCount === 0) {
    return 'Noch keine Felder'
  }

  return `${fieldCount} Feld${fieldCount === 1 ? '' : 'er'}`
}

export function EdgeDetailPanel({
  edge,
  allowPathLabel = false,
  transportModes,
  dataObjects,
  reusableDataObjects,
  onClose,
  onSave,
  onCreateTransportMode,
  canCreateTransportMode = false,
  onAddNewDataObject,
  onAddExistingDataObject,
  onRenameDataObject,
  onOpenDataObject,
  onDeleteDataObject,
}: {
  edge: CanvasEdge
  allowPathLabel?: boolean
  transportModes: TransportModeOption[]
  dataObjects: EdgeDataObject[]
  reusableDataObjects: EdgeDataObject[]
  onClose: () => void
  onSave: (input: { label: string | null; transport_mode_id: string | null; notes: string | null }) => void
  onCreateTransportMode?: (
    input: { label: string; description?: string | null; is_default?: boolean },
  ) => Promise<TransportModeOption | void> | TransportModeOption | void
  canCreateTransportMode?: boolean
  onAddNewDataObject: () => Promise<EdgeDataObject | undefined> | EdgeDataObject | undefined
  onAddExistingDataObject: (dataObjectId: string) => void
  onRenameDataObject: (dataObjectId: string, name: string) => Promise<void> | void
  onOpenDataObject: (dataObject: EdgeDataObject) => void
  onDeleteDataObject: (dataObjectId: string) => void
}) {
  const [pathLabel, setPathLabel] = useState(edge.label ?? '')
  const [transportModeId, setTransportModeId] = useState(edge.transport_mode_id ?? '')
  const [notes, setNotes] = useState(edge.notes ?? '')
  const [selectedExistingId, setSelectedExistingId] = useState('')
  const [existingSearch, setExistingSearch] = useState('')
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null)
  const [draftNames, setDraftNames] = useState<Record<string, string>>({})
  const [isCreatingInline, setIsCreatingInline] = useState(false)
  const [createdTransportModes, setCreatedTransportModes] = useState<TransportModeOption[]>([])

  const visibleTransportModes = useMemo(
    () => buildVisibleTransportModes(edge, [...transportModes, ...createdTransportModes]),
    [createdTransportModes, edge, transportModes],
  )
  const hasChanges =
    pathLabel !== (edge.label ?? '') ||
    transportModeId !== (edge.transport_mode_id ?? '') ||
    notes !== (edge.notes ?? '')
  const reusableOptions = useMemo(
    () => reusableDataObjects.filter((candidate) => !dataObjects.some((item) => item.name === candidate.name)),
    [dataObjects, reusableDataObjects],
  )
  const filteredReusableOptions = useMemo(
    () =>
      reusableOptions.filter((candidate) =>
        candidate.name.toLocaleLowerCase('de').includes(existingSearch.trim().toLocaleLowerCase('de')),
      ),
    [existingSearch, reusableOptions],
  )
  const selectedTransportMode = visibleTransportModes.find((mode) => mode.id === transportModeId)
  const transportModeOptions = useMemo(
    () =>
      visibleTransportModes.map((mode) => ({
        id: mode.id,
        label: mode.label,
        description: mode.description,
        badges: [mode.is_default ? 'Standard' : null, !mode.is_active ? 'Inaktiv' : null].filter(Boolean) as string[],
      })),
    [visibleTransportModes],
  )
  const transportDescription =
    selectedTransportMode?.description ??
    (transportModeId
      ? 'Dieser Modus ist gesetzt, hat aber keine weitere Beschreibung.'
      : 'Waehle bei Bedarf, wie die Uebergabe zwischen Quelle und Senke in der Praxis erfolgt.')
  const statusChipLabel = selectedTransportMode
    ? `${selectedTransportMode.label}${selectedTransportMode.is_active ? '' : ' (inaktiv)'}`
    : 'Kein Transportmodus gesetzt'

  useEffect(() => {
    setPathLabel(edge.label ?? '')
    setTransportModeId(edge.transport_mode_id ?? '')
    setNotes(edge.notes ?? '')
    setSelectedExistingId('')
    setExistingSearch('')
    setInlineEditingId(null)
  }, [edge.id, edge.label, edge.transport_mode_id, edge.notes])

  useEffect(() => {
    setDraftNames((current) => {
      const next = { ...current }
      for (const dataObject of dataObjects) {
        if (!(dataObject.id in next)) {
          next[dataObject.id] = dataObject.name
        }
      }
      for (const key of Object.keys(next)) {
        if (!dataObjects.some((dataObject) => dataObject.id === key)) {
          delete next[key]
        }
      }
      return next
    })
  }, [dataObjects])

  useEffect(() => {
    if (inlineEditingId && !dataObjects.some((dataObject) => dataObject.id === inlineEditingId)) {
      setInlineEditingId(null)
    }
  }, [dataObjects, inlineEditingId])

  async function handleCreateQuickObject() {
    setIsCreatingInline(true)
    try {
      const createdObject = await onAddNewDataObject()
      if (!createdObject) {
        return
      }
      setDraftNames((current) => ({
        ...current,
        [createdObject.id]: createdObject.name,
      }))
      setInlineEditingId(createdObject.id)
    } finally {
      setIsCreatingInline(false)
    }
  }

  async function handleConfirmInlineName(dataObjectId: string) {
    const nextName = draftNames[dataObjectId]?.trim()
    const fallbackName = dataObjects.find((item) => item.id === dataObjectId)?.name ?? ''
    const resolvedName = nextName || fallbackName
    setDraftNames((current) => ({
      ...current,
      [dataObjectId]: resolvedName,
    }))
    setInlineEditingId(null)
    await onRenameDataObject(dataObjectId, resolvedName)
  }

  async function handleCreateTransportMode(input: { label: string; description: string; flag: boolean }) {
    if (!onCreateTransportMode) {
      return
    }

    const createdMode = await onCreateTransportMode({
      label: input.label,
      description: input.description || null,
      is_default: input.flag,
    })

    if (!createdMode) {
      return
    }

    setCreatedTransportModes((current) => [...current.filter((mode) => mode.id !== createdMode.id), createdMode])
    return {
      id: createdMode.id,
      label: createdMode.label,
      description: createdMode.description,
      badges: [createdMode.is_default ? 'Standard' : null, !createdMode.is_active ? 'Inaktiv' : null].filter(
        Boolean,
      ) as string[],
    }
  }

  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-4">
      <div
        data-testid={`edge-detail-${edge.from_node_id}-${edge.to_node_id}`}
        className="wow-ui-dialog pointer-events-auto max-h-[calc(100%-2rem)] w-full max-w-[22rem] overflow-y-auto p-4"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="wow-ui-eyebrow">Verbindung</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-sm text-[var(--text)]">
              <span className="wow-ui-chip px-3 py-1.5">
                <ArrowRightLeft className="h-4 w-4 text-[var(--wow-primary)]" />
                <span>{dataObjects.length} Datenobjekt{dataObjects.length === 1 ? '' : 'e'}</span>
              </span>
              <span
                data-testid="edge-transport-status-chip"
                className={`wow-ui-chip px-3 py-1.5 text-xs ${
                  selectedTransportMode
                    ? 'border-[var(--wow-primary)] bg-[var(--wow-primary-soft)] text-[var(--wow-primary)]'
                    : ''
                }`}
              >
                {statusChipLabel}
              </span>
            </div>
          </div>
          <button data-testid="edge-close" onClick={onClose} className="wow-ui-icon-button">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <section data-testid="edge-section-transport" className="wow-ui-section p-3.5">
            <div className="mb-3">
              <p className="wow-ui-label">Transport</p>
              <p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">
                Beschreibe hier, wie die Uebergabe in der Praxis ablaeuft. Die Verbindung selbst bleibt davon unberuehrt.
              </p>
            </div>
            {allowPathLabel ? (
              <>
                <label className="wow-ui-label">Pfad / Bedingung</label>
                <input
                  data-testid="edge-path-label"
                  value={pathLabel}
                  onChange={(event) => setPathLabel(event.target.value)}
                  placeholder="z. B. Ja, Nein oder > 1000 EUR"
                  className="wow-ui-input mt-2"
                />
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                  Dieser Text erscheint direkt auf dem Pfad der Entscheidung.
                </p>
              </>
            ) : null}
            <label className={`${allowPathLabel ? 'mt-4 block' : ''} wow-ui-label`}>Transportmodus</label>
            <div className="mt-2">
              <CustomChoiceList
                testId="edge-transport-mode"
                value={transportModeId}
                options={transportModeOptions}
                placeholder="Nicht festgelegt"
                allowClear
                clearLabel="Nicht festgelegt"
                searchable
                searchPlaceholder="Transportmodus suchen"
                creatable={canCreateTransportMode}
                createLabel="Transportmodus anlegen"
                createPrimaryLabel="Bezeichnung"
                createPrimaryPlaceholder="z. B. Mail oder Direkt"
                createSecondaryLabel="Beschreibung"
                createSecondaryPlaceholder="Optional: kurze Beschreibung"
                createFlagLabel="Als Standard markieren"
                onSelect={setTransportModeId}
                onCreate={canCreateTransportMode ? handleCreateTransportMode : undefined}
              />
            </div>
            <p
              data-testid="edge-transport-description"
              className="mt-2 rounded-[var(--wow-control-radius)] border border-[var(--wow-panel-border)] bg-[var(--panel-strong)] px-3 py-2 text-xs leading-5 text-[var(--muted)]"
            >
              {transportDescription}
            </p>

            <label className="mt-4 block wow-ui-label">Kontextnotiz</label>
            <textarea
              data-testid="edge-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Optional: kurze Besonderheit zur Uebergabe, zum Takt oder zur Ablage."
              className="wow-ui-textarea mt-2"
            />
          </section>

          <section data-testid="edge-section-data-objects" className="wow-ui-section p-3.5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="wow-ui-label">Datenobjekte</p>
                <p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">
                  Verwalte hier, welche Informationen auf dieser Verbindung transportiert werden.
                </p>
              </div>
              <button
                type="button"
                data-testid="edge-add-new-data-object"
                onClick={() => void handleCreateQuickObject()}
                disabled={isCreatingInline}
                className="wow-ui-button-secondary min-h-0 px-3 py-1.5 text-xs disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Neues Datenobjekt
              </button>
            </div>

            <div className="space-y-2">
              {dataObjects.length > 0 ? (
                dataObjects.map((canvasObject) => {
                  const isInlineEditing = inlineEditingId === canvasObject.id
                  const visibleName = draftNames[canvasObject.id] ?? canvasObject.name
                  return (
                    <div
                      key={canvasObject.id}
                      data-testid={`edge-data-object-row-${canvasObject.id}`}
                      className="group wow-ui-card px-3 py-3 transition"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-1 rounded-full border border-[var(--wow-panel-border)] bg-[var(--wow-primary-soft)] p-2 text-[var(--wow-primary)]">
                          <Database className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          {isInlineEditing ? (
                            <div className="space-y-2">
                              <input
                                autoFocus
                                data-testid={`edge-inline-name-${canvasObject.id}`}
                                value={draftNames[canvasObject.id] ?? canvasObject.name}
                                onChange={(event) =>
                                  setDraftNames((current) => ({
                                    ...current,
                                    [canvasObject.id]: event.target.value,
                                  }))
                                }
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault()
                                    void handleConfirmInlineName(canvasObject.id)
                                  }
                                  if (event.key === 'Escape') {
                                    setDraftNames((current) => ({
                                      ...current,
                                      [canvasObject.id]: canvasObject.name,
                                    }))
                                    setInlineEditingId(null)
                                  }
                                }}
                                className="wow-ui-input"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  data-testid={`edge-inline-save-${canvasObject.id}`}
                                  onClick={() => void handleConfirmInlineName(canvasObject.id)}
                                  className="wow-ui-button-primary min-h-0 px-3 py-1.5 text-xs"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Name uebernehmen
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDraftNames((current) => ({
                                      ...current,
                                      [canvasObject.id]: canvasObject.name,
                                    }))
                                    setInlineEditingId(null)
                                  }}
                                  className="wow-ui-button-secondary min-h-0 px-3 py-1.5 text-xs"
                                >
                                  Abbrechen
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between gap-3">
                                <p className="truncate font-medium text-[var(--text)]">{visibleName}</p>
                                <div className="flex min-w-[150px] justify-end">
                                  <div className="flex items-center text-right text-xs text-[var(--muted)] transition-opacity duration-150 group-hover:opacity-0 group-focus-within:opacity-0">
                                    <span className="truncate">{getFieldSummary(canvasObject)} · Details verfuegbar</span>
                                  </div>
                                  <div className="absolute flex gap-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                                    <button
                                      type="button"
                                      data-testid={`edge-edit-data-object-${canvasObject.id}`}
                                      onClick={() => setInlineEditingId(canvasObject.id)}
                                      className="wow-ui-icon-button p-2"
                                      aria-label={`${visibleName} umbenennen`}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      data-testid={`edge-open-data-object-${canvasObject.id}`}
                                      onClick={() => onOpenDataObject(canvasObject)}
                                      className="wow-ui-button-secondary min-h-0 px-3 py-2 text-xs"
                                    >
                                      Bearbeiten
                                    </button>
                                    <button
                                      type="button"
                                      data-testid={`edge-delete-data-object-${canvasObject.id}`}
                                      onClick={() => onDeleteDataObject(canvasObject.id)}
                                      className="wow-ui-icon-button border-[rgba(186,26,26,0.18)] bg-[rgba(186,26,26,0.08)] text-[var(--danger)]"
                                      aria-label={`${visibleName} entfernen`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <p className="mt-2 text-xs text-[var(--muted)]">{getFieldSummary(canvasObject)}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="rounded-[var(--wow-panel-radius)] border border-dashed border-[var(--wow-panel-border)] bg-[var(--panel-strong)] px-4 py-4 text-sm text-[var(--muted)]">
                  Auf dieser Verbindung liegt noch kein Datenobjekt.
                </p>
              )}
            </div>

            <div className="wow-ui-card mt-4 p-3">
              <label className="wow-ui-label">
                Bestehendes Datenobjekt hinzufuegen
              </label>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  data-testid="edge-existing-data-object-search"
                  value={existingSearch}
                  onChange={(event) => setExistingSearch(event.target.value)}
                  placeholder="Nach Name suchen"
                  className="wow-ui-input py-3 pl-10 pr-4"
                />
              </div>
              <div className="mt-3 max-h-36 space-y-2 overflow-auto">
                {filteredReusableOptions.length > 0 ? (
                  filteredReusableOptions.map((canvasObject) => (
                    <button
                      key={canvasObject.id}
                      type="button"
                      data-testid={`edge-existing-data-object-option-${canvasObject.id}`}
                      onClick={() => {
                        setSelectedExistingId(canvasObject.id)
                        onAddExistingDataObject(canvasObject.id)
                      }}
                      className={`flex w-full items-center justify-between rounded-[var(--wow-panel-radius)] border px-3 py-2 text-left text-sm ${
                        selectedExistingId === canvasObject.id
                          ? 'border-[var(--wow-primary)] bg-[var(--wow-primary-soft)] text-[var(--wow-primary)]'
                          : 'border-[var(--wow-panel-border)] bg-[var(--panel-strong)] text-[var(--text)]'
                      }`}
                    >
                      <span>{canvasObject.name}</span>
                      <span className="text-xs text-[var(--muted)]">{getFieldSummary(canvasObject)}</span>
                    </button>
                  ))
                ) : (
                  <p className="rounded-[var(--wow-panel-radius)] border border-dashed border-[var(--wow-panel-border)] px-3 py-3 text-sm text-[var(--muted)]">
                    Keine weiteren passenden Datenobjekte verfuegbar.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            data-testid="edge-save"
            disabled={!hasChanges}
            onClick={() =>
              onSave({
                label: pathLabel.trim() || null,
                transport_mode_id: transportModeId || null,
                notes: notes.trim() || null,
              })
            }
            className="wow-ui-button-primary disabled:opacity-40"
          >
            <Save className="h-4 w-4" />
            Speichern
          </button>
        </div>
      </div>
    </div>
  )
}

