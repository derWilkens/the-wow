import { MessageSquare, Pencil, Trash2, UserRound, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  useActivityComments,
  useCreateActivityComment,
  useDeleteActivityComment,
  useUpdateActivityComment,
  useUpsertActivity,
} from '../../api/activities'
import {
  useActivityTools,
  useAddCheckSource,
  useCheckSources,
  useCreateITTool,
  useITTools,
  useLinkActivityTool,
  useRemoveCheckSource,
  useUnlinkActivityTool,
} from '../../api/activityResources'
import { useOrganizationMembers } from '../../api/organizations'
import type { Activity, ActivityType, CanvasEdge, CanvasObject, ITTool } from '../../types'
import { deriveActivityDataObjects } from './canvasData'
import { CustomChoiceList } from '../ui/CustomChoiceList'

const activityTypes: Array<{ label: string; value: ActivityType }> = [
  { label: 'Erstellen', value: 'erstellen' },
  { label: 'Transformieren / Aktualisieren', value: 'transformieren_aktualisieren' },
  { label: 'Pruefen / Freigeben', value: 'pruefen_freigeben' },
  { label: 'Weiterleiten / Ablegen', value: 'weiterleiten_ablegen' },
]

export function ActivityDetailPopup({
  activity,
  workspaceId,
  organizationId,
  currentUserId,
  canvasObjects,
  canvasEdges,
  connectionCount,
  onDelete,
  onClose,
}: {
  activity: Activity
  workspaceId: string
  organizationId: string
  currentUserId: string
  canvasObjects: CanvasObject[]
  canvasEdges: CanvasEdge[]
  connectionCount: number
  onDelete: () => void
  onClose: () => void
}) {
  const [label, setLabel] = useState(activity.label)
  const [activityType, setActivityType] = useState<ActivityType | null>(activity.activity_type)
  const [description, setDescription] = useState(activity.description ?? '')
  const [notes, setNotes] = useState(activity.notes ?? '')
  const [duration, setDuration] = useState(activity.duration_minutes?.toString() ?? '')
  const [selectedToolId, setSelectedToolId] = useState('')
  const [selectedCheckSource, setSelectedCheckSource] = useState('')
  const [assigneeUserId, setAssigneeUserId] = useState(activity.assignee_user_id ?? '')
  const [commentDraft, setCommentDraft] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentBody, setEditingCommentBody] = useState('')
  const [optimisticLinkedTools, setOptimisticLinkedTools] = useState<ITTool[]>([])
  const [optimisticCatalogTools, setOptimisticCatalogTools] = useState<ITTool[]>([])
  const [optimisticUnlinkedToolIds, setOptimisticUnlinkedToolIds] = useState<string[]>([])

  const upsertActivity = useUpsertActivity(workspaceId)
  const { data: tools = [] } = useActivityTools(workspaceId, activity.id)
  const { data: availableTools = [] } = useITTools(workspaceId)
  const createITTool = useCreateITTool(workspaceId)
  const linkTool = useLinkActivityTool(workspaceId, activity.id)
  const unlinkTool = useUnlinkActivityTool(workspaceId, activity.id)
  const { data: checkSources = [] } = useCheckSources(workspaceId, activity.id)
  const addCheckSource = useAddCheckSource(workspaceId, activity.id)
  const removeCheckSource = useRemoveCheckSource(workspaceId, activity.id)
  const { data: organizationMembers = [] } = useOrganizationMembers(organizationId)
  const { data: comments = [] } = useActivityComments(workspaceId, activity.id)
  const createComment = useCreateActivityComment(workspaceId, activity.id)
  const updateComment = useUpdateActivityComment(workspaceId, activity.id)
  const deleteComment = useDeleteActivityComment(workspaceId, activity.id)

  const dataObjects = useMemo(() => canvasObjects.filter((item) => item.object_type === 'datenobjekt'), [canvasObjects])
  const derivedDataObjects = useMemo(() => deriveActivityDataObjects(activity, canvasEdges, canvasObjects), [activity, canvasEdges, canvasObjects])
  const saveDisabled = activityType === 'pruefen_freigeben' && checkSources.length === 0
  const visibleLinkedTools = useMemo(
    () =>
      Array.from(new Map([...tools, ...optimisticLinkedTools].map((tool) => [tool.id, tool])).values()).filter(
        (tool) => !optimisticUnlinkedToolIds.includes(tool.id),
      ),
    [optimisticLinkedTools, optimisticUnlinkedToolIds, tools],
  )
  const visibleCatalogTools = useMemo(
    () => Array.from(new Map([...availableTools, ...optimisticCatalogTools].map((tool) => [tool.id, tool])).values()),
    [availableTools, optimisticCatalogTools],
  )
  const availableToolOptions = useMemo(
    () => visibleCatalogTools.filter((tool) => !visibleLinkedTools.some((linkedTool) => linkedTool.id === tool.id)),
    [visibleCatalogTools, visibleLinkedTools],
  )
  const assigneeOptions = useMemo(
    () =>
      organizationMembers.map((member) => ({
        ...member,
        displayLabel: member.display_name ?? member.email ?? `${member.user_id.slice(0, 8)}...`,
      })),
    [organizationMembers],
  )
  const selectedAssignee = assigneeOptions.find((member) => member.user_id === assigneeUserId) ?? null
  const assigneeChoiceOptions = useMemo(
    () =>
      assigneeOptions.map((member) => ({
        id: member.user_id,
        label: member.displayLabel,
        description: `Rolle: ${member.domain_role_label ?? member.role}`,
        badges: [member.domain_role_label ?? member.role],
      })),
    [assigneeOptions],
  )
  const toolChoiceOptions = useMemo(
    () =>
      availableToolOptions.map((tool) => ({
        id: tool.id,
        label: tool.name,
        description: tool.description,
      })),
    [availableToolOptions],
  )
  const checkSourceOptions = useMemo(
    () =>
      dataObjects.map((item) => ({
        id: item.id,
        label: item.name,
        description: item.fields?.length ? `${item.fields.length} Feld${item.fields.length === 1 ? '' : 'er'}` : 'Noch keine Felder',
      })),
    [dataObjects],
  )

  async function handleSave() {
    await upsertActivity.mutateAsync({
      id: activity.id,
      parent_id: activity.parent_id,
      node_type: activity.node_type,
      label,
      trigger_type: activity.trigger_type,
      position_x: activity.position_x,
      position_y: activity.position_y,
      status: activity.status,
      status_icon: activity.status_icon,
      activity_type: activityType,
      description,
      notes,
      assignee_user_id: assigneeUserId || null,
      duration_minutes: duration ? Number(duration) : null,
    })
    onClose()
  }

  async function handleLinkTool() {
    if (!selectedToolId) {
      return
    }

    const selectedTool = visibleCatalogTools.find((tool) => tool.id === selectedToolId)
    if (selectedTool) {
      setOptimisticUnlinkedToolIds((current) => current.filter((id) => id !== selectedTool.id))
      setOptimisticLinkedTools((current) => [...current.filter((tool) => tool.id !== selectedTool.id), selectedTool])
    }
    await linkTool.mutateAsync(selectedToolId)
    setSelectedToolId('')
  }

  async function handleCreateTool(input: { label: string; description: string }) {
    const tool = await createITTool.mutateAsync({
      name: input.label.trim(),
      description: input.description.trim() || null,
    })
    setOptimisticUnlinkedToolIds((current) => current.filter((id) => id !== tool.id))
    setOptimisticCatalogTools((current) => [...current.filter((entry) => entry.id !== tool.id), tool])
    setOptimisticLinkedTools((current) => [...current.filter((entry) => entry.id !== tool.id), tool])
    await linkTool.mutateAsync(tool.id)
  }

  async function handleCreateComment() {
    if (!commentDraft.trim()) {
      return
    }

    await createComment.mutateAsync(commentDraft.trim())
    setCommentDraft('')
  }

  async function handleSaveComment() {
    if (!editingCommentId || !editingCommentBody.trim()) {
      return
    }

    await updateComment.mutateAsync({
      commentId: editingCommentId,
      body: editingCommentBody.trim(),
    })
    setEditingCommentId(null)
    setEditingCommentBody('')
  }

  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-4">
      <div
        data-testid={`activity-detail-${activity.id}`}
        className="pointer-events-auto max-h-[calc(100%-2rem)] w-full max-w-lg overflow-auto rounded-[28px] border border-white/10 bg-slate-950/95 p-6 shadow-[0_35px_120px_rgba(2,8,12,0.72)] backdrop-blur-xl"
      >
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-300/80">Aktivitaet</p>
            <input
              data-testid="activity-detail-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 font-display text-2xl text-white outline-none"
            />
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-5 text-sm text-slate-300">
          <section>
            <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">Aktivitaetstyp</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {activityTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setActivityType(type.value)}
                  className={`rounded-2xl border px-3 py-3 text-left text-xs ${activityType === type.value ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100' : 'border-white/10 bg-white/[0.03] text-slate-500'}`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Ausfuehrende(r)</p>
              <div className="mt-2">
                <CustomChoiceList
                  testId="activity-assignee-select"
                  value={assigneeUserId}
                  options={assigneeChoiceOptions}
                  placeholder="Nicht zugeordnet"
                  allowClear
                  clearLabel="Nicht zugeordnet"
                  searchable
                  searchPlaceholder="Ausfuehrende Person suchen"
                  onSelect={setAssigneeUserId}
                />
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Rolle</p>
              <div className="mt-2 flex min-h-[50px] items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white">
                <UserRound className="mr-2 h-4 w-4 text-cyan-200" />
                {selectedAssignee?.domain_role_label ?? selectedAssignee?.role ?? 'Nicht zugeordnet'}
              </div>
            </div>
          </section>

          <section>
            <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">Beschreibung</p>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none" />
          </section>

          <section>
            <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">Notizen</p>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none" />
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Dauer</p>
              <input type="number" min={0} value={duration} onChange={(event) => setDuration(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Verbindungen</p>
              <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white">{connectionCount}</div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-4">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Eingaben</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {derivedDataObjects.incoming.length > 0 ? (
                  derivedDataObjects.incoming.map((canvasObject) => (
                    <span key={canvasObject.id} className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
                      {canvasObject.name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">Keine eingehenden Datenobjekte</span>
                )}
              </div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Ergebnisse</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {derivedDataObjects.outgoing.length > 0 ? (
                  derivedDataObjects.outgoing.map((canvasObject) => (
                    <span key={canvasObject.id} className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-100">
                      {canvasObject.name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">Keine ausgehenden Datenobjekte</span>
                )}
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">IT-Tools</p>
              <span className="text-xs text-slate-500">{connectionCount} Verbindungen</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {visibleLinkedTools.length > 0 ? (
                visibleLinkedTools.map((tool) => (
                  <button
                    key={tool.id}
                    data-testid={`activity-tool-chip-${tool.id}`}
                    onClick={() => {
                      setOptimisticUnlinkedToolIds((current) => [...new Set([...current, tool.id])])
                      setOptimisticLinkedTools((current) => current.filter((entry) => entry.id !== tool.id))
                      void unlinkTool.mutateAsync(tool.id)
                    }}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-200"
                  >
                    {tool.name} x
                  </button>
                ))
              ) : (
                <span className="text-sm text-slate-500">Noch kein IT-Tool verlinkt</span>
              )}
            </div>
            <div className="mt-3 grid gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Bestehendes IT-Tool verlinken</p>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <CustomChoiceList
                    testId="activity-tool-select"
                    value={selectedToolId}
                    options={toolChoiceOptions}
                    placeholder="IT-Tool auswaehlen"
                    searchable
                    searchPlaceholder="IT-Tool suchen"
                    creatable
                    createLabel="Neues IT-Tool anlegen"
                    createPrimaryLabel="Name"
                    createPrimaryPlaceholder="Name des IT-Tools"
                    createSecondaryLabel="Beschreibung"
                    createSecondaryPlaceholder="Optional: kurze Beschreibung"
                    emptyState="Keine weiteren IT-Tools verfuegbar."
                    onSelect={setSelectedToolId}
                    onCreate={(input) => handleCreateTool({ label: input.label, description: input.description })}
                  />
                </div>
                <button
                  type="button"
                  data-testid="activity-tool-link-submit"
                  onClick={() => void handleLinkTool()}
                  disabled={!selectedToolId}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white disabled:opacity-40"
                >
                  Verlinken
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">Kommentare</p>
              <MessageSquare className="h-4 w-4 text-slate-500" />
            </div>
            <div className="mt-3 space-y-3">
              {comments.length > 0 ? (
                comments.map((comment) => {
                  const isEditing = editingCommentId === comment.id
                  const isOwnComment = comment.author_user_id === currentUserId
                  const author = assigneeOptions.find((member) => member.user_id === comment.author_user_id)
                  return (
                    <div key={comment.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingCommentBody}
                            onChange={(event) => setEditingCommentBody(event.target.value)}
                            rows={2}
                            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(null)
                                setEditingCommentBody('')
                              }}
                              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white"
                            >
                              Abbrechen
                            </button>
                            <button
                              type="button"
                              data-testid={`activity-comment-save-${comment.id}`}
                              onClick={() => void handleSaveComment()}
                              className="rounded-full bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-slate-950"
                            >
                              Speichern
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm text-white">{comment.body}</div>
                              <div className="mt-1 text-xs text-slate-500">
                                {author?.displayLabel ?? 'Unbekannt'} | {new Date(comment.created_at).toLocaleString()}
                              </div>
                            </div>
                            {isOwnComment ? (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  data-testid={`activity-comment-edit-${comment.id}`}
                                  onClick={() => {
                                    setEditingCommentId(comment.id)
                                    setEditingCommentBody(comment.body)
                                  }}
                                  className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-slate-200"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  data-testid={`activity-comment-delete-${comment.id}`}
                                  onClick={() => void deleteComment.mutateAsync(comment.id)}
                                  className="rounded-full border border-rose-400/25 bg-rose-500/10 p-2 text-rose-100"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-slate-500">Noch keine Kommentare.</p>
              )}
            </div>
            <div className="mt-3 flex gap-3">
              <textarea
                data-testid="activity-comment-input"
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                rows={2}
                placeholder="Kommentar verfassen"
                className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
              />
              <button
                type="button"
                data-testid="activity-comment-submit"
                onClick={() => void handleCreateComment()}
                disabled={!commentDraft.trim()}
                className="self-end rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-40"
              >
                Hinzufuegen
              </button>
            </div>
          </section>

          {activityType === 'pruefen_freigeben' ? (
            <section className="rounded-[24px] border border-violet-400/25 bg-violet-500/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.26em] text-violet-200">Sollzustand</p>
              <div className="mt-3 space-y-2">
                {checkSources.map((source) => {
                  const object = dataObjects.find((entry) => entry.id === source.canvas_object_id)
                  return (
                    <button key={source.id} onClick={() => void removeCheckSource.mutateAsync(source.id)} className="flex w-full items-start justify-between rounded-2xl border border-violet-300/20 bg-slate-950/40 p-3 text-left">
                      <div>
                        <div className="font-medium text-violet-50">{object?.name ?? source.canvas_object_id}</div>
                        <div className="mt-1 text-violet-100/80">{source.notes ?? 'Ohne Notiz'}</div>
                      </div>
                      <span className="text-violet-200">x</span>
                    </button>
                  )
                })}
              </div>
              <div className="mt-3 flex gap-3">
                <div className="flex-1">
                  <CustomChoiceList
                    testId="activity-check-source-select"
                    value={selectedCheckSource}
                    options={checkSourceOptions}
                    placeholder="Datenobjekt waehlen"
                    searchable
                    searchPlaceholder="Datenobjekt suchen"
                    onSelect={setSelectedCheckSource}
                  />
                </div>
                <button
                  onClick={() => {
                    if (selectedCheckSource) {
                      void addCheckSource.mutateAsync({ canvas_object_id: selectedCheckSource, notes: null })
                      setSelectedCheckSource('')
                    }
                  }}
                  className="rounded-2xl bg-violet-300 px-4 py-3 font-semibold text-slate-950"
                >
                  Add
                </button>
              </div>
              {saveDisabled ? <p className="mt-3 text-xs text-rose-200">Mindestens ein Sollzustand ist erforderlich.</p> : null}
            </section>
          ) : null}
        </div>

        <div className="mt-6 flex justify-between gap-3">
          <button data-testid="activity-detail-delete" onClick={onDelete} className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-rose-100">
            <Trash2 className="h-4 w-4" /> Loeschen
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white">Abbrechen</button>
            <button data-testid="activity-detail-save" disabled={saveDisabled} onClick={() => void handleSave()} className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-40">Speichern</button>
          </div>
        </div>
      </div>
    </div>
  )
}
