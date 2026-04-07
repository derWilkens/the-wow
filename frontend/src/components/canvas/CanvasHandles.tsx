import { Handle, Position } from 'reactflow'

const positionMap = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
} as const

type HandleSide = keyof typeof positionMap

interface CanvasHandlesProps {
  sourceClassName: string
  targetClassName: string
  allowSource?: boolean
  allowTarget?: boolean
  sides?: HandleSide[]
}

const defaultSides: HandleSide[] = ['top', 'right', 'bottom', 'left']

export function CanvasHandles({
  sourceClassName,
  targetClassName,
  allowSource = true,
  allowTarget = true,
  sides = defaultSides,
}: CanvasHandlesProps) {
  return (
    <>
      {allowTarget &&
        sides.map((side) => (
          <Handle
            key={`target-handle-${side}`}
            id={`target-${side}`}
            type="target"
            position={positionMap[side]}
            className={targetClassName}
          />
        ))}
      {allowSource &&
        sides.map((side) => (
          <Handle
            key={`source-handle-${side}`}
            id={`source-${side}`}
            type="source"
            position={positionMap[side]}
            className={sourceClassName}
          />
        ))}
    </>
  )
}
