import { useEffect, useMemo, useRef, useState } from 'react'
import type { Activity, CanvasEdge, CanvasObject, HierarchyFocusPreviewLayout } from '../../types'

const NODE_SIZES = {
  activity: { width: 220, height: 140 },
  start_event: { width: 56, height: 56 },
  end_event: { width: 56, height: 56 },
  gateway_decision: { width: 120, height: 120 },
  gateway_merge: { width: 120, height: 120 },
  quelle: { width: 176, height: 64 },
} as const

function getBounds(
  activities: Activity[],
  canvasObjects: Extract<CanvasObject, { object_type: 'quelle' }>[],
) {
  let left = Number.POSITIVE_INFINITY
  let top = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY

  for (const activity of activities) {
    const size = NODE_SIZES[activity.node_type]
    left = Math.min(left, activity.position_x)
    top = Math.min(top, activity.position_y)
    right = Math.max(right, activity.position_x + size.width)
    bottom = Math.max(bottom, activity.position_y + size.height)
  }

  for (const canvasObject of canvasObjects) {
    if (canvasObject.object_type !== 'quelle') {
      continue
    }
    left = Math.min(left, canvasObject.position_x)
    top = Math.min(top, canvasObject.position_y)
    right = Math.max(right, canvasObject.position_x + NODE_SIZES.quelle.width)
    bottom = Math.max(bottom, canvasObject.position_y + NODE_SIZES.quelle.height)
  }

  if (!Number.isFinite(left)) {
    return { left: 0, top: 0, width: 640, height: 360 }
  }

  return {
    left,
    top,
    width: Math.max(320, right - left),
    height: Math.max(220, bottom - top),
  }
}

function getNodeCenter(
  id: string,
  activities: Activity[],
  canvasObjects: Extract<CanvasObject, { object_type: 'quelle' }>[],
) {
  const activity = activities.find((item) => item.id === id)
  if (activity) {
    const size = NODE_SIZES[activity.node_type]
    return {
      x: activity.position_x + size.width / 2,
      y: activity.position_y + size.height / 2,
    }
  }

  const source = canvasObjects.find((item) => item.id === id && item.object_type === 'quelle')
  if (source) {
    return {
      x: source.position_x + NODE_SIZES.quelle.width / 2,
      y: source.position_y + NODE_SIZES.quelle.height / 2,
    }
  }

  return null
}

export function HierarchyPreviewCanvas({
  activities,
  canvasObjects,
  canvasEdges,
  previewLayout,
}: {
  activities: Activity[]
  canvasObjects: CanvasObject[]
  canvasEdges: CanvasEdge[]
  previewLayout: HierarchyFocusPreviewLayout
}) {
  const sourceObjects = useMemo(
    () => canvasObjects.filter((item): item is Extract<CanvasObject, { object_type: 'quelle' }> => item.object_type === 'quelle'),
    [canvasObjects],
  )
  const bounds = useMemo(() => getBounds(activities, sourceObjects), [activities, sourceObjects])
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = containerRef.current
    if (!element) {
      return
    }

    const updateSize = () => {
      const rect = element.getBoundingClientRect()
      setContainerSize({ width: rect.width, height: rect.height })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const scale = useMemo(() => {
    if (previewLayout.mode === 'origin_zoom') {
      return previewLayout.zoom
    }

    const availableWidth = Math.max(0, containerSize.width - previewLayout.innerPadding * 2)
    const availableHeight = Math.max(0, containerSize.height - previewLayout.innerPadding * 2)
    if (!availableWidth || !availableHeight) {
      return 1
    }

    return Math.max(0.2, Math.min(availableWidth / bounds.width, availableHeight / bounds.height))
  }, [bounds.height, bounds.width, containerSize.height, containerSize.width, previewLayout.innerPadding, previewLayout.mode, previewLayout.zoom])

  const stageWidth = bounds.width * scale
  const stageHeight = bounds.height * scale
  const offsetX = Math.max(previewLayout.innerPadding, (containerSize.width - stageWidth) / 2)
  const offsetY = Math.max(previewLayout.innerPadding, (containerSize.height - stageHeight) / 2)

  return (
    <div
      ref={containerRef}
      className="wow-hierarchy-preview-canvas"
      data-testid="hierarchy-preview-canvas"
      data-preview-mode={previewLayout.mode}
      data-preview-zoom={String(previewLayout.zoom)}
    >
      <div
        className="wow-hierarchy-preview-canvas__stage"
        style={{
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
      <svg className="wow-hierarchy-preview-canvas__edges" viewBox={`0 0 ${bounds.width} ${bounds.height}`} preserveAspectRatio="none">
        {canvasEdges.map((edge) => {
          const source = getNodeCenter(edge.from_node_id, activities, sourceObjects)
          const target = getNodeCenter(edge.to_node_id, activities, sourceObjects)
          if (!source || !target) {
            return null
          }
          const x1 = source.x - bounds.left
          const y1 = source.y - bounds.top
          const x2 = target.x - bounds.left
          const y2 = target.y - bounds.top
          return (
            <line
              key={edge.id}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(143, 216, 255, 0.38)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )
        })}
      </svg>
      <div className="wow-hierarchy-preview-canvas__nodes">
        {activities.map((activity) => {
          const size = NODE_SIZES[activity.node_type]
          return (
            <div
              key={activity.id}
              className={`wow-hierarchy-preview-canvas__node wow-hierarchy-preview-canvas__node--${activity.node_type}`}
              style={{
                left: activity.position_x - bounds.left,
                top: activity.position_y - bounds.top,
                width: size.width,
                height: size.height,
              }}
            >
              <span className="wow-hierarchy-preview-canvas__label">{activity.label}</span>
            </div>
          )
        })}
        {sourceObjects.map((source) => (
            <div
              key={source.id}
              className="wow-hierarchy-preview-canvas__node wow-hierarchy-preview-canvas__node--quelle"
              style={{
                left: source.position_x - bounds.left,
                top: source.position_y - bounds.top,
                width: NODE_SIZES.quelle.width,
                height: NODE_SIZES.quelle.height,
              }}
            >
              <span className="wow-hierarchy-preview-canvas__label">{source.name}</span>
            </div>
          ))}
      </div>
      </div>
    </div>
  )
}
