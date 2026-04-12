import { describe, expect, it } from 'vitest'
import { deriveHierarchyFocusRects } from './hierarchyFocusGeometry'
import type { Activity } from '../../types'

function createActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'activity-1',
    workspace_id: 'workspace-1',
    parent_id: null,
    owner_id: 'user-1',
    assignee_label: null,
    role_id: null,
    node_type: 'activity',
    label: 'Pruefen',
    trigger_type: null,
    position_x: 100,
    position_y: 80,
    status: 'draft',
    status_icon: null,
    activity_type: 'unbestimmt',
    description: null,
    notes: null,
    duration_minutes: null,
    linked_workflow_id: null,
    linked_workflow_mode: null,
    linked_workflow_purpose: null,
    linked_workflow_inputs: [],
    linked_workflow_outputs: [],
    updated_at: '2026-04-12T00:00:00.000Z',
    ...overrides,
  }
}

describe('deriveHierarchyFocusRects', () => {
  it('derives centered preview and maximized rects from viewport and child content', () => {
    const rects = deriveHierarchyFocusRects({
      viewport: { x: 20, y: 30, width: 1200, height: 900, zoom: 0.8 },
      originRect: { x: 60, y: 80, width: 220, height: 140 },
      activities: [
        createActivity({ id: 'a1', position_x: 120, position_y: 100 }),
        createActivity({ id: 'a2', position_x: 360, position_y: 220 }),
      ],
      canvasObjects: [],
    })

    expect(rects.originRect).toEqual({ x: 60, y: 80, width: 220, height: 140 })
    expect(rects.previewRect.width).toBeGreaterThanOrEqual(420)
    expect(rects.previewRect.height).toBeGreaterThanOrEqual(280)
    expect(rects.previewRect.x).toBeGreaterThan(20)
    expect(rects.previewRect.y).toBeGreaterThan(30)
    expect(rects.previewLayout.mode).toBe('origin_zoom')
    expect(rects.previewLayout.zoom).toBe(0.8)
    expect(rects.maximizedRect).toEqual({
      x: 48,
      y: 58,
      width: 1144,
      height: 844,
    })
  })

  it('caps the expanded preview at 80 percent viewport usage and switches to fit view when origin zoom would exceed it', () => {
    const rects = deriveHierarchyFocusRects({
      viewport: { x: 0, y: 0, width: 1000, height: 700, zoom: 1.6 },
      originRect: { x: 60, y: 80, width: 220, height: 140 },
      activities: [
        createActivity({ id: 'a1', position_x: 120, position_y: 100 }),
        createActivity({ id: 'a2', position_x: 920, position_y: 640 }),
      ],
      canvasObjects: [],
    })

    expect(rects.previewRect.width).toBeLessThanOrEqual(800)
    expect(rects.previewRect.height).toBeLessThanOrEqual(560)
    expect(rects.previewLayout.mode).toBe('fit_view')
    expect(rects.previewLayout.innerPadding).toBeGreaterThan(0)
  })
})
