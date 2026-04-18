import { memo, useEffect, useState } from 'react'
import type { NodeProps } from 'reactflow'
import { ChevronDown, ChevronRight, FolderKanban, Lock, Trash2, Unlock } from 'lucide-react'
import type { CanvasGroupNodeData } from '../../types'

export const GroupNode = memo(function GroupNode({ data, selected }: NodeProps<CanvasGroupNodeData>) {
  const { canvasGroup, memberCount = 0, onRename, onToggleCollapsed, onToggleLock, onDelete } = data
  const [draftLabel, setDraftLabel] = useState(canvasGroup.label)

  useEffect(() => {
    setDraftLabel(canvasGroup.label)
  }, [canvasGroup.label])

  return (
    <div
      data-testid={`group-node-${canvasGroup.id}`}
      className={`wow-node wow-node--group ${selected ? 'wow-node--group-selected' : ''} ${canvasGroup.locked ? 'wow-node--group-locked' : ''}`}
      style={{ width: canvasGroup.width, height: canvasGroup.height }}
    >
      <div className="wow-group-node__header" data-testid={`group-node-header-${canvasGroup.id}`}>
        <button
          type="button"
          className="wow-group-node__collapse nodrag"
          data-testid={`group-node-toggle-collapsed-${canvasGroup.id}`}
          aria-label={canvasGroup.collapsed ? 'Gruppe ausklappen' : 'Gruppe einklappen'}
          title={canvasGroup.collapsed ? 'Gruppe ausklappen' : 'Gruppe einklappen'}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onToggleCollapsed?.(canvasGroup.id)
          }}
        >
          {canvasGroup.collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <FolderKanban className="h-4 w-4" />
        {selected ? (
          <input
            data-testid={`group-node-label-input-${canvasGroup.id}`}
            className="wow-group-node__label-input nodrag"
            value={draftLabel}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => setDraftLabel(event.target.value)}
            onBlur={() => {
              const trimmed = draftLabel.trim()
              if (trimmed && trimmed !== canvasGroup.label) {
                onRename?.(canvasGroup.id, trimmed)
              } else {
                setDraftLabel(canvasGroup.label)
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur()
              }

              if (event.key === 'Escape') {
                setDraftLabel(canvasGroup.label)
                event.currentTarget.blur()
              }
            }}
          />
        ) : (
          <span data-testid={`group-node-label-${canvasGroup.id}`}>{canvasGroup.label}</span>
        )}
        <span className="wow-group-node__count" data-testid={`group-node-count-${canvasGroup.id}`}>
          {memberCount}
        </span>
        {selected ? (
          <div className="wow-group-node__actions" data-testid={`group-node-actions-${canvasGroup.id}`}>
            <button
              type="button"
              className="wow-group-node__action nodrag"
              data-testid={`group-node-toggle-lock-${canvasGroup.id}`}
              aria-label={canvasGroup.locked ? 'Gruppe entsperren' : 'Gruppe sperren'}
              title={canvasGroup.locked ? 'Gruppe entsperren' : 'Gruppe sperren'}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation()
                onToggleLock?.(canvasGroup.id)
              }}
            >
              {canvasGroup.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              className="wow-group-node__action wow-group-node__action--danger nodrag"
              data-testid={`group-node-delete-${canvasGroup.id}`}
              aria-label="Gruppe loeschen"
              title="Gruppe loeschen"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation()
                onDelete?.(canvasGroup.id)
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>
      {canvasGroup.locked ? (
        <div className="wow-node__lock-indicator" data-testid={`group-node-lock-${canvasGroup.id}`} aria-label="Gruppe gesperrt">
          <Lock className="h-3.5 w-3.5" />
        </div>
      ) : null}
    </div>
  )
})
