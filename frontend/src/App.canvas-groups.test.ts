import { describe, expect, it } from 'vitest'
import { findContainingCanvasGroupId, getCanvasItemBounds } from './App'
import type { CanvasGroup } from './types'

function createGroup(overrides: Partial<CanvasGroup> = {}): CanvasGroup {
  return {
    id: 'group-1',
    workspace_id: 'workspace-1',
    parent_activity_id: null,
    label: 'Gruppe 1',
    position_x: 100,
    position_y: 100,
    width: 420,
    height: 280,
    locked: false,
    z_index: 0,
    created_at: '2026-04-18T00:00:00.000Z',
    created_by: 'user-1',
    ...overrides,
  }
}

describe('canvas group containment helpers', () => {
  it('returns the smallest containing group for a dragged node', () => {
    const bounds = getCanvasItemBounds({
      position_x: 210,
      position_y: 180,
      width: 220,
      height: 140,
    })

    const groupId = findContainingCanvasGroupId(bounds, [
      createGroup({ id: 'group-large', width: 600, height: 420 }),
      createGroup({ id: 'group-small', position_x: 140, position_y: 140, width: 340, height: 240 }),
    ])

    expect(groupId).toBe('group-small')
  })

  it('returns null when the node center leaves every group interior', () => {
    const bounds = getCanvasItemBounds({
      position_x: 20,
      position_y: 20,
      width: 220,
      height: 140,
    })

    const groupId = findContainingCanvasGroupId(bounds, [createGroup()])

    expect(groupId).toBeNull()
  })

  it('treats collapsed as a regular persisted group flag', () => {
    const group = createGroup({ collapsed: true })
    expect(group.collapsed).toBe(true)
  })
})
