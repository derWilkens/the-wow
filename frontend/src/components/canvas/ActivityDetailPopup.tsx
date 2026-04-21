import { MessageSquare, Pencil, Trash2, UserRound, X } from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import {
  useActivityComments,
  useCreateActivityComment,
  useDeleteActivityComment,
  useUpdateActivityComment,
  useUpsertActivity,
} from '../../api/activities'
import {
  useActivityTools,
  useCreateITTool,
  useITTools,
  useLinkActivityTool,
  useUnlinkActivityTool,
} from '../../api/activityResources'
import {
  useCreateOrganizationRole,
  useOrganizationRoles,
} from '../../api/organizationRoles'
import { useOrganizationMembers } from '../../api/organizations'
import type { Activity, ActivityType, CanvasEdge, CanvasObject, CatalogRole, ITTool } from '../../types'
import { deriveActivityDataObjects } from './canvasData'
import { CustomChoiceList } from '../ui/CustomChoiceList'
import { activityTypeOptions } from './activityTypeOptions'
import { buildCatalogRoleChoiceOptions } from '../../lib/catalogRoles'
import { RoleCreateForm } from '../roles/RoleCreateForm'

export interface ActivityDetailPopupHandle {
  saveIfDirty: (options?: { closeAfterSave?: boolean }) => Promise<boolean>
}

