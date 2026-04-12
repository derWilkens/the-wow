import { memo } from 'react'
import type { NodeProps } from 'reactflow'
import { Lock, Server } from 'lucide-react'
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
