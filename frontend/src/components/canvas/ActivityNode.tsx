import { memo, type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import type { NodeProps } from 'reactflow'
import {
  CheckCheck,
  CheckCircle2,
  CircleDashed,
  Clock3,
  FileCog,
  Forward,
  PencilLine,
  Shapes,
  ShieldAlert,
} from 'lucide-react'
import type { ActivityNodeData, StatusIcon } from '../../types'
import { CanvasHandles } from './CanvasHandles'

const statusIconMap: Record<Exclude<StatusIcon, null>, ReactNode> = {
  unclear: <ShieldAlert className="h-3.5 w-3.5" />,
  ok: <CheckCheck className="h-3.5 w-3.5" />,
  in_progress: <Clock3 className="h-3.5 w-3.5" />,
  blocked: <CircleDashed className="h-3.5 w-3.5" />,
}

const statusClassMap: Record<Exclude<StatusIcon, null>, string> = {
  unclear: 'wow-activity-node__status wow-activity-node__status--unclear',
  ok: 'wow-activity-node__status wow-activity-node__status--ok',
  in_progress: 'wow-activity-node__status wow-activity-node__status--in-progress',
  blocked: 'wow-activity-node__status wow-activity-node__status--blocked',
}

const activityTypeIconMap = {
  erstellen: FileCog,
  transformieren_aktualisieren: Shapes,
  pruefen_freigeben: CheckCircle2,
  weiterleiten_ablegen: Forward,
} as const

export const ActivityNode = memo(function ActivityNode({ data, selected }: NodeProps<ActivityNodeData>) {
  const { activity } = data
  const roleLabel = data.roleLabel ?? 'Nicht zugeordnet'
  const assigneeLabel = data.assigneeLabel ?? null
  const showResponsibilityMeta = data.groupingMode !== 'role_lanes'
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [draftLabel, setDraftLabel] = useState(activity.label)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const TypeIcon = activity.activity_type ? activityTypeIconMap[activity.activity_type] : PencilLine

  useEffect(() => {
    setDraftLabel(activity.label)
    setIsEditingTitle(false)
  }, [activity.id, activity.label])

  useEffect(() => {
    if (isEditingTitle) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditingTitle])

  async function saveInlineLabel() {
    const nextLabel = draftLabel.trim()
    setIsEditingTitle(false)
    if (!nextLabel || nextLabel === activity.label || !data.onInlineRename) {
      setDraftLabel(activity.label)
      return
    }

    await data.onInlineRename(activity.id, nextLabel)
  }

  function handleTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void saveInlineLabel()
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setDraftLabel(activity.label)
      setIsEditingTitle(false)
    }
  }

  return (
    <div
      data-testid={`activity-node-${activity.id}`}
      onDoubleClick={() => data.onOpenDetail(activity.id)}
      className="wow-node wow-node--activity"
    >
      <div className="wow-activity-node__meta-row">
        <span className="wow-activity-node__type-icon">
          <TypeIcon className="h-4 w-4" />
        </span>
        {showResponsibilityMeta ? (
          <span data-testid={`activity-role-${activity.id}`} className="wow-activity-node__role-top" title={roleLabel}>
            {roleLabel}
          </span>
        ) : null}
      </div>

      {isEditingTitle ? (
        <input
          ref={inputRef}
          data-testid={`activity-inline-input-${activity.id}`}
          value={draftLabel}
          onChange={(event) => setDraftLabel(event.target.value)}
          onBlur={() => void saveInlineLabel()}
          onKeyDown={handleTitleKeyDown}
          className="wow-activity-node__inline-input nodrag"
        />
      ) : (
        <button
          type="button"
          data-testid={`activity-inline-label-${activity.id}`}
          onClick={(event) => {
            event.stopPropagation()
            if (selected) {
              setIsEditingTitle(true)
            }
          }}
          className="wow-activity-node__title wow-activity-node__title-button"
        >
          {activity.label}
        </button>
      )}

      <p className="wow-activity-node__description">{activity.description}</p>
      <div className="wow-activity-node__footer">
        <div className="flex flex-wrap items-center gap-2">
          {showResponsibilityMeta && assigneeLabel ? (
            <span
              data-testid={`activity-assignee-${activity.id}`}
              className="inline-flex max-w-[11rem] items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] tracking-[0.04em] text-slate-200"
              title={assigneeLabel}
            >
              <span className="truncate">{assigneeLabel}</span>
            </span>
          ) : null}
        </div>
        <button
          type="button"
          title="Detailablauf anlegen"
          data-testid={`subprocess-trigger-${activity.id}`}
          className="wow-activity-node__action nodrag nopan"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            data.onOpenSubprocessMenu(activity.id, {
              x: event.clientX,
              y: event.clientY,
            })
          }}
        >
          +
        </button>
      </div>
      {activity.linked_workflow_id ? (
        <button
          type="button"
          data-testid={`subprocess-badge-${activity.id}`}
          className="wow-activity-node__subprocess nodrag nopan"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            data.onOpenSubprocess(activity.id)
          }}
        >
          Ablauf verknuepft
        </button>
      ) : null}
      {activity.status_icon && <div className={statusClassMap[activity.status_icon]}>{statusIconMap[activity.status_icon]}</div>}
      <CanvasHandles
        targetClassName="wow-handle wow-handle--activity-target"
        sourceClassName="wow-handle wow-handle--activity-source"
      />
    </div>
  )
})
