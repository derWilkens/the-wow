import { render, screen, waitFor } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { HierarchyPreviewCanvas } from './HierarchyPreviewCanvas'
import type { Activity } from '../../types'

class ResizeObserverMock {
  private readonly callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: {
            x: 0,
            y: 0,
            width: 640,
            height: 360,
            top: 0,
            left: 0,
            bottom: 360,
            right: 640,
            toJSON: () => ({}),
          },
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    )
  }

  unobserve() {}

  disconnect() {}
}

const originalResizeObserver = window.ResizeObserver
const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect

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
    updated_at: '2026-04-16T00:00:00.000Z',
    ...overrides,
  }
}

describe('HierarchyPreviewCanvas', () => {
  beforeAll(() => {
    window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
    HTMLElement.prototype.getBoundingClientRect = function () {
      if (this instanceof HTMLElement && this.dataset.testid === 'hierarchy-preview-canvas') {
        return {
          x: 0,
          y: 0,
          width: 640,
          height: 360,
          top: 0,
          left: 0,
          bottom: 360,
          right: 640,
          toJSON: () => ({}),
        } as DOMRect
      }

      return originalGetBoundingClientRect.call(this)
    }
  })

  afterAll(() => {
    window.ResizeObserver = originalResizeObserver
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect
  })

  it('keeps the origin zoom when previewLayout.mode is origin_zoom', async () => {
    render(
      <HierarchyPreviewCanvas
        activities={[createActivity()]}
        canvasObjects={[]}
        canvasEdges={[]}
        previewLayout={{
          mode: 'origin_zoom',
          zoom: 0.9,
          innerPadding: 28,
        }}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('hierarchy-preview-canvas')).toHaveAttribute('data-preview-mode', 'origin_zoom')
    })

    const stage = document.querySelector('.wow-hierarchy-preview-canvas__stage') as HTMLElement | null
    expect(stage?.style.transform).toContain('scale(0.9)')
  })

  it('switches to fit-view scaling and keeps the content inside the padded preview area', async () => {
    render(
      <HierarchyPreviewCanvas
        activities={[
          createActivity({ id: 'a1', position_x: 100, position_y: 80 }),
          createActivity({ id: 'a2', position_x: 920, position_y: 620 }),
        ]}
        canvasObjects={[]}
        canvasEdges={[]}
        previewLayout={{
          mode: 'fit_view',
          zoom: 1.4,
          innerPadding: 28,
        }}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('hierarchy-preview-canvas')).toHaveAttribute('data-preview-mode', 'fit_view')
    })

    const stage = document.querySelector('.wow-hierarchy-preview-canvas__stage') as HTMLElement | null
    expect(stage).not.toBeNull()
    expect(stage?.style.transform).toContain('translate(')
    expect(stage?.style.transform).toContain('scale(')
    expect(stage?.style.transform).not.toContain('scale(1.4)')
  })
})
