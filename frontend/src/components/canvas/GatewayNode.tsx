import { memo } from 'react'
import type { NodeProps } from 'reactflow'
import { GitBranchPlus, Merge } from 'lucide-react'
import type { ActivityNodeData } from '../../types'
import { CanvasHandles } from './CanvasHandles'

export const GatewayNode = memo(function GatewayNode({ data }: NodeProps<ActivityNodeData>) {
  const { activity } = data
  const isDecision = activity.node_type === 'gateway_decision'
  const showHandles = Boolean(data.showHandles)
  const isConnectionPreviewTarget = Boolean(data.isConnectionPreviewTarget)

  return (
    <div
      data-testid={`gateway-node-${activity.id}`}
      className={`wow-node wow-node--gateway ${isDecision ? 'wow-node--gateway-decision' : 'wow-node--gateway-merge'} ${
        showHandles ? 'wow-node--handles-visible' : ''
      } ${isConnectionPreviewTarget ? 'wow-node--connection-preview-target' : ''}`}
    >
      <div className="wow-gateway-node__diamond">
        <div className="wow-gateway-node__inner">
          <span className="wow-gateway-node__icon">
            {isDecision ? <GitBranchPlus className="h-5 w-5" /> : <Merge className="h-5 w-5" />}
          </span>
          <p className="wow-gateway-node__eyebrow">{isDecision ? 'Entscheidung' : 'Zusammenführung'}</p>
          <div className="wow-gateway-node__title">{activity.label}</div>
        </div>
      </div>
      <CanvasHandles
        targetClassName="wow-handle wow-handle--activity-target"
        sourceClassName="wow-handle wow-handle--activity-source"
      />
    </div>
  )
})
