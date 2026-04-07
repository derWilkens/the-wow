import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Position } from 'reactflow'
import { ActivityNode } from './ActivityNode'
import type { Activity } from '../../types'

vi.mock('reactflow', async () => {
  const React = await import('react')

  return {
    Position: {
      Left: 'left',
      Right: 'right',
      Top: 'top',
      Bottom: 'bottom',
    },
    Handle: ({ id, type }: { id: string; type: string }) => <div data-testid={`handle-${type}-${id}`} />,
  }
})

function createActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'activity-1',
    workspace_id: 'workspace-1',
    parent_id: null,
    owner_id: 'user-1',
    assignee_user_id: 'user-2',
    node_type: 'activity',
    label: 'Rechnung pruefen',
    trigger_type: null,
    position_x: 100,
    position_y: 140,
    status: 'draft',
    status_icon: 'ok',
    activity_type: 'pruefen_freigeben',
    description: 'Beschreibung',
    notes: null,
    duration_minutes: null,
    linked_workflow_id: null,
    linked_workflow_mode: null,
    linked_workflow_purpose: null,
    linked_workflow_inputs: [],
    linked_workflow_outputs: [],
    updated_at: '2026-04-05T00:00:00.000Z',
    ...overrides,
  }
}

describe('ActivityNode', () => {
  it('shows the derived role label on the activity card', () => {
    render(
      <ActivityNode
        id="activity-1"
        type="activity"
        zIndex={1}
        selected={false}
        isConnectable
        xPos={100}
        yPos={100}
        dragging={false}
        dragHandle={undefined}
        data={{
          activity: createActivity(),
          hasChildren: false,
          roleLabel: 'Sachbearbeitung',
          assigneeLabel: 'Max Mustermann',
          groupingMode: 'free',
          onOpenDetail: vi.fn(),
          onOpenSubprocessMenu: vi.fn(),
          onOpenSubprocess: vi.fn(),
        }}
        targetPosition={Position.Left}
        sourcePosition={Position.Right}
      />
    )

    expect(screen.getByTestId('activity-role-activity-1')).toHaveTextContent('Sachbearbeitung')
    expect(screen.getByTestId('activity-assignee-activity-1')).toHaveTextContent('Max Mustermann')
  })

  it('hides role and assignee metadata in swimlane mode', () => {
    render(
      <ActivityNode
        id="activity-1"
        type="activity"
        zIndex={1}
        selected={false}
        isConnectable
        xPos={100}
        yPos={100}
        dragging={false}
        dragHandle={undefined}
        data={{
          activity: createActivity(),
          hasChildren: false,
          roleLabel: 'Sachbearbeitung',
          assigneeLabel: 'Max Mustermann',
          groupingMode: 'role_lanes',
          onOpenDetail: vi.fn(),
          onOpenSubprocessMenu: vi.fn(),
          onOpenSubprocess: vi.fn(),
        }}
        targetPosition={Position.Left}
        sourcePosition={Position.Right}
      />
    )

    expect(screen.queryByTestId('activity-role-activity-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('activity-assignee-activity-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('activity-owner-activity-1')).not.toBeInTheDocument()
  })

  it('opens detail on double click and subprocess menu on action click', () => {
    const onOpenDetail = vi.fn()
    const onOpenSubprocessMenu = vi.fn()

    render(
      <ActivityNode
        id="activity-1"
        type="activity"
        zIndex={1}
        selected={false}
        isConnectable
        xPos={100}
        yPos={100}
        dragging={false}
        dragHandle={undefined}
        data={{
          activity: createActivity({ linked_workflow_id: 'workspace-2' }),
          hasChildren: true,
          roleLabel: 'Sachbearbeitung',
          assigneeLabel: 'Max Mustermann',
          groupingMode: 'free',
          onOpenDetail,
          onOpenSubprocessMenu,
          onOpenSubprocess: vi.fn(),
        }}
        targetPosition={Position.Left}
        sourcePosition={Position.Right}
      />
    )

    fireEvent.doubleClick(screen.getByTestId('activity-node-activity-1'))
    expect(onOpenDetail).toHaveBeenCalledWith('activity-1')

    fireEvent.click(screen.getByTestId('subprocess-trigger-activity-1'))
    expect(onOpenSubprocessMenu).toHaveBeenCalledWith('activity-1', expect.objectContaining({
      x: expect.any(Number),
      y: expect.any(Number),
    }))

    expect(screen.getByTestId('subprocess-badge-activity-1')).toHaveTextContent('Ablauf verknüpft')
  })
})
