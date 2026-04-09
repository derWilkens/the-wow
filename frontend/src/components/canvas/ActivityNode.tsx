import { memo, type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import type { NodeProps } from 'reactflow'
import {
  CheckCheck,
  CircleDashed,
  CircleHelp,
  Clock3,
  Minus,
  Plus,
  ShieldAlert,
  UserRound,
} from 'lucide-react'
import type { ActivityNodeData, ActivityType, StatusIcon } from '../../types'
import { CanvasHandles } from './CanvasHandles'
import { activityTypeOptions, activityTypeOptionsByValue } from './activityTypeOptions'
import { RoleCreateForm } from '../roles/RoleCreateForm'

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

function getTitleDensityClass(label: string) {
  const normalizedLength = label.trim().length
  if (normalizedLength >= 72) {
    return 'wow-activity-node__title--compact-strong'
  }

  if (normalizedLength >= 38) {
    return 'wow-activity-node__title--compact'
  }

  return 'wow-activity-node__title--default'
}

export const ActivityNode = memo(function ActivityNode({ data, selected }: NodeProps<ActivityNodeData>) {
  const { activity } = data
  const assigneeLabel = data.assigneeLabel ?? null
  const showResponsibilityMeta = data.groupingMode !== 'role_lanes'
  const showHandles = Boolean(data.showHandles)
  const isConnectionPreviewTarget = Boolean(data.isConnectionPreviewTarget)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isTitleTooltipVisible, setIsTitleTooltipVisible] = useState(false)
  const [isTypePopoverOpen, setIsTypePopoverOpen] = useState(false)
  const [isTypeTriggerTooltipVisible, setIsTypeTriggerTooltipVisible] = useState(false)
  const [hoveredTypeOption, setHoveredTypeOption] = useState<ActivityType | null>(null)
  const [isRolePopoverOpen, setIsRolePopoverOpen] = useState(false)
  const [isRoleCreateOpen, setIsRoleCreateOpen] = useState(false)
  const [isRoleTriggerTooltipVisible, setIsRoleTriggerTooltipVisible] = useState(false)
  const [newRoleLabel, setNewRoleLabel] = useState('')
  const [newRoleAcronym, setNewRoleAcronym] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [optimisticRoleBadge, setOptimisticRoleBadge] = useState<{
    roleId: string | null
    acronym: string | null
    label: string | null
  } | null>(null)
  const [draftLabel, setDraftLabel] = useState(activity.label)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const typePopoverRef = useRef<HTMLDivElement | null>(null)
  const rolePopoverRef = useRef<HTMLDivElement | null>(null)
  const activeType = activity.activity_type ?? 'unbestimmt'
  const TypeIcon = activityTypeOptionsByValue[activeType].icon
  const hasSubprocess = Boolean(activity.linked_workflow_id)
  const hasDescription = Boolean(activity.description?.trim())
  const titleDensityClass = getTitleDensityClass(activity.label)
  const availableRoles = (data.availableRoles ?? []).slice().sort((left, right) => left.label.localeCompare(right.label, 'de'))
  const displayedRoleId = optimisticRoleBadge?.roleId ?? activity.role_id ?? null
  const currentRoleLabel = displayedRoleId ? optimisticRoleBadge?.label ?? data.roleLabel ?? 'Nicht zugeordnet' : null
  const currentRoleAcronym = displayedRoleId ? optimisticRoleBadge?.acronym ?? data.roleAcronym ?? null : null

  useEffect(() => {
    setDraftLabel(activity.label)
    setIsEditingTitle(false)
  }, [activity.id, activity.label])

  useEffect(() => {
    if (!optimisticRoleBadge) {
      return
    }

    const persistedRoleId = activity.role_id ?? null
    const persistedRoleLabel = persistedRoleId ? data.roleLabel ?? 'Nicht zugeordnet' : null
    const persistedRoleAcronym = persistedRoleId ? data.roleAcronym ?? null : null

    if (
      persistedRoleId === optimisticRoleBadge.roleId &&
      persistedRoleLabel === optimisticRoleBadge.label &&
      persistedRoleAcronym === optimisticRoleBadge.acronym
    ) {
      setOptimisticRoleBadge(null)
    }

    if (optimisticRoleBadge.roleId === null && persistedRoleId === null) {
      setOptimisticRoleBadge(null)
    }
  }, [activity.role_id, data.roleAcronym, data.roleLabel, optimisticRoleBadge])

  useEffect(() => {
    if (isEditingTitle) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditingTitle])

  useEffect(() => {
    if (!isTypePopoverOpen) {
      setHoveredTypeOption(null)
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (typePopoverRef.current?.contains(event.target as Node)) {
        return
      }

      setIsTypePopoverOpen(false)
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsTypePopoverOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isTypePopoverOpen])

  useEffect(() => {
    if (!isRolePopoverOpen) {
      setIsRoleCreateOpen(false)
      setNewRoleLabel('')
      setNewRoleAcronym('')
      setNewRoleDescription('')
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (rolePopoverRef.current?.contains(event.target as Node)) {
        return
      }

      setIsRolePopoverOpen(false)
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsRolePopoverOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isRolePopoverOpen])

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

  async function handleQuickTypeChange(nextType: ActivityType) {
    if (!data.onQuickChangeType || nextType === activeType) {
      setIsTypePopoverOpen(false)
      return
    }

    await data.onQuickChangeType(activity.id, nextType)
    setIsTypePopoverOpen(false)
  }

  async function handleQuickRoleChange(nextRoleId: string | null) {
    if (!data.onQuickChangeRole || nextRoleId === (activity.role_id ?? null)) {
      setIsRolePopoverOpen(false)
      return
    }

    const nextRole = nextRoleId ? availableRoles.find((role) => role.id === nextRoleId) ?? null : null
    const previousOptimisticRoleBadge = optimisticRoleBadge
    setOptimisticRoleBadge({
      roleId: nextRoleId,
      acronym: nextRole?.acronym ?? null,
      label: nextRole?.label ?? null,
    })

    try {
      await data.onQuickChangeRole(activity.id, nextRoleId)
      setIsRolePopoverOpen(false)
      setIsRoleCreateOpen(false)
    } catch (error) {
      setOptimisticRoleBadge(previousOptimisticRoleBadge)
      throw error
    }
  }

  async function handleCreateRole() {
    if (!data.onCreateRole || !newRoleLabel.trim()) {
      return
    }

    const createdRole = await data.onCreateRole({
      label: newRoleLabel.trim(),
      acronym: newRoleAcronym.trim() || null,
      description: newRoleDescription.trim(),
    })

    setNewRoleLabel('')
    setNewRoleAcronym('')
    setNewRoleDescription('')

    if (createdRole?.id && data.onQuickChangeRole) {
      const previousOptimisticRoleBadge = optimisticRoleBadge
      setOptimisticRoleBadge({
        roleId: createdRole.id,
        acronym: createdRole.acronym ?? null,
        label: createdRole.label,
      })

      try {
        await data.onQuickChangeRole(activity.id, createdRole.id)
      } catch (error) {
        setOptimisticRoleBadge(previousOptimisticRoleBadge)
        throw error
      }
    }

    setIsRolePopoverOpen(false)
    setIsRoleCreateOpen(false)
  }

  return (
    <div
      data-testid={`activity-node-${activity.id}`}
      onDoubleClick={() => data.onOpenDetail(activity.id)}
      className={`wow-node wow-node--activity ${showHandles ? 'wow-node--handles-visible' : ''} ${
        isConnectionPreviewTarget ? 'wow-node--connection-preview-target' : ''
      }`}
    >
      <div className="wow-activity-node__meta-row">
        <div className="wow-activity-node__type-control" ref={typePopoverRef}>
          <button
            type="button"
            data-testid={`activity-type-trigger-${activity.id}`}
            aria-label="Typ aendern"
            className="wow-activity-node__type-icon wow-activity-node__type-icon-button nodrag nopan"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              setIsTypePopoverOpen((current) => !current)
            }}
            onMouseEnter={() => setIsTypeTriggerTooltipVisible(true)}
            onMouseLeave={() => setIsTypeTriggerTooltipVisible(false)}
            onFocus={() => setIsTypeTriggerTooltipVisible(true)}
            onBlur={() => setIsTypeTriggerTooltipVisible(false)}
          >
            <TypeIcon className="h-4 w-4" />
          </button>
          {isTypeTriggerTooltipVisible && !isTypePopoverOpen ? (
            <div
              role="tooltip"
              data-testid={`activity-type-trigger-tooltip-${activity.id}`}
              className="wow-activity-node__type-trigger-tooltip"
            >
              Typ aendern
            </div>
          ) : null}
          {isTypePopoverOpen ? (
            <div
              data-testid={`activity-type-popover-${activity.id}`}
              className="wow-activity-node__type-popover"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              {activityTypeOptions.map((option) => {
                const OptionIcon = option.icon
                const isActive = option.value === activeType
                return (
                  <button
                    key={option.value}
                    type="button"
                    data-testid={`activity-type-option-${activity.id}-${option.value}`}
                    aria-label={option.label}
                    className={`wow-activity-node__type-option ${isActive ? 'wow-activity-node__type-option--active' : ''}`}
                    onClick={() => void handleQuickTypeChange(option.value)}
                    onMouseEnter={() => setHoveredTypeOption(option.value)}
                    onMouseLeave={() => setHoveredTypeOption((current) => (current === option.value ? null : current))}
                    onFocus={() => setHoveredTypeOption(option.value)}
                    onBlur={() => setHoveredTypeOption((current) => (current === option.value ? null : current))}
                  >
                    <OptionIcon className="h-4 w-4" />
                  </button>
                )
              })}
              {hoveredTypeOption ? (
                <div
                  role="tooltip"
                  data-testid={`activity-type-option-tooltip-${activity.id}`}
                  className="wow-activity-node__type-option-tooltip"
                >
                  {activityTypeOptionsByValue[hoveredTypeOption].label}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        {showResponsibilityMeta ? (
          <div className="wow-activity-node__role-control" ref={rolePopoverRef}>
            <button
              type="button"
              data-testid={`activity-role-trigger-${activity.id}`}
              aria-label={currentRoleLabel ? 'Rolle aendern' : 'Rolle festlegen'}
              data-role-state={currentRoleLabel ? 'assigned' : 'missing'}
              className={`wow-activity-node__role-badge nodrag nopan ${currentRoleLabel ? 'wow-activity-node__role-badge--assigned' : 'wow-activity-node__role-badge--missing'}`}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation()
                setIsRolePopoverOpen((current) => !current)
              }}
              onMouseEnter={() => setIsRoleTriggerTooltipVisible(true)}
              onMouseLeave={() => setIsRoleTriggerTooltipVisible(false)}
              onFocus={() => setIsRoleTriggerTooltipVisible(true)}
              onBlur={() => setIsRoleTriggerTooltipVisible(false)}
            >
              <UserRound className="h-3.5 w-3.5 shrink-0" />
              <span data-testid={`activity-role-${activity.id}`} className="wow-activity-node__role-acronym">
                {currentRoleAcronym || '?'}
              </span>
              {!currentRoleLabel ? <CircleHelp className="h-3 w-3 shrink-0 opacity-80" /> : null}
            </button>
            {isRoleTriggerTooltipVisible && !isRolePopoverOpen ? (
              <div
                role="tooltip"
                data-testid={`activity-role-trigger-tooltip-${activity.id}`}
                className="wow-activity-node__role-trigger-tooltip"
              >
                {currentRoleLabel ? `${currentRoleLabel} · Rolle aendern` : 'Rolle festlegen'}
              </div>
            ) : null}
            {isRolePopoverOpen ? (
              <div
                data-testid={`activity-role-popover-${activity.id}`}
                className="wow-activity-node__role-popover"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                {!isRoleCreateOpen ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <button
                        type="button"
                        data-testid={`activity-role-option-${activity.id}-none`}
                        onClick={() => void handleQuickRoleChange(null)}
                        className={`wow-activity-node__role-option ${!displayedRoleId ? 'wow-activity-node__role-option--active' : ''}`}
                      >
                        <span className="wow-activity-node__role-option-leading">
                          <UserRound className="h-3.5 w-3.5" />
                          <span className="wow-activity-node__role-option-badge">?</span>
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">Ohne Rolle</span>
                          <span className="mt-1 block text-xs text-slate-400">Es wird keine fachliche Rolle gesetzt.</span>
                        </span>
                      </button>
                      {availableRoles.map((role) => (
                        <button
                          key={role.id}
                          type="button"
                          data-testid={`activity-role-option-${activity.id}-${role.id}`}
                          onClick={() => void handleQuickRoleChange(role.id)}
                          className={`wow-activity-node__role-option ${displayedRoleId === role.id ? 'wow-activity-node__role-option--active' : ''}`}
                        >
                          <span className="wow-activity-node__role-option-leading">
                            <UserRound className="h-3.5 w-3.5" />
                            <span className="wow-activity-node__role-option-badge">{role.acronym}</span>
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">{role.label}</span>
                            {role.description ? (
                              <span className="mt-1 block text-xs leading-5 text-slate-400">{role.description}</span>
                            ) : null}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
                      <button
                        type="button"
                        data-testid={`activity-role-create-toggle-${activity.id}`}
                        onClick={() => setIsRoleCreateOpen(true)}
                        className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-100"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Neue Rolle anlegen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="wow-activity-node__role-create">
                    <RoleCreateForm
                      label={newRoleLabel}
                      acronym={newRoleAcronym}
                      description={newRoleDescription}
                      nameTestId={`activity-role-create-name-${activity.id}`}
                      acronymTestId={`activity-role-create-acronym-${activity.id}`}
                      descriptionTestId={`activity-role-create-description-${activity.id}`}
                      submitTestId={`activity-role-create-submit-${activity.id}`}
                      cancelTestId={`activity-role-create-cancel-${activity.id}`}
                      onLabelChange={setNewRoleLabel}
                      onAcronymChange={setNewRoleAcronym}
                      onDescriptionChange={setNewRoleDescription}
                      onSubmit={() => void handleCreateRole()}
                      onCancel={() => {
                        setIsRoleCreateOpen(false)
                        setNewRoleLabel('')
                        setNewRoleAcronym('')
                        setNewRoleDescription('')
                      }}
                    />
                  </div>
                )}
              </div>
            ) : null}
          </div>
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
          className={`wow-activity-node__inline-input ${titleDensityClass} nodrag`}
        />
      ) : (
        <div className="wow-activity-node__title-wrap">
          <button
            type="button"
            data-testid={`activity-inline-label-${activity.id}`}
            data-title-density={titleDensityClass.replace('wow-activity-node__title--', '')}
            onClick={(event) => {
              event.stopPropagation()
              if (selected) {
                setIsEditingTitle(true)
              }
            }}
            onMouseEnter={() => {
              if (hasDescription) {
                setIsTitleTooltipVisible(true)
              }
            }}
            onMouseLeave={() => setIsTitleTooltipVisible(false)}
            onFocus={() => {
              if (hasDescription) {
                setIsTitleTooltipVisible(true)
              }
            }}
            onBlur={() => setIsTitleTooltipVisible(false)}
            className={`wow-activity-node__title wow-activity-node__title-button ${titleDensityClass}`}
          >
            {activity.label}
          </button>
          {hasDescription && isTitleTooltipVisible ? (
            <div
              role="tooltip"
              data-testid={`activity-description-tooltip-${activity.id}`}
              className="wow-activity-node__description-tooltip"
            >
              {activity.description}
            </div>
          ) : null}
        </div>
      )}
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
          title={hasSubprocess ? 'Detailablauf verwalten' : 'Detailablauf anlegen'}
          aria-label={hasSubprocess ? 'Detailablauf verwalten' : 'Detailablauf anlegen'}
          data-testid={`subprocess-trigger-${activity.id}`}
          data-subprocess-state={hasSubprocess ? 'linked' : 'empty'}
          className={`wow-activity-node__subprocess-marker wow-activity-node__subprocess-marker--${
            hasSubprocess ? 'linked' : 'empty'
          } nodrag nopan`}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            data.onOpenSubprocessMenu(activity.id, {
              x: event.clientX,
              y: event.clientY,
            })
          }}
        >
          <span className="wow-activity-node__subprocess-icon" aria-hidden="true">
            <Plus className="wow-activity-node__subprocess-plus" />
            {!hasSubprocess ? <Minus className="wow-activity-node__subprocess-dash" /> : null}
          </span>
        </button>
      </div>
      {activity.status_icon && <div className={statusClassMap[activity.status_icon]}>{statusIconMap[activity.status_icon]}</div>}
      <CanvasHandles
        targetClassName="wow-handle wow-handle--activity-target"
        sourceClassName="wow-handle wow-handle--activity-source"
      />
    </div>
  )
})
