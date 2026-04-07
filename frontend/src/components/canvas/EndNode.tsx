import { memo } from 'react'
import type { NodeProps } from 'reactflow'
import { Disc3 } from 'lucide-react'
import type { ActivityNodeData } from '../../types'
import { CanvasHandles } from './CanvasHandles'

export const EndNode = memo(function EndNode({ data }: NodeProps<ActivityNodeData>) {
  return (
    <div data-testid={`end-node-${data.activity.id}`} className="wow-node wow-node--end">
      <Disc3 className="wow-terminal-node__icon wow-terminal-node__icon--filled" />
      <CanvasHandles
        allowSource={false}
        targetClassName="wow-handle wow-handle--end-target"
        sourceClassName="wow-handle wow-handle--end-source"
      />
    </div>
  )
})
