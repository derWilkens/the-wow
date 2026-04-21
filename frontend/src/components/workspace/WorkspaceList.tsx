import { BookmarkPlus, ChevronDown, ChevronRight, FolderKanban, Pencil, Plus, RefreshCcw, Search, Sparkles, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useCreateWorkflowTemplate, useCreateWorkspaceFromTemplate, useDeleteWorkflowTemplate, useUpdateWorkflowTemplate, useWorkflowTemplates } from '../../api/workflowTemplates'
import { useOrganizations } from '../../api/organizations'
import { useCreateWorkspace, useDeleteWorkspace, useWorkspaces } from '../../api/workspaces'
import { useCanvasStore } from '../../store/canvasStore'
import type { Organization, WorkflowTemplate, Workspace } from '../../types'
import {
  buildWorkspacePath,
  buildWorkspaceTree,
  collectExpandedIdsForSearch,
  countDescendantWorkspaces,
  matchesWorkspaceSearch,
  type WorkspaceTreeNode,
} from './workspaceTree'

export function WorkspaceList() {
  const {
    organizationId,
    organizationName,
    openWorkspace,
    openWorkspacePath,
    selectOrganization,
  } = useCanvasStore()
  const { data: organizations = [] } = useOrganizations()
  const { data: workspaces = [], isLoading, refetch } = useWorkspaces(organizationId)
  const { data: templates = [] } = useWorkflowTemplates(organizationId)
  const createWorkspace = useCreateWorkspace(organizationId)
  const createWorkspaceFromTemplate = useCreateWorkspaceFromTemplate(organizationId)
  const createWorkflowTemplate = useCreateWorkflowTemplate(organizationId)
  const updateWorkflowTemplate = useUpdateWorkflowTemplate(organizationId)
  const deleteWorkflowTemplate = useDeleteWorkflowTemplate(organizationId)
  const deleteWorkspace = useDeleteWorkspace(organizationId)
  const [name, setName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const [createMode, setCreateMode] = useState<'blank' | 'template'>('blank')
  const [templateSearch, setTemplateSearch] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [templateDialog, setTemplateDialog] = useState<{ workspaceId: string; workspaceName: string } | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateEditDialog, setTemplateEditDialog] = useState<WorkflowTemplate | null>(null)
  const [templateEditName, setTemplateEditName] = useState('')
  const [templateEditDescription, setTemplateEditDescription] = useState('')

  const workspaceTree = useMemo(() => buildWorkspaceTree(workspaces), [workspaces])
  const rootWorkspaces = useMemo(() => workspaceTree.map((node) => node.workspace), [workspaceTree])
  const descendantCounts = useMemo(
    () => new Map(workspaceTree.map((node) => [node.workspace.id, countDescendantWorkspaces(node)])),
    [workspaceTree],
  )
  const forcedExpandedIds = useMemo(() => collectExpandedIdsForSearch(workspaceTree, search), [workspaceTree, search])
  const filteredTemplates = useMemo(
    () =>
      templates.filter((template) =>
        `${template.name} ${template.description ?? ''}`
          .toLocaleLowerCase('de')
          .includes(templateSearch.trim().toLocaleLowerCase('de')),
      ),
    [templateSearch, templates],
  )

  useEffect(() => {
    setExpandedIds((current) => {
      const next = new Set(current)
      for (const node of workspaceTree) {
        next.add(node.workspace.id)
      }
      return [...next]
    })
  }, [workspaceTree])

  async function handleCreate() {
    if (!name.trim()) {
      return
    }
    setCreateError(null)

    try {
      const workspace =
        createMode === 'template' && selectedTemplateId
          ? await createWorkspaceFromTemplate.mutateAsync({ template_id: selectedTemplateId, name })
          : await createWorkspace.mutateAsync(name)
      setName('')
      setSelectedTemplateId('')
      openWorkspace(workspace.id, workspace.name)
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Arbeitsablauf konnte nicht erstellt werden.')
    }
  }

  async function handleDelete(workspaceId: string, workspaceName: string) {
    setDeleteError(null)
    const confirmed = window.confirm(`Arbeitsablauf "${workspaceName}" inklusive aller Modelle löschen?`)
    if (!confirmed) {
      return
    }

    try {
      await deleteWorkspace.mutateAsync(workspaceId)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Arbeitsablauf konnte nicht gelöscht werden.')
    }
  }

  async function handleSaveTemplate() {
    if (!templateDialog || !templateName.trim()) {
      return
    }

    setTemplateError(null)

    try {
      await createWorkflowTemplate.mutateAsync({
        source_workspace_id: templateDialog.workspaceId,
        name: templateName.trim(),
        description: templateDescription.trim() || null,
      })
      setTemplateDialog(null)
      setTemplateName('')
      setTemplateDescription('')
    } catch (error) {
      setTemplateError(error instanceof Error ? error.message : 'Vorlage konnte nicht gespeichert werden.')
    }
  }

  async function handleUpdateTemplate() {
    if (!templateEditDialog || !templateEditName.trim()) {
      return
    }

    setTemplateError(null)

    try {
      await updateWorkflowTemplate.mutateAsync({
        template_id: templateEditDialog.id,
        name: templateEditName.trim(),
        description: templateEditDescription.trim() || null,
      })
      setTemplateEditDialog(null)
      setTemplateEditName('')
      setTemplateEditDescription('')
    } catch (error) {
      setTemplateError(error instanceof Error ? error.message : 'Vorlage konnte nicht aktualisiert werden.')
    }
  }

  async function handleDeleteTemplate(template: WorkflowTemplate) {
    setTemplateError(null)
    const confirmed = window.confirm(`Vorlage "${template.name}" loeschen?`)
    if (!confirmed) {
      return
    }

    try {
      await deleteWorkflowTemplate.mutateAsync(template.id)
    } catch (error) {
      setTemplateError(error instanceof Error ? error.message : 'Vorlage konnte nicht geloescht werden.')
    }
  }

  function toggleExpanded(workspaceId: string) {
    setExpandedIds((current) =>
      current.includes(workspaceId) ? current.filter((id) => id !== workspaceId) : [...current, workspaceId],
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] flex-col px-4 py-6">
      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Project Workspace</p>
          <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.02em] text-slate-900">Arbeitsablauf auswaehlen</h1>
          {organizationName ? <p className="mt-1 text-sm text-slate-500">Aktive Firma: {organizationName}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          {organizations.length > 1 ? (
            <select
              value={organizationId ?? ''}
              onChange={(event) => {
                const selectedOrganization = organizations.find((organization: Organization) => organization.id === event.target.value)
                if (selectedOrganization) {
                  selectOrganization(selectedOrganization.id, selectedOrganization.name, selectedOrganization.membership_role)
                }
              }}
              className="wow-engineering-select px-3 py-2 text-sm outline-none"
            >
              {organizations.map((organization: Organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          ) : null}
          <button onClick={() => void refetch()} className="wow-engineering-button-secondary inline-flex items-center gap-2 px-3 py-2 text-sm">
            <RefreshCcw className="h-4 w-4" /> Aktualisieren
          </button>
        </div>
      </div>

      <div className="wow-engineering-panel mt-6 rounded-lg p-4">
        <div className="mb-4 inline-flex rounded border border-slate-200 bg-white p-1">
          <button
            type="button"
            data-testid="workspace-create-mode-blank"
            onClick={() => setCreateMode('blank')}
            className={`rounded px-3 py-1.5 text-sm ${createMode === 'blank' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
          >
            Leerer Arbeitsablauf
          </button>
          <button
            type="button"
            data-testid="workspace-create-mode-template"
            onClick={() => setCreateMode('template')}
            className={`rounded px-3 py-1.5 text-sm ${createMode === 'template' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
          >
            Aus Vorlage
          </button>
        </div>
        <div className="flex gap-3">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name des Arbeitsablaufs" className="wow-engineering-input flex-1 px-3 py-2.5 outline-none" />
          <button
            onClick={() => void handleCreate()}
            disabled={createWorkspace.isPending || createWorkspaceFromTemplate.isPending || (createMode === 'template' && !selectedTemplateId)}
            className="wow-engineering-button-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {createMode === 'template' ? 'Aus Vorlage starten' : 'Anlegen'}
          </button>
        </div>
        {createMode === 'template' ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                data-testid="workspace-template-search"
                value={templateSearch}
                onChange={(event) => setTemplateSearch(event.target.value)}
                placeholder="Vorlage suchen"
                className="wow-engineering-input w-full py-2.5 pl-10 pr-4 outline-none"
              />
            </div>
            <div className="mt-3 grid gap-2">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`rounded-md border px-4 py-3 ${
                    selectedTemplateId === template.id
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      data-testid={`workspace-template-option-${template.id}`}
                      onClick={() => setSelectedTemplateId(template.id)}
                      className="flex-1 text-left text-[var(--text)]"
                    >
                      <div className="font-medium text-slate-900">{template.name}</div>
                      <div className="mt-1 text-sm text-slate-500">{template.description ?? 'Ohne Beschreibung'}</div>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs ${template.is_system ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                        {template.is_system ? 'Standard' : 'Eigene Vorlage'}
                      </span>
                      {!template.is_system ? (
                        <>
                          <button
                            type="button"
                            data-testid={`workspace-template-edit-${template.id}`}
                            onClick={() => {
                              setTemplateEditDialog(template)
                              setTemplateEditName(template.name)
                              setTemplateEditDescription(template.description ?? '')
                            }}
                            className="wow-engineering-button-secondary rounded p-2"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            data-testid={`workspace-template-delete-${template.id}`}
                            onClick={() => void handleDeleteTemplate(template)}
                            className="rounded border border-rose-200 bg-rose-50 p-2 text-rose-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {filteredTemplates.length === 0 ? (
                <p className="text-sm text-slate-500">Keine passende Vorlage gefunden.</p>
              ) : null}
            </div>
          </div>
        ) : null}
        {createError ? <p className="mt-3 text-sm text-rose-200">{createError}</p> : null}
        {deleteError ? <p className="mt-3 text-sm text-rose-200">{deleteError}</p> : null}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.9fr]">
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">Hauptabläufe</p>
              <p className="mt-1 text-sm text-slate-400">Die oberste Ebene bleibt als Kartenansicht sichtbar.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {rootWorkspaces.map((workspace) => (
              <div data-testid={`workspace-card-${workspace.id}`} key={workspace.id} className="wow-engineering-card rounded-lg p-5 transition hover:border-slate-300">
                <div className="flex items-start justify-between gap-3">
                  <button data-testid={`workspace-open-${workspace.id}`} onClick={() => openWorkspace(workspace.id, workspace.name)} className="flex-1 text-left text-[var(--text)]">
                    <div className="inline-flex rounded-md border border-blue-200 bg-blue-50 p-2 text-blue-700">
                      <FolderKanban className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 text-xl font-semibold text-slate-900">{workspace.name}</h2>
                    <p className="mt-2 text-sm text-slate-500">Erstellt {new Date(workspace.created_at).toLocaleString()}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                      {descendantCounts.get(workspace.id) ?? 0} Detailabläufe in der Hierarchie
                    </p>
                  </button>
                  <button
                    data-testid={`workspace-delete-${workspace.id}`}
                    onClick={() => void handleDelete(workspace.id, workspace.name)}
                    disabled={deleteWorkspace.isPending}
                    className="inline-flex items-center gap-2 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" /> Löschen
                  </button>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    data-testid={`workspace-save-template-${workspace.id}`}
                    onClick={() => {
                      setTemplateDialog({ workspaceId: workspace.id, workspaceName: workspace.name })
                      setTemplateName(`${workspace.name} Vorlage`)
                      setTemplateDescription('')
                    }}
                    className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                  >
                    <BookmarkPlus className="h-4 w-4" /> Als Vorlage speichern
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="wow-engineering-panel rounded-lg p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">Ablaufhierarchie</p>
              <p className="mt-1 text-sm text-slate-400">Fuer viele Detailablaeufe und tiefe Ebenen ist der Explorer der schnellste Weg.</p>
            </div>
          </div>
          <div className="mt-4 relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Arbeitsablauf suchen"
              className="wow-engineering-input w-full py-2.5 pl-10 pr-4 outline-none"
            />
          </div>

          <div className="mt-4 max-h-[60vh] overflow-auto pr-1">
            {workspaceTree.length > 0 ? (
              <div className="space-y-2">
                {workspaceTree.map((node) => (
                  <WorkspaceTreeItem
                    key={node.workspace.id}
                    node={node}
                    search={search}
                    expandedIds={expandedIds}
                    forcedExpandedIds={forcedExpandedIds}
                    onToggle={toggleExpanded}
                    onOpen={(workspace) => openWorkspacePath(buildWorkspacePath(workspaces, workspace))}
                  />
                ))}
              </div>
            ) : null}

            {!isLoading && workspaces.length === 0 ? <p className="wow-ui-subtitle mt-2">Noch keine Arbeitsablaeufe. Lege den ersten Ablauf an, um das Canvas zu starten.</p> : null}
          </div>
        </section>
      </div>

      {templateDialog ? (
        <div className="wow-overlay-scrim fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="wow-ui-dialog w-full max-w-lg p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="wow-ui-eyebrow">Vorlage</p>
                <h2 className="wow-ui-title mt-2">Arbeitsablauf als Vorlage speichern</h2>
                <p className="wow-ui-subtitle mt-2">{templateDialog.workspaceName} wird als wiederverwendbare Vorlage gesichert.</p>
              </div>
              <button
                type="button"
                data-testid="workspace-template-dialog-close"
                onClick={() => setTemplateDialog(null)}
                className="wow-ui-icon-button p-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid gap-3">
              <input
                data-testid="workspace-template-name"
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="Name der Vorlage"
                className="wow-ui-input"
              />
              <textarea
                data-testid="workspace-template-description"
                value={templateDescription}
                onChange={(event) => setTemplateDescription(event.target.value)}
                rows={3}
                placeholder="Beschreibung"
                className="wow-ui-input"
              />
            </div>
            {templateError ? <p className="mt-3 text-sm text-rose-200">{templateError}</p> : null}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setTemplateDialog(null)}
                className="wow-ui-button-secondary"
              >
                Abbrechen
              </button>
              <button
                type="button"
                data-testid="workspace-template-save"
                onClick={() => void handleSaveTemplate()}
                disabled={!templateName.trim() || createWorkflowTemplate.isPending}
                className="wow-ui-button-primary disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                Vorlage speichern
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {templateEditDialog ? (
        <div className="wow-overlay-scrim fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="wow-ui-dialog w-full max-w-lg p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="wow-ui-eyebrow">Vorlage bearbeiten</p>
                <h2 className="wow-ui-title mt-2">Vorlage aktualisieren</h2>
                <p className="wow-ui-subtitle mt-2">Passe Name und Beschreibung der Vorlage an.</p>
              </div>
              <button
                type="button"
                data-testid="workspace-template-edit-close"
                onClick={() => setTemplateEditDialog(null)}
                className="wow-ui-icon-button p-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid gap-3">
              <input
                data-testid="workspace-template-edit-name"
                value={templateEditName}
                onChange={(event) => setTemplateEditName(event.target.value)}
                placeholder="Name der Vorlage"
                className="wow-ui-input"
              />
              <textarea
                data-testid="workspace-template-edit-description"
                value={templateEditDescription}
                onChange={(event) => setTemplateEditDescription(event.target.value)}
                rows={3}
                placeholder="Beschreibung"
                className="wow-ui-input"
              />
            </div>
            {templateError ? <p className="mt-3 text-sm text-rose-200">{templateError}</p> : null}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setTemplateEditDialog(null)}
                className="wow-ui-button-secondary"
              >
                Abbrechen
              </button>
              <button
                type="button"
                data-testid="workspace-template-edit-save"
                onClick={() => void handleUpdateTemplate()}
                disabled={!templateEditName.trim() || updateWorkflowTemplate.isPending}
                className="wow-ui-button-primary disabled:opacity-50"
              >
                <Pencil className="h-4 w-4" />
                Vorlage aktualisieren
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function WorkspaceTreeItem({
  node,
  search,
  expandedIds,
  forcedExpandedIds,
  onToggle,
  onOpen,
  level = 0,
}: {
  node: WorkspaceTreeNode
  search: string
  expandedIds: string[]
  forcedExpandedIds: Set<string>
  onToggle: (workspaceId: string) => void
  onOpen: (workspace: Workspace) => void
  level?: number
}) {
  if (!matchesWorkspaceSearch(node, search)) {
    return null
  }

  const isExpanded = expandedIds.includes(node.workspace.id) || forcedExpandedIds.has(node.workspace.id)
  const hasChildren = node.children.length > 0
  const childCount = countDescendantWorkspaces(node)

  return (
    <div data-testid={`workspace-tree-item-${node.workspace.id}`}>
      <div
        className="wow-ui-card flex items-center gap-2 px-3 py-2"
        style={{ marginLeft: `${level * 18}px` }}
      >
        <button
          type="button"
          onClick={() => hasChildren && onToggle(node.workspace.id)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 disabled:opacity-30"
          disabled={!hasChildren}
          aria-label={hasChildren ? `${isExpanded ? 'Zuklappen' : 'Aufklappen'} ${node.workspace.name}` : `${node.workspace.name} hat keine Unterabläufe`}
        >
          {hasChildren ? (isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <span className="text-xs">•</span>}
        </button>
        <button
          type="button"
          data-testid={`workspace-tree-open-${node.workspace.id}`}
          onClick={() => onOpen(node.workspace)}
          className="flex-1 text-left text-[var(--text)]"
        >
          <div className="font-medium text-[var(--text)]">{node.workspace.name}</div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            {childCount} Detailabläufe darunter
            {node.workspace.parent_workspace_id ? ' · Detailablauf' : ' · Hauptablauf'}
          </div>
        </button>
      </div>

      {hasChildren && isExpanded ? (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <WorkspaceTreeItem
              key={child.workspace.id}
              node={child}
              search={search}
              expandedIds={expandedIds}
              forcedExpandedIds={forcedExpandedIds}
              onToggle={onToggle}
              onOpen={onOpen}
              level={level + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}





