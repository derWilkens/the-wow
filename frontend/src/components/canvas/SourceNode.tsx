import { memo } from 'react'
import type { NodeProps } from 'reactflow'
import { Server } from 'lucide-react'
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
      className={`wow-node wow-node--source ${showHandles ? 'wow-node--handles-visible' : ''} ${
        isConnectionPreviewTarget ? 'wow-node--connection-preview-target' : ''
      }`}
    >
      <div className="wow-object-node__content">
        <Server className="wow-object-node__icon" />
        {canvasObject.name}
      </div>
      <CanvasHandles
        targetClassName="wow-handle wow-handle--source-target"
        sourceClassName="wow-handle wow-handle--source-source"
      />
    </div>
  )
})
