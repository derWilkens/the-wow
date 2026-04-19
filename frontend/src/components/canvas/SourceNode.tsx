import { memo } from 'react'
import type { NodeProps } from 'reactflow'
import { ArrowDownToLine, ArrowUpToLine, Lock, Server } from 'lucide-react'
import type { CanvasObjectNodeData } from '../../types'
import { CanvasHandles } from './CanvasHandles'

export const SourceNode = memo(function SourceNode({ data }: NodeProps<CanvasObjectNodeData>) {
  const { canvasObject } = data
  const showHandles = Boolean(data.showHandles)
  const isConnectionPreviewTarget = Boolean(data.isConnectionPreviewTarget)

  return (
    <div
      data-testid={`source-node-${canvasObject.id}`}
      onDoubleClick={() => data.onOpenPopup(canvasObject.id)}
      className={`wow-node wow-node--source ${canvasObject.is_locked ? 'wow-node--locked' : ''} ${
        showHandles ? 'wow-node--handles-visible' : ''
      } ${
        isConnectionPreviewTarget ? 'wow-node--connection-preview-target' : ''
      }`}
    >
      {showHandles ? (
        <div className="wow-source-node__layer-actions">
          <button
            type="button"
            className="wow-source-node__layer-action nodrag"
            data-testid={`source-node-bring-front-${canvasObject.id}`}
            aria-label="Datenspeicher nach vorne"
            title="Datenspeicher nach vorne"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              data.onBringToFront?.(canvasObject.id)
            }}
          >
            <ArrowUpToLine className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="wow-source-node__layer-action nodrag"
            data-testid={`source-node-send-back-${canvasObject.id}`}
            aria-label="Datenspeicher nach hinten"
            title="Datenspeicher nach hinten"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              data.onSendToBack?.(canvasObject.id)
            }}
          >
            <ArrowDownToLine className="h-3 w-3" />
          </button>
        </div>
      ) : null}
      <div className="wow-object-node__content">
        <Server className="wow-object-node__icon" />
        {canvasObject.name}
      </div>
      {canvasObject.is_locked ? (
        <div
          data-testid={`source-lock-indicator-${canvasObject.id}`}
          className="wow-node__lock-indicator"
          aria-label="Gesperrt"
          title="Gesperrt"
        >
          <Lock className="h-3.5 w-3.5" />
        </div>
      ) : null}
      <CanvasHandles
        targetClassName="wow-handle wow-handle--source-target"
        sourceClassName="wow-handle wow-handle--source-source"
      />
    </div>
  )
})
