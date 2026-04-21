import { useState, type ReactNode } from 'react'
import { Diamond, Play, PlusSquare, Radio, Redo2, Shapes, Split, Undo2 } from 'lucide-react'

interface FloatingCanvasToolbarProps {
  onInsertStart: () => void
  onInsertActivity: () => void
  onInsertDecision: () => void
  onInsertMerge: () => void
  onInsertEnd: () => void
  onInsertQuelle: () => void
  onInsertDatenobjekt: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  hasStart: boolean
  hasEnd: boolean
  onToolbarDragStart: (kind: 'start' | 'activity' | 'decision' | 'merge' | 'end' | 'quelle' | 'datenobjekt') => void
  dataObjectToolbarHint: string
}

export function FloatingCanvasToolbar({
  onInsertStart,
  onInsertActivity,
  onInsertDecision,
  onInsertMerge,
  onInsertEnd,
  onInsertQuelle,
  onInsertDatenobjekt,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  hasStart,
  hasEnd,
  onToolbarDragStart,
  dataObjectToolbarHint,
}: FloatingCanvasToolbarProps) {
  return (
    <aside
      data-testid="floating-canvas-toolbar"
      className="pointer-events-none absolute left-4 top-6 z-20 flex max-h-[calc(100%-12rem)] max-w-[calc(100%-2rem)] flex-col gap-2 md:left-6"
      aria-label="Canvas-Werkzeuge"
    >
      <div className="wow-toolbar-shell pointer-events-none overflow-x-visible overflow-y-auto rounded-[28px] border border-white/10 p-2 shadow-[0_24px_80px_rgba(2,8,12,0.45)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="pointer-events-none flex flex-col gap-2">
          <FloatingToolbarButton
            testId="toolbar-undo"
            label="Rueckgaengig"
            color="slate"
            icon={<Undo2 className="h-5 w-5 shrink-0" />}
            onClick={onUndo}
            disabled={!canUndo}
          />
          <FloatingToolbarButton
            testId="toolbar-redo"
            label="Wiederholen"
            color="slate"
            icon={<Redo2 className="h-5 w-5 shrink-0" />}
            onClick={onRedo}
            disabled={!canRedo}
          />
          <div className="wow-toolbar-divider mx-2 my-1 h-px" />
          <FloatingToolbarButton
            testId="toolbar-start"
            label="Start"
            color="green"
            icon={<Play className="h-5 w-5 shrink-0" />}
            onClick={onInsertStart}
            disabled={hasStart}
            dragKind="start"
            onDragStart={onToolbarDragStart}
          />
          <FloatingToolbarButton
            testId="toolbar-activity"
            label="Aktivitaet"
            color="blue"
            icon={<PlusSquare className="h-5 w-5 shrink-0" />}
            onClick={onInsertActivity}
            dragKind="activity"
            onDragStart={onToolbarDragStart}
          />
          <FloatingToolbarButton
            testId="toolbar-decision"
            label="Entscheidung"
            color="violet"
            icon={<Split className="h-5 w-5 shrink-0" />}
            onClick={onInsertDecision}
            dragKind="decision"
            onDragStart={onToolbarDragStart}
          />
          <FloatingToolbarButton
            testId="toolbar-merge"
            label="Zusammenfuehrung"
            color="indigo"
            icon={<Diamond className="h-5 w-5 shrink-0" />}
            onClick={onInsertMerge}
            dragKind="merge"
            onDragStart={onToolbarDragStart}
          />
          <FloatingToolbarButton
            testId="toolbar-end"
            label="Ende"
            color="red"
            icon={<Radio className="h-5 w-5 shrink-0" />}
            onClick={onInsertEnd}
            disabled={hasEnd}
            dragKind="end"
            onDragStart={onToolbarDragStart}
          />
          <div className="wow-toolbar-divider mx-2 my-1 h-px" />
          <FloatingToolbarButton
            testId="toolbar-source"
            label="Datenspeicher"
            color="cyan"
            icon={<Shapes className="h-5 w-5 shrink-0" />}
            onClick={onInsertQuelle}
            dragKind="quelle"
            onDragStart={onToolbarDragStart}
          />
          <FloatingToolbarButton
            testId="toolbar-data-object"
            label="Datenobjekt"
            color="amber"
            icon={<Shapes className="h-5 w-5 shrink-0" />}
            onClick={onInsertDatenobjekt}
          />
        </div>
      </div>
    </aside>
  )
}

