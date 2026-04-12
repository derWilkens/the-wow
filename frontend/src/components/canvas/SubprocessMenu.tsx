import type { ReactNode } from 'react'
import { Link2, PlusSquare, Unlink2 } from 'lucide-react'
import type { Activity } from '../../types'

export function SubprocessMenu({
  activity,
  position,
  onCreateNew,
  onLinkExisting,
  onOpenLinked,
  onUnlink,
  onClose,
}: {
  activity: Activity
  position: { x: number; y: number }
  onCreateNew: () => void
  onLinkExisting: () => void
  onOpenLinked: () => void
  onUnlink: () => void
  onClose: () => void
}) {
  const hasLinkedSubprocess = Boolean(activity.linked_workflow_id)

  return (
    <>
      <button
        type="button"
        aria-label="close subprocess menu"
        className="fixed inset-0 z-40 cursor-default bg-transparent"
        onClick={onClose}
      />
      <div
        data-testid="subprocess-menu"
        className="wow-surface-popover fixed z-50 w-64 rounded-[24px] border border-white/10 p-2 shadow-[0_24px_80px_rgba(2,8,12,0.65)]"
        style={{ left: Math.min(position.x + 12, window.innerWidth - 280), top: Math.min(position.y + 12, window.innerHeight - 260) }}
      >
        <div className="px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-300/80">Arbeitsablauf</p>
          <p className="mt-2 text-sm text-slate-200">{activity.label}</p>
        </div>
        <MenuButton testId="subprocess-menu-create" icon={<PlusSquare className="h-4 w-4" />} label="Detaillierten Ablauf anlegen" description="Diesen Schritt in einen geführten Detailablauf aufteilen." onClick={onCreateNew} />
        <MenuButton testId="subprocess-menu-link" icon={<Link2 className="h-4 w-4" />} label="Bestehenden Arbeitsablauf verlinken" description="Einen vorhandenen Ablauf für diesen Schritt wiederverwenden." onClick={onLinkExisting} />
        {hasLinkedSubprocess ? (
          <>
            <MenuButton testId="subprocess-menu-open" icon={<PlusSquare className="h-4 w-4" />} label="Vorschau öffnen" description="Den verknüpften Detailablauf zuerst als fokussierte Vorschau öffnen." onClick={onOpenLinked} />
            <MenuButton testId="subprocess-menu-unlink" icon={<Unlink2 className="h-4 w-4" />} label="Verknüpfung lösen" description="Die Aktivität wieder ohne Detailablauf nutzen." onClick={onUnlink} destructive />
          </>
        ) : null}
      </div>
    </>
  )
}

function MenuButton({
  testId,
  icon,
  label,
  description,
  onClick,
  destructive = false,
}: {
  testId: string
  icon: ReactNode
  label: string
  description: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      className={`flex w-full items-start gap-3 rounded-[18px] px-3 py-3 text-left transition ${
        destructive ? 'text-rose-100 hover:bg-rose-500/10' : 'text-slate-200 hover:bg-white/7'
      }`}
      onClick={onClick}
    >
      <span className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border ${destructive ? 'border-rose-400/25 bg-rose-500/10' : 'border-white/10 bg-white/5'}`}>
        {icon}
      </span>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className={`mt-1 block text-xs ${destructive ? 'text-rose-200/80' : 'text-slate-500'}`}>{description}</span>
      </span>
    </button>
  )
}

