import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HierarchyFocusOverlay } from './HierarchyFocusOverlay'
import type { Activity, HierarchyFocusSession } from '../../types'

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
    position_x: 120,
    position_y: 100,
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

const session: HierarchyFocusSession = {
  originActivityId: 'activity-1',
  originActivityLabel: 'Pruefen',
  originWorkspaceId: 'workspace-1',
  originWorkspaceName: 'Parent',
  originCanvasCenter: { x: 640, y: 360, zoom: 0.9 },
  childWorkspaceId: 'workspace-2',
  childWorkspaceName: 'Child',
  viewportSnapshot: { x: 0, y: 0, width: 1200, height: 800, zoom: 0.9 },
  rects: {
    originRect: { x: 100, y: 120, width: 220, height: 140 },
    previewRect: { x: 280, y: 160, width: 640, height: 420 },
    maximizedRect: { x: 24, y: 24, width: 1152, height: 752 },
  },
  previewLayout: {
    mode: 'origin_zoom',
    zoom: 0.9,
    innerPadding: 28,
  },
}

describe('HierarchyFocusOverlay', () => {
  it('renders an interactive expanded preview with maximize and collapse actions', () => {
    render(
      <HierarchyFocusOverlay
        session={session}
        phase="expanded"
        activities={[createActivity()]}
        canvasObjects={[]}
        canvasEdges={[]}
        onMaximize={vi.fn()}
        onMinimize={vi.fn()}
        onCollapse={vi.fn()}
      />,
    )

    expect(screen.getByTestId('hierarchy-focus-overlay')).toBeInTheDocument()
    expect(screen.getByTestId('hierarchy-focus-maximize')).toBeInTheDocument()
    expect(screen.getByTestId('hierarchy-focus-collapse')).toBeInTheDocument()
    expect(screen.getByTestId('hierarchy-preview-canvas')).toBeInTheDocument()
    expect(document.querySelector('.wow-hierarchy-focus-overlay__scrim--blurred')).toBeTruthy()
  })

  it('renders a floating minimize button when the focus state is maximized', () => {
    render(
      <HierarchyFocusOverlay
        session={session}
        phase="maximized"
        activities={[createActivity()]}
        canvasObjects={[]}
        canvasEdges={[]}
        onMaximize={vi.fn()}
        onMinimize={vi.fn()}
        onCollapse={vi.fn()}
      />,
    )

    expect(screen.getByTestId('hierarchy-focus-minimize')).toBeInTheDocument()
  })
})
