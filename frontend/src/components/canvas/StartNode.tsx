import { memo } from 'react'
import type { NodeProps } from 'reactflow'
import { Play } from 'lucide-react'
import type { ActivityNodeData } from '../../types'
import { CanvasHandles } from './CanvasHandles'

export const StartNode = memo(function StartNode({ data }: NodeProps<ActivityNodeData>) {
  return (
    <div data-testid={`start-node-${data.activity.id}`} className="wow-node wow-node--start">
      <Play className="wow-terminal-node__icon wow-terminal-node__icon--filled" />
      <CanvasHandles
        allowTarget={false}
        targetClassName="wow-handle wow-handle--start-target"
        sourceClassName="wow-handle wow-handle--start-source"
      />
    </div>
  )
})
