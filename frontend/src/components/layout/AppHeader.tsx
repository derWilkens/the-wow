import { FolderKanban, Info, LogOut, Settings2, Users } from 'lucide-react'
import type { CanvasGroupingMode, WorkflowViewMode } from '../../types'

interface AppHeaderProps {
  workspaceName: string
  workspaceTrail: Array<{
    workspaceId: string
    workspaceName: string
    viaActivityId: string | null
    viaActivityLabel: string | null
  }>
  onResetRoot: () => void
  onNavigateWorkspaceTrail: (workspaceId: string) => void
  onLeaveWorkspace: () => void
  onSignOut: () => void
  onOpenWorkflowDetails?: () => void
  onOpenSettings?: () => void
  showTableViewToggle: boolean
  workflowViewMode: WorkflowViewMode
  onWorkflowViewModeChange: (mode: WorkflowViewMode) => void
  groupingMode: CanvasGroupingMode
  showSwimlaneToggle: boolean
  onToggleGroupingMode: () => void
}

export function AppHeader({
  workspaceName,
  workspaceTrail,
  onResetRoot,
  onNavigateWorkspaceTrail,
  onLeaveWorkspace,
  onSignOut,
  onOpenWorkflowDetails,
  onOpenSettings,
  showTableViewToggle,
  workflowViewMode,
  onWorkflowViewModeChange,
  groupingMode,
  showSwimlaneToggle,
  onToggleGroupingMode,
}: AppHeaderProps) {
  return (
    <header className="wow-engineering-header flex min-h-12 flex-col gap-2 px-4 py-2 text-sm print:hidden">
      <div className="relative z-10 flex min-w-0 items-center gap-3 overflow-hidden">
        <button
          data-testid="toolbar-back-to-workspaces"
          onClick={onLeaveWorkspace}
          className="shrink-0 text-[11px] uppercase tracking-[0.28em] text-slate-500"
        >
          Arbeitsablaeufe
        </button>
        <span className="shrink-0 text-slate-300">/</span>
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex min-w-max items-center gap-2 pr-2">
        {workspaceTrail.length === 0 ? (
          <button onClick={onResetRoot} className="inline-flex min-w-0 items-center gap-2 font-medium text-slate-900">
            <FolderKanban className="h-4 w-4 shrink-0" />
            <span className="truncate">{workspaceName}</span>
          </button>
        ) : (
          workspaceTrail.map((item, index) => (
            <div key={item.workspaceId} className="flex min-w-0 items-center gap-2">
              {index > 0 ? <span className="text-slate-600">/</span> : null}
              <button
                type="button"
                data-testid={`workspace-trail-${item.workspaceId}`}
                onClick={() => onNavigateWorkspaceTrail(item.workspaceId)}
                className={`inline-flex min-w-0 items-center gap-2 rounded px-2 py-1 ${
                  index === workspaceTrail.length - 1 ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <FolderKanban className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.workspaceName}</span>
              </button>
              {item.viaActivityLabel ? <span className="max-w-[180px] truncate text-xs text-slate-400">{item.viaActivityLabel}</span> : null}
            </div>
          ))
        )}
          </div>
        </div>
      </div>
      <div className="relative z-0 flex flex-wrap items-center justify-end gap-1.5">
        {showTableViewToggle ? (
          <div className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1 py-1">
            <button
              data-testid="toolbar-view-canvas"
              onClick={() => onWorkflowViewModeChange('canvas')}
              className={`rounded px-3 py-1.5 text-xs transition ${
                workflowViewMode === 'canvas' ? 'wow-engineering-tab-active text-blue-700' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Zeichenmodus
            </button>
            <button
              data-testid="toolbar-view-sipoc"
              onClick={() => onWorkflowViewModeChange('sipoc_table')}
              className={`rounded px-3 py-1.5 text-xs transition ${
                workflowViewMode === 'sipoc_table' ? 'wow-engineering-tab-active text-blue-700' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Tabellarische View
            </button>
          </div>
        ) : null}
        {workflowViewMode === 'canvas' && showSwimlaneToggle ? (
          <button
            data-testid="toolbar-grouping-toggle"
            onClick={onToggleGroupingMode}
            className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 transition ${
              groupingMode === 'role_lanes'
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Users className="h-4 w-4" />
            {groupingMode === 'role_lanes' ? 'Nach Rollen gruppieren' : 'Ohne Gruppierung'}
          </button>
        ) : null}
        {onOpenWorkflowDetails ? (
          <button
            data-testid="toolbar-workflow-details"
            onClick={onOpenWorkflowDetails}
            className="wow-engineering-button-secondary inline-flex items-center gap-2 px-3 py-1.5 text-slate-700 transition"
          >
            <Info className="h-4 w-4" /> Ablaufdetails
          </button>
        ) : null}
        {onOpenSettings ? (
          <button
            data-testid="toolbar-settings"
            onClick={onOpenSettings}
            className="wow-engineering-button-secondary inline-flex items-center gap-2 px-3 py-1.5 text-slate-700 transition"
          >
            <Settings2 className="h-4 w-4" /> Einstellungen
          </button>
        ) : null}
        <button
          onClick={onSignOut}
          className="wow-engineering-button-ghost inline-flex items-center gap-2 px-3 py-1.5 transition"
        >
          <LogOut className="h-4 w-4" /> Abmelden
        </button>
      </div>
    </header>
  )
}
