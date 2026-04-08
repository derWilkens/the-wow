import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
    assignee_label: 'AG BIM-Koordinator',
    role_id: 'role-1',
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
  it('shows role and assignee labels on the activity card, but not the description text', () => {
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
          onInlineRename: vi.fn(),
        }}
        targetPosition={Position.Left}
        sourcePosition={Position.Right}
      />,
    )

    const title = screen.getByTestId('activity-inline-label-activity-1')
    expect(screen.getByTestId('activity-role-activity-1')).toHaveTextContent('Sachbearbeitung')
    expect(screen.getByTestId('activity-assignee-activity-1')).toHaveTextContent('Max Mustermann')
    expect(screen.queryByText('Aktivität')).not.toBeInTheDocument()
    expect(screen.queryByText('Beschreibung')).not.toBeInTheDocument()
    expect(title).toHaveClass('wow-activity-node__title--default')
    expect(title).toHaveStyle({ textAlign: 'center' })
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
          onInlineRename: vi.fn(),
        }}
        targetPosition={Position.Left}
        sourcePosition={Position.Right}
      />,
    )

    expect(screen.queryByTestId('activity-role-activity-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('activity-assignee-activity-1')).not.toBeInTheDocument()
  })

  it('adds preview classes when handles should be shown for a connection target', () => {
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
          showHandles: true,
          isConnectionPreviewTarget: true,
          onOpenDetail: vi.fn(),
          onOpenSubprocessMenu: vi.fn(),
          onOpenSubprocess: vi.fn(),
          onInlineRename: vi.fn(),
        }}
        targetPosition={Position.Left}
        sourcePosition={Position.Right}
      />,
    )

    expect(screen.getByTestId('activity-node-activity-1')).toHaveClass('wow-node--handles-visible')
    expect(screen.getByTestId('activity-node-activity-1')).toHaveClass('wow-node--connection-preview-target')
  })

  it('shows a custom description tooltip only on hover or focus of the name', () => {
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
          activity: createActivity({ description: 'Tooltip Beschreibung' }),
          hasChildren: false,
          roleLabel: 'Sachbearbeitung',
          assigneeLabel: 'Max Mustermann',
          groupingMode: 'free',
          onOpenDetail: vi.fn(),
          onOpenSubprocessMenu: vi.fn(),
          onOpenSubprocess: vi.fn(),
          onInlineRename: vi.fn(),
        }}
        targetPosition={Position.Left}
        sourcePosition={Position.Right}
      />,
    )

    expect(screen.queryByTestId('activity-description-tooltip-activity-1')).not.toBeInTheDocument()
    fireEvent.mouseEnter(screen.getByTestId('activity-inline-label-activity-1'))
    expect(screen.getByTestId('activity-description-tooltip-activity-1')).toHaveTextContent('Tooltip Beschreibung')
    fireEvent.mouseLeave(screen.getByTestId('activity-inline-label-activity-1'))
    expect(screen.queryByTestId('activity-description-tooltip-activity-1')).not.toBeInTheDocument()
    fireEvent.focus(screen.getByTestId('activity-inline-label-activity-1'))
    expect(screen.getByTestId('activity-description-tooltip-activity-1')).toBeVisible()
  })

  it('does not show a tooltip when no description exists', () => {
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
          activity: createActivity({ description: null }),
          hasChildren: false,
          roleLabel: 'Sachbearbeitung',
          assigneeLabel: 'Max Mustermann',
          groupingMode: 'free',
          onOpenDetail: vi.fn(),
          onOpenSubprocessMenu: vi.fn(),
          onOpenSubprocess: vi.fn(),
          onInlineRename: vi.fn(),
        }}
        targetPosition={Position.Left}
        sourcePosition={Position.Right}
      />,
    )

    fireEvent.mouseEnter(screen.getByTestId('activity-inline-label-activity-1'))
    expect(screen.queryByTestId('activity-description-tooltip-activity-1')).not.toBeInTheDocument()
  })

  it('uses a stronger compact title style for long names', () => {
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
          activity: createActivity({
            label: 'Sehr langer Aktivitaetsname fuer einen stabilen Umbruch auf zwei Zeilen im festen Knoten',
          }),
          hasChildren: false,
          roleLabel: 'Sachbearbeitung',
          assigneeLabel: 'Max Mustermann',
          groupingMode: 'free',
          onOpenDetail: vi.fn(),
          onOpenSubprocessMenu: vi.fn(),
          onOpenSubprocess: vi.fn(),
          onInlineRename: vi.fn(),
        }}
        targetPosition={Position.Left}
        sourcePosition={Position.Right}
      />,
    )

    expect(screen.getByTestId('activity-inline-label-activity-1')).toHaveClass('wow-activity-node__title--compact-strong')
    expect(screen.getByTestId('activity-inline-label-activity-1')).toHaveAttribute('data-title-density', 'compact-strong')
  })

  it('opens detail on double click, supports inline rename and uses the centered subprocess marker', async () => {
    const onOpenDetail = vi.fn()
    const onOpenSubprocessMenu = vi.fn()
    const onInlineRename = vi.fn().mockResolvedValue(undefined)

    render(
      <ActivityNode
        id="activity-1"
        type="activity"
        zIndex={1}
        selected
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
          onInlineRename,
        }}
        targetPosition={Position.Left}
        sourcePosition={Position.Right}
      />,
    )

    fireEvent.doubleClick(screen.getByTestId('activity-node-activity-1'))
    expect(onOpenDetail).toHaveBeenCalledWith('activity-1')

    fireEvent.click(screen.getByTestId('activity-inline-label-activity-1'))
    fireEvent.change(screen.getByTestId('activity-inline-input-activity-1'), { target: { value: 'Neue Bezeichnung' } })
    fireEvent.keyDown(screen.getByTestId('activity-inline-input-activity-1'), { key: 'Enter' })

    await waitFor(() => {
      expect(onInlineRename).toHaveBeenCalledWith('activity-1', 'Neue Bezeichnung')
    })

    fireEvent.click(screen.getByTestId('subprocess-trigger-activity-1'))
    expect(onOpenSubprocessMenu).toHaveBeenCalledWith(
      'activity-1',
      expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
      }),
    )

    expect(screen.getByTestId('subprocess-trigger-activity-1')).toHaveAttribute('data-subprocess-state', 'linked')
  })

  it('renders a ghost subprocess marker when no linked workflow exists', () => {
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
          activity: createActivity({ linked_workflow_id: null }),
          hasChildren: false,
          roleLabel: 'Sachbearbeitung',
          assigneeLabel: 'Max Mustermann',
          groupingMode: 'free',
          onOpenDetail: vi.fn(),
          onOpenSubprocessMenu: vi.fn(),
          onOpenSubprocess: vi.fn(),
          onInlineRename: vi.fn(),
        }}
        targetPosition={Position.Left}
        sourcePosition={Position.Right}
      />,
    )

    expect(screen.getByTestId('subprocess-trigger-activity-1')).toHaveAttribute('data-subprocess-state', 'empty')
  })
})
