import { useMemo, useState } from 'react'
import { Download, FolderKanban, LogOut, Search, Settings2, Users } from 'lucide-react'
import type { CanvasGroupingMode } from '../../types'

export interface CanvasSearchOption {
  id: string
  label: string
  kind: 'activity' | 'gateway' | 'source'
  subtitle: string
}

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
  onExportPng: () => void
  onExportPdf: () => void
  onOpenTransportSettings?: () => void
  groupingMode: CanvasGroupingMode
  onToggleGroupingMode: () => void
  canvasSearchOptions: CanvasSearchOption[]
  onSelectCanvasSearchResult: (nodeId: string) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

export function AppHeader({
  workspaceName,
  workspaceTrail,
  onResetRoot,
  onNavigateWorkspaceTrail,
  onLeaveWorkspace,
  onSignOut,
  onExportPng,
  onExportPdf,
  onOpenTransportSettings,
  groupingMode,
  onToggleGroupingMode,
  canvasSearchOptions,
  onSelectCanvasSearchResult,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: AppHeaderProps) {
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [canvasSearch, setCanvasSearch] = useState('')

  const filteredCanvasResults = useMemo(() => {
    const normalizedQuery = canvasSearch.trim().toLocaleLowerCase('de')
    if (!normalizedQuery) {
      return []
    }

    return canvasSearchOptions
      .filter((option) => `${option.label} ${option.subtitle}`.toLocaleLowerCase('de').includes(normalizedQuery))
      .slice(0, 6)
  }, [canvasSearch, canvasSearchOptions])

  return (
    <header className="flex min-h-14 flex-col gap-3 border-b border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300 print:hidden">
      <div className="relative z-10 flex min-w-0 items-center gap-3 overflow-hidden">
        <button
          data-testid="toolbar-back-to-workspaces"
          onClick={onLeaveWorkspace}
          className="shrink-0 text-[11px] uppercase tracking-[0.36em] text-slate-500"
        >
          Arbeitsablaeufe
        </button>
        <span className="shrink-0 text-slate-700">|</span>
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex min-w-max items-center gap-2 pr-2">
        {workspaceTrail.length === 0 ? (
          <button onClick={onResetRoot} className="inline-flex min-w-0 items-center gap-2 font-medium text-cyan-300">
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
                className={`inline-flex min-w-0 items-center gap-2 rounded-full px-2 py-1 ${
                  index === workspaceTrail.length - 1 ? 'bg-cyan-400/10 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FolderKanban className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.workspaceName}</span>
              </button>
              {item.viaActivityLabel ? <span className="max-w-[180px] truncate text-xs text-slate-500">{item.viaActivityLabel}</span> : null}
            </div>
          ))
        )}
          </div>
        </div>
      </div>
      <div className="relative z-0 flex flex-wrap items-center justify-end gap-2">
        <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-1">
          <button
            data-testid="toolbar-undo"
            onClick={onUndo}
            disabled={!canUndo}
            className="rounded-full px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Rueckgaengig
          </button>
          <button
            data-testid="toolbar-redo"
            onClick={onRedo}
            disabled={!canRedo}
            className="rounded-full px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Wiederholen
          </button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            data-testid="toolbar-canvas-search"
            value={canvasSearch}
            onChange={(event) => setCanvasSearch(event.target.value)}
            placeholder="Im Canvas suchen"
            className="w-44 rounded-full border border-white/10 bg-white/5 py-1.5 pl-9 pr-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/30 lg:w-52 xl:w-56"
          />
          {filteredCanvasResults.length > 0 ? (
            <div
              data-testid="toolbar-canvas-search-results"
              className="absolute right-0 top-[calc(100%+10px)] z-30 w-80 rounded-2xl border border-white/10 bg-slate-950/96 p-2 shadow-[0_20px_70px_rgba(2,8,12,0.55)]"
            >
              {filteredCanvasResults.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  data-testid={`toolbar-canvas-search-option-${option.id}`}
                  onClick={() => {
                    onSelectCanvasSearchResult(option.id)
                    setCanvasSearch('')
                  }}
                  className="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2 text-left text-slate-200 transition hover:bg-white/10"
                >
                  <span>
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="mt-1 block text-xs text-slate-500">{option.subtitle}</span>
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    {option.kind === 'activity' ? 'Aktivitaet' : option.kind === 'gateway' ? 'Gateway' : 'Datenspeicher'}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button
          data-testid="toolbar-grouping-toggle"
          onClick={onToggleGroupingMode}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition ${
            groupingMode === 'role_lanes'
              ? 'border-cyan-300/25 bg-cyan-400/10 text-cyan-100'
              : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10'
          }`}
        >
          <Users className="h-4 w-4" />
          {groupingMode === 'role_lanes' ? 'Nach Rollen gruppieren' : 'Ohne Gruppierung'}
        </button>
        {onOpenTransportSettings ? (
          <button
            data-testid="toolbar-settings"
            onClick={onOpenTransportSettings}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-200 transition hover:border-white/20 hover:bg-white/10"
          >
            <Settings2 className="h-4 w-4" /> Einstellungen
          </button>
        ) : null}
        <div className="relative">
          <button
            data-testid="toolbar-export"
            onClick={() => setIsExportOpen((current) => !current)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-200 transition hover:border-white/20 hover:bg-white/10"
          >
            <Download className="h-4 w-4" /> Export
          </button>
          {isExportOpen ? (
            <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-52 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-[0_20px_70px_rgba(2,8,12,0.55)]">
              <button
                data-testid="export-png"
                onClick={() => {
                  setIsExportOpen(false)
                  onExportPng()
                }}
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/10"
              >
                Als PNG speichern
              </button>
              <button
                data-testid="export-pdf"
                onClick={() => {
                  setIsExportOpen(false)
                  onExportPdf()
                }}
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/10"
              >
                Als PDF drucken
              </button>
            </div>
          ) : null}
        </div>
        <button
          onClick={onSignOut}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300 transition hover:border-white/20 hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" /> Abmelden
        </button>
      </div>
    </header>
  )
}
