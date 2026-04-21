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
      <button type="button" aria-label="close subprocess menu" className="fixed inset-0 z-40 cursor-default bg-transparent" onClick={onClose} />
      <div
        data-testid="subprocess-menu"
        className="wow-surface-popover fixed z-50 w-64 rounded-[var(--wow-panel-radius)] border border-[var(--wow-panel-border)] p-2 shadow-[var(--wow-panel-shadow)]"
        style={{ left: Math.min(position.x + 12, window.innerWidth - 280), top: Math.min(position.y + 12, window.innerHeight - 260) }}
      >
        <div className="px-3 py-2">
          <p className="wow-ui-eyebrow">Arbeitsablauf</p>
          <p className="mt-2 text-sm text-[var(--text)]">{activity.label}</p>
        </div>
        <MenuButton testId="subprocess-menu-create" icon={<PlusSquare className="h-4 w-4" />} label="Detaillierten Ablauf anlegen" description="Diesen Schritt in einen gefuehrten Detailablauf aufteilen." onClick={onCreateNew} />
        <MenuButton testId="subprocess-menu-link" icon={<Link2 className="h-4 w-4" />} label="Bestehenden Arbeitsablauf verlinken" description="Einen vorhandenen Ablauf fuer diesen Schritt wiederverwenden." onClick={onLinkExisting} />
        {hasLinkedSubprocess ? (
          <>
            <MenuButton testId="subprocess-menu-open" icon={<PlusSquare className="h-4 w-4" />} label="Vorschau oeffnen" description="Den verknuepften Detailablauf zuerst als fokussierte Vorschau oeffnen." onClick={onOpenLinked} />
            <MenuButton testId="subprocess-menu-unlink" icon={<Unlink2 className="h-4 w-4" />} label="Verknuepfung loesen" description="Die Aktivitaet wieder ohne Detailablauf nutzen." onClick={onUnlink} destructive />
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
      className={`flex w-full items-start gap-3 rounded-[var(--wow-panel-radius)] px-3 py-3 text-left transition ${
        destructive ? 'text-[var(--danger)] hover:bg-[rgba(186,26,26,0.08)]' : 'text-[var(--text)] hover:bg-[var(--wow-secondary-soft)]'
      }`}
      onClick={onClick}
    >
      <span className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border ${destructive ? 'border-[rgba(186,26,26,0.18)] bg-[rgba(186,26,26,0.08)]' : 'border-[var(--wow-panel-border)] bg-[var(--panel-strong)]'}`}>
        {icon}
      </span>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className={`mt-1 block text-xs ${destructive ? 'text-[var(--danger)]/80' : 'text-[var(--muted)]'}`}>{description}</span>
      </span>
    </button>
  )
}
