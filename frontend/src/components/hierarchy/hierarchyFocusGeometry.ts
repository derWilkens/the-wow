import type { Activity, CanvasObject, HierarchyFocusPreviewLayout, HierarchyFocusRects } from '../../types'

const NODE_SIZES = {
  activity: { width: 220, height: 140 },
  start_event: { width: 56, height: 56 },
  end_event: { width: 56, height: 56 },
  gateway_decision: { width: 120, height: 120 },
  gateway_merge: { width: 120, height: 120 },
  quelle: { width: 176, height: 64 },
} as const

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

const HIERARCHY_MAX_VIEWPORT_RATIO = 0.8
const HIERARCHY_CARD_MIN_WIDTH = 420
const HIERARCHY_CARD_MIN_HEIGHT = 280
const HIERARCHY_CARD_HEADER_HEIGHT = 92
const HIERARCHY_CARD_BODY_PADDING_X = 32
const HIERARCHY_CARD_BODY_PADDING_Y = 32
const HIERARCHY_PREVIEW_INNER_PADDING = 28

function getContentBounds(activities: Activity[], canvasObjects: CanvasObject[]) {
  const bounds = {
    left: Number.POSITIVE_INFINITY,
    top: Number.POSITIVE_INFINITY,
    right: Number.NEGATIVE_INFINITY,
    bottom: Number.NEGATIVE_INFINITY,
  }

  for (const activity of activities) {
    const size = NODE_SIZES[activity.node_type]
    bounds.left = Math.min(bounds.left, activity.position_x)
    bounds.top = Math.min(bounds.top, activity.position_y)
    bounds.right = Math.max(bounds.right, activity.position_x + size.width)
    bounds.bottom = Math.max(bounds.bottom, activity.position_y + size.height)
  }

  for (const canvasObject of canvasObjects) {
    if (canvasObject.object_type !== 'quelle') {
      continue
    }
    const size = NODE_SIZES.quelle
    bounds.left = Math.min(bounds.left, canvasObject.position_x)
    bounds.top = Math.min(bounds.top, canvasObject.position_y)
    bounds.right = Math.max(bounds.right, canvasObject.position_x + size.width)
    bounds.bottom = Math.max(bounds.bottom, canvasObject.position_y + size.height)
  }

  if (!Number.isFinite(bounds.left)) {
    return { width: 520, height: 320 }
  }

  return {
    width: Math.max(360, bounds.right - bounds.left + 96),
    height: Math.max(240, bounds.bottom - bounds.top + 96),
  }
}

export function deriveHierarchyFocusRects(input: {
  viewport: { x: number; y: number; width: number; height: number; zoom: number }
  originRect: { x: number; y: number; width: number; height: number }
  activities: Activity[]
  canvasObjects: CanvasObject[]
}): HierarchyFocusRects & { previewLayout: HierarchyFocusPreviewLayout } {
  const { viewport, originRect, activities, canvasObjects } = input
  const content = getContentBounds(activities, canvasObjects)
  const preferredZoom = clamp(viewport.zoom || 1, 0.2, 2.5)
  const desiredPreviewWidth = content.width * preferredZoom + HIERARCHY_CARD_BODY_PADDING_X * 2 + HIERARCHY_PREVIEW_INNER_PADDING * 2
  const desiredPreviewHeight =
    content.height * preferredZoom +
    HIERARCHY_CARD_HEADER_HEIGHT +
    HIERARCHY_CARD_BODY_PADDING_Y * 2 +
    HIERARCHY_PREVIEW_INNER_PADDING * 2
  const maxPreviewWidth = Math.max(HIERARCHY_CARD_MIN_WIDTH, viewport.width * HIERARCHY_MAX_VIEWPORT_RATIO)
  const maxPreviewHeight = Math.max(HIERARCHY_CARD_MIN_HEIGHT, viewport.height * HIERARCHY_MAX_VIEWPORT_RATIO)
  const useFitView = desiredPreviewWidth > maxPreviewWidth || desiredPreviewHeight > maxPreviewHeight
  const previewWidth = clamp(desiredPreviewWidth, HIERARCHY_CARD_MIN_WIDTH, maxPreviewWidth)
  const previewHeight = clamp(desiredPreviewHeight, HIERARCHY_CARD_MIN_HEIGHT, maxPreviewHeight)
  const previewRect = {
    x: viewport.x + (viewport.width - previewWidth) / 2,
    y: viewport.y + (viewport.height - previewHeight) / 2,
    width: previewWidth,
    height: previewHeight,
  }
  const maximizedRect = {
    x: viewport.x + 28,
    y: viewport.y + 28,
    width: Math.max(420, viewport.width - 56),
    height: Math.max(280, viewport.height - 56),
  }

  return {
    originRect,
    previewRect,
    maximizedRect,
    previewLayout: {
      mode: useFitView ? 'fit_view' : 'origin_zoom',
      zoom: preferredZoom,
      innerPadding: HIERARCHY_PREVIEW_INNER_PADDING,
    },
  }
}