export const ActivityDetailPopup = forwardRef<ActivityDetailPopupHandle, {
  activity: Activity
  workspaceId: string
  organizationId: string
  currentUserId: string
  canvasObjects: CanvasObject[]
  canvasEdges: CanvasEdge[]
  connectionCount: number
  onDelete: () => void
  onClose: () => void
}>(function ActivityDetailPopup({
  activity,
  workspaceId,
  organizationId,
  currentUserId,
  canvasObjects,
  canvasEdges,
  onDelete,
  onClose,
}, ref) {
  const [label, setLabel] = useState(activity.label)
  const [activityType, setActivityType] = useState<ActivityType | null>(activity.activity_type ?? 'unbestimmt')
  const [description, setDescription] = useState(activity.description ?? '')
  const [notes, setNotes] = useState(activity.notes ?? '')
  const [assigneeLabel, setAssigneeLabel] = useState(activity.assignee_label ?? '')
  const [selectedRoleId, setSelectedRoleId] = useState(activity.role_id ?? '')
  const [selectedToolId, setSelectedToolId] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentBody, setEditingCommentBody] = useState('')
  const [optimisticLinkedTools, setOptimisticLinkedTools] = useState<ITTool[]>([])
  const [optimisticCatalogTools, setOptimisticCatalogTools] = useState<ITTool[]>([])
  const [optimisticCatalogRoles, setOptimisticCatalogRoles] = useState<CatalogRole[]>([])
  const [optimisticUnlinkedToolIds, setOptimisticUnlinkedToolIds] = useState<string[]>([])
  const [saveError, setSaveError] = useState<string | null>(null)

  const upsertActivity = useUpsertActivity(workspaceId)
  const { data: tools = [] } = useActivityTools(workspaceId, activity.id)
  const { data: availableTools = [] } = useITTools(workspaceId)
  const createITTool = useCreateITTool(workspaceId)
  const linkTool = useLinkActivityTool(workspaceId, activity.id)
  const unlinkTool = useUnlinkActivityTool(workspaceId, activity.id)
  const { data: organizationRoles = [] } = useOrganizationRoles(organizationId)
  const createOrganizationRole = useCreateOrganizationRole(organizationId)
  const { data: organizationMembers = [] } = useOrganizationMembers(organizationId)
  const { data: comments = [] } = useActivityComments(workspaceId, activity.id)
  const createComment = useCreateActivityComment(workspaceId, activity.id)
  const updateComment = useUpdateActivityComment(workspaceId, activity.id)
  const deleteComment = useDeleteActivityComment(workspaceId, activity.id)

  const dataObjects = useMemo(() => deriveActivityDataObjects(activity, canvasEdges, canvasObjects), [activity, canvasEdges, canvasObjects])
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
  const visibleCatalogRoles = useMemo(
    () => Array.from(new Map([...organizationRoles, ...optimisticCatalogRoles].map((role) => [role.id, role])).values()),
    [optimisticCatalogRoles, organizationRoles],
  )
  const roleChoiceOptions = useMemo(
    () => buildCatalogRoleChoiceOptions(visibleCatalogRoles),
    [visibleCatalogRoles],
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

  useEffect(() => {
    setLabel(activity.label)
    setActivityType(activity.activity_type ?? 'unbestimmt')
    setDescription(activity.description ?? '')
    setNotes(activity.notes ?? '')
    setAssigneeLabel(activity.assignee_label ?? '')
    setSelectedRoleId(activity.role_id ?? '')
    setSaveError(null)
  }, [activity])

  const isDirty = useMemo(
    () =>
      label !== activity.label ||
      activityType !== activity.activity_type ||
      description !== (activity.description ?? '') ||
      notes !== (activity.notes ?? '') ||
      assigneeLabel !== (activity.assignee_label ?? '') ||
      selectedRoleId !== (activity.role_id ?? ''),
    [activity, activityType, assigneeLabel, description, label, notes, selectedRoleId],
  )

  async function persistChanges(closeAfterSave: boolean) {
    if (!isDirty) {
      setSaveError(null)
      if (closeAfterSave) {
        onClose()
      }
      return true
    }

    try {
      setSaveError(null)
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
        activity_type: activityType ?? 'unbestimmt',
        description,
        notes,
        assignee_label: assigneeLabel.trim() || null,
        role_id: selectedRoleId || null,
        duration_minutes: activity.duration_minutes ?? null,
      })

      if (closeAfterSave) {
        onClose()
      }
      return true
    } catch {
      setSaveError('Aktivitaet konnte nicht gespeichert werden.')
      return false
    }
  }

  useImperativeHandle(ref, () => ({
    saveIfDirty: ({ closeAfterSave = false } = {}) => persistChanges(closeAfterSave),
  }), [persistChanges])

  async function handleSave() {
    await persistChanges(true)
  }

  async function handleClose() {
    await persistChanges(true)
  }

  async function handleDelete() {
    await onDelete()
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

  async function handleCreateRole(input: { label: string; description: string; acronym?: string | null }) {
    const role = await createOrganizationRole.mutateAsync({
      label: input.label.trim(),
      acronym: input.acronym?.trim() || null,
      description: input.description.trim() || null,
    })
    setOptimisticCatalogRoles((current) => [...current.filter((entry) => entry.id !== role.id), role])
    setSelectedRoleId(role.id)
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
        className="wow-ui-dialog pointer-events-auto max-h-[calc(100%-2rem)] w-full max-w-2xl overflow-auto p-6"
      >
        <div className="flex items-start justify-between border-b border-[var(--wow-panel-border)] pb-4">
          <div>
            <p className="wow-ui-eyebrow">Aktivitaet</p>
            <input
              data-testid="activity-detail-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              className="wow-ui-input mt-2 text-2xl font-semibold"
            />
          </div>
          <button type="button" onClick={() => void handleClose()} className="wow-ui-icon-button">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-5 text-sm text-[var(--text)]">
          {saveError ? (
            <div className="rounded-[var(--wow-panel-radius)] border border-[rgba(186,26,26,0.18)] bg-[rgba(186,26,26,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
              {saveError}
            </div>
          ) : null}
          <section>
            <p className="wow-ui-label">Aktivitaetstyp</p>
            <div className="mt-3 grid gap-2">
              {activityTypeOptions.map((type) => {
                const Icon = type.icon
                return (
                  <label
                    key={type.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-[var(--wow-panel-radius)] border px-4 py-3 ${
                      activityType === type.value
                        ? 'border-[var(--wow-primary)] bg-[var(--wow-primary-soft)] text-[var(--wow-primary)]'
                        : 'border-[var(--wow-panel-border)] bg-[var(--wow-secondary-soft)] text-[var(--text)]'
                    }`}
                  >
                    <input
                      data-testid={`activity-type-${type.value}`}
                      type="radio"
                      name="activity-type"
                      checked={activityType === type.value}
                      onChange={() => setActivityType(type.value)}
                      className="mt-1"
                    />
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">{type.description}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="wow-ui-label">Ausfuehrende(r)</p>
              <input
                data-testid="activity-assignee-input"
                value={assigneeLabel}
                onChange={(event) => setAssigneeLabel(event.target.value)}
                placeholder="z. B. AG BIM-Koordinator"
                className="wow-ui-input mt-2"
              />
            </div>
            <div>
              <p className="wow-ui-label">Rolle</p>
              <div className="mt-2">
                <CustomChoiceList
                  testId="activity-role-select"
                  value={selectedRoleId}
                  options={roleChoiceOptions}
                  placeholder="Rolle festlegen"
                  allowClear
                  clearLabel="Ohne Rolle"
                  clearDescription="Es wird keine fachliche Rolle gesetzt."
                  searchable
                  searchPlaceholder="Rolle suchen"
                  creatable
                  createLabel="Neue Rolle anlegen"
                  createPrimaryLabel="Rollenname"
                  createPrimaryPlaceholder="z. B. BIM-Koordination"
                  createSecondaryLabel="Beschreibung"
                  createSecondaryPlaceholder="Optional: kurze Beschreibung"
                  onSelect={setSelectedRoleId}
                  onCreate={(input) => handleCreateRole({ label: input.label, description: input.description, acronym: input.tertiary })}
                  renderCreateForm={({ label, tertiary, description, isCreating, setLabel, setTertiary, setDescription, submit, cancel, testId }) => (
                    <RoleCreateForm
                      label={label}
                      acronym={tertiary}
                      description={description}
                      isSubmitting={isCreating}
                      nameTestId={`${testId}-create-name`}
                      acronymTestId={`${testId}-create-acronym`}
                      descriptionTestId={`${testId}-create-description`}
                      submitTestId={`${testId}-create-submit`}
                      cancelTestId={`${testId}-create-cancel`}
                      onLabelChange={setLabel}
                      onAcronymChange={setTertiary}
                      onDescriptionChange={setDescription}
                      onSubmit={submit}
                      onCancel={cancel}
                    />
                  )}
                />
              </div>
            </div>
          </section>

          <section>
            <p className="wow-ui-label">Beschreibung</p>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="wow-ui-textarea mt-2" />
          </section>

          <section>
            <p className="wow-ui-label">Notizen</p>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="wow-ui-textarea mt-2" />
          </section>

          <section className="grid grid-cols-2 gap-4">
            <div className="wow-ui-section p-4">
              <p className="wow-ui-label">Eingaben</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {dataObjects.incoming.length > 0 ? (
                  dataObjects.incoming.map((canvasObject) => (
                    <span key={canvasObject.id} className="wow-ui-chip border-[rgba(12,86,208,0.18)] bg-[var(--wow-primary-soft)] text-[var(--wow-primary)]">
                      {canvasObject.name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-[var(--muted)]">Keine eingehenden Datenobjekte</span>
                )}
              </div>
            </div>
            <div className="wow-ui-section p-4">
              <p className="wow-ui-label">Ergebnisse</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {dataObjects.outgoing.length > 0 ? (
                  dataObjects.outgoing.map((canvasObject) => (
                    <span key={canvasObject.id} className="wow-ui-chip border-[rgba(76,97,108,0.18)] bg-[rgba(76,97,108,0.08)] text-[var(--text)]">
                      {canvasObject.name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-[var(--muted)]">Keine ausgehenden Datenobjekte</span>
                )}
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <p className="wow-ui-label">IT-Tools</p>
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
                    className="wow-ui-chip"
                  >
                    {tool.name} x
                  </button>
                ))
              ) : (
                <span className="text-sm text-[var(--muted)]">Noch kein IT-Tool verlinkt</span>
              )}
            </div>
            <div className="mt-3 flex gap-3">
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
                className="wow-ui-button-secondary disabled:opacity-40"
              >
                Verlinken
              </button>
            </div>
          </section>

          <section className="wow-ui-section p-4">
            <div className="flex items-center justify-between">
              <p className="wow-ui-label">Kommentare</p>
              <MessageSquare className="h-4 w-4 text-[var(--muted)]" />
            </div>
            <div className="mt-3 space-y-3">
              {comments.length > 0 ? (
                comments.map((comment) => {
                  const isEditing = editingCommentId === comment.id
                  const isOwnComment = comment.author_user_id === currentUserId
                  const author = organizationMembers.find((member) => member.user_id === comment.author_user_id)
                  return (
                    <div key={comment.id} className="wow-ui-card p-3">
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingCommentBody}
                            onChange={(event) => setEditingCommentBody(event.target.value)}
                            rows={2}
                            className="wow-ui-textarea"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(null)
                                setEditingCommentBody('')
                              }}
                              className="wow-ui-button-secondary min-h-0 px-3 py-1.5 text-xs"
                            >
                              Abbrechen
                            </button>
                            <button
                              type="button"
                              data-testid={`activity-comment-save-${comment.id}`}
                              onClick={() => void handleSaveComment()}
                              className="wow-ui-button-primary min-h-0 px-3 py-1.5 text-xs"
                            >
                              Speichern
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm text-[var(--text)]">{comment.body}</div>
                            <div className="mt-1 text-xs text-[var(--muted)]">
                              {author?.display_name ?? author?.email ?? 'Unbekannt'} | {new Date(comment.created_at).toLocaleString()}
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
                                className="wow-ui-icon-button p-2"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                data-testid={`activity-comment-delete-${comment.id}`}
                                onClick={() => void deleteComment.mutateAsync(comment.id)}
                                className="wow-ui-icon-button border-[rgba(186,26,26,0.18)] bg-[rgba(186,26,26,0.08)] text-[var(--danger)]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-[var(--muted)]">Noch keine Kommentare.</p>
              )}
            </div>
            <div className="mt-3 flex gap-3">
              <textarea
                data-testid="activity-comment-input"
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                rows={2}
                placeholder="Kommentar verfassen"
                className="wow-ui-textarea flex-1"
              />
              <button
                type="button"
                data-testid="activity-comment-submit"
                onClick={() => void handleCreateComment()}
                disabled={!commentDraft.trim()}
                className="wow-ui-button-primary self-end disabled:opacity-40"
              >
                Hinzufuegen
              </button>
            </div>
          </section>
        </div>

        <div className="mt-6 flex justify-between gap-3">
          <button data-testid="activity-detail-delete" onClick={() => void handleDelete()} className="wow-ui-button-danger">
            <Trash2 className="h-4 w-4" /> Loeschen
          </button>
          <div className="flex gap-3">
            <button onClick={() => void handleClose()} className="wow-ui-button-secondary">Abbrechen</button>
            <button data-testid="activity-detail-save" onClick={() => void handleSave()} className="wow-ui-button-primary disabled:opacity-40">Speichern</button>
          </div>
        </div>
      </div>
    </div>
  )
})
