import type { ViewportCenter, WorkspaceViewMemory } from '../types'

export const WORKSPACE_VIEW_MEMORY_KEY = 'workspace_view_memory'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isViewportCenter(value: unknown): value is ViewportCenter {
  if (!isObject(value)) {
    return false
  }

  return (
    typeof value.x === 'number' &&
    Number.isFinite(value.x) &&
    typeof value.y === 'number' &&
    Number.isFinite(value.y) &&
    typeof value.zoom === 'number' &&
    Number.isFinite(value.zoom)
  )
}

export function normalizeWorkspaceViewMemory(value: unknown): WorkspaceViewMemory {
  if (!isObject(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([workspaceId, viewport]) =>
      isViewportCenter(viewport) ? [[workspaceId, viewport]] : [],
    ),
  )
}