function FloatingToolbarButton({
  testId,
  label,
  color,
  icon,
  onClick,
  disabled = false,
  dragKind,
  onDragStart,
}: {
  testId: string
  label: string
  color: 'green' | 'blue' | 'red' | 'cyan' | 'amber' | 'slate' | 'violet' | 'indigo'
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  dragKind?: 'start' | 'activity' | 'decision' | 'merge' | 'end' | 'quelle' | 'datenobjekt'
  onDragStart?: (kind: 'start' | 'activity' | 'decision' | 'merge' | 'end' | 'quelle' | 'datenobjekt') => void
}) {
  const palettes = {
    green: 'border-emerald-400/30 bg-emerald-400/14 text-emerald-100 hover:border-emerald-300/45 focus-visible:border-emerald-300/45',
    blue: 'border-sky-400/30 bg-sky-400/14 text-sky-100 hover:border-sky-300/45 focus-visible:border-sky-300/45',
    red: 'border-rose-400/30 bg-rose-400/14 text-rose-100 hover:border-rose-300/45 focus-visible:border-rose-300/45',
    cyan: 'border-cyan-400/30 bg-cyan-400/14 text-cyan-100 hover:border-cyan-300/45 focus-visible:border-cyan-300/45',
    amber: 'border-amber-400/30 bg-amber-400/14 text-amber-100 hover:border-amber-300/45 focus-visible:border-amber-300/45',
    slate: 'border-white/10 bg-white/[0.05] text-slate-100 hover:border-white/20 focus-visible:border-white/20',
    violet: 'border-violet-400/30 bg-violet-400/14 text-violet-100 hover:border-violet-300/45 focus-visible:border-violet-300/45',
    indigo: 'border-indigo-400/30 bg-indigo-400/14 text-indigo-100 hover:border-indigo-300/45 focus-visible:border-indigo-300/45',
  }

  const [isTooltipVisible, setIsTooltipVisible] = useState(false)

  return (
    <div className="pointer-events-auto relative">
      <button
        data-testid={testId}
        type="button"
        aria-label={label}
        disabled={disabled}
        draggable={!disabled && Boolean(dragKind)}
        onDragStart={(event) => {
          if (!dragKind) {
            return
          }

          event.dataTransfer.effectAllowed = 'copy'
          event.dataTransfer.setData('application/x-wow-toolbar-item', dragKind)
          onDragStart?.(dragKind)
        }}
        onClick={onClick}
        onMouseEnter={() => setIsTooltipVisible(true)}
        onMouseLeave={() => setIsTooltipVisible(false)}
        onFocus={() => setIsTooltipVisible(true)}
        onBlur={() => setIsTooltipVisible(false)}
        className={`flex h-14 w-14 items-center justify-center rounded-full border px-4 py-3 text-sm font-medium shadow-[0_8px_20px_rgba(2,8,12,0.18)] transition-[transform,background-color,opacity] duration-200 ease-out hover:translate-x-1 focus-visible:translate-x-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 ${palettes[color]}`}
      >
        <span className="flex w-6 shrink-0 justify-center">{icon}</span>
      </button>
      {isTooltipVisible ? (
        <div
          role="tooltip"
          data-testid={`${testId}-tooltip`}
          className="wow-surface-popover pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-20 -translate-y-1/2 whitespace-nowrap rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-slate-100 shadow-[0_14px_34px_rgba(2,8,12,0.32)]"
        >
          {label}
        </div>
      ) : null}
    </div>
  )
}
