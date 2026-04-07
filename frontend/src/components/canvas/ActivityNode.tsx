import { memo, type ReactNode } from 'react'
import type { NodeProps } from 'reactflow'
import { CheckCheck, CircleDashed, Clock3, ShieldAlert, UserRound } from 'lucide-react'
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

export const ActivityNode = memo(function ActivityNode({ data }: NodeProps<ActivityNodeData>) {
  const { activity } = data
  const roleLabel = data.roleLabel ?? 'Nicht zugeordnet'
  const assigneeLabel = data.assigneeLabel ?? null
  const showResponsibilityMeta = data.groupingMode !== 'role_lanes'

  return (
    <div
      data-testid={`activity-node-${activity.id}`}
      onDoubleClick={() => data.onOpenDetail(activity.id)}
      className="wow-node wow-node--activity"
    >
      {showResponsibilityMeta ? (
        <div data-testid={`activity-owner-${activity.id}`} className="wow-activity-node__owner">
          <UserRound className="wow-activity-node__owner-icon" />
        </div>
      ) : null}
      <p className="wow-activity-node__eyebrow">Aktivität</p>
      <div className="wow-activity-node__title">{activity.label}</div>
      <p className="wow-activity-node__description">{activity.description}</p>
      <div className="wow-activity-node__footer">
        <div className="flex flex-wrap items-center gap-2">
          <span className="wow-activity-node__type">
            {activity.activity_type ? activity.activity_type.replace(/_/g, ' ') : 'untyped'}
          </span>
          {showResponsibilityMeta ? (
            <>
              <span
                data-testid={`activity-role-${activity.id}`}
                className="inline-flex max-w-[10rem] items-center gap-1 rounded-full border border-cyan-300/15 bg-cyan-400/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-cyan-100/85"
                title={roleLabel}
              >
                <UserRound className="h-3 w-3" />
                <span className="truncate">{roleLabel}</span>
              </span>
              {assigneeLabel ? (
                <span
                  data-testid={`activity-assignee-${activity.id}`}
                  className="inline-flex max-w-[10rem] items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] tracking-[0.04em] text-slate-200"
                  title={assigneeLabel}
                >
                  <span className="truncate">{assigneeLabel}</span>
                </span>
              ) : null}
            </>
          ) : null}
        </div>
        <button
          type="button"
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
          Ablauf verknüpft
        </button>
      ) : null}
      {activity.status_icon && (
        <div className={statusClassMap[activity.status_icon]}>
          {statusIconMap[activity.status_icon]}
        </div>
      )}
      <CanvasHandles
        targetClassName="wow-handle wow-handle--activity-target"
        sourceClassName="wow-handle wow-handle--activity-source"
      />
    </div>
  )
})


