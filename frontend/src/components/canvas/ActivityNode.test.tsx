import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Position } from 'reactflow'
import { ActivityNode } from './ActivityNode'
import type { Activity, CatalogRole } from '../../types'

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

const availableRoles: CatalogRole[] = [
  {
    id: 'role-1',
    organization_id: 'org-1',
    label: 'Sachbearbeitung',
    acronym: 'SB',
    description: 'Bearbeitet den Vorgang',
    sort_order: 0,
    created_at: '2026-04-05T00:00:00.000Z',
    created_by: 'user-1',
  },
  {
    id: 'role-2',
    organization_id: 'org-1',
    label: 'BIM-Koordination',
    acronym: 'BK',
    description: 'Koordiniert die BIM-Runde',
    sort_order: 1,
    created_at: '2026-04-05T00:00:00.000Z',
    created_by: 'user-1',
  },
]

describe('ActivityNode', () => {
  it('shows the role badge with acronym and the assignee label on the activity card, but not the description text', () => {
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
          roleAcronym: 'SB',
          availableRoles,
          assigneeLabel: 'Max Mustermann',
          groupingMode: 'free',
          onOpenDetail: vi.fn(),
          onCreateSubprocess: vi.fn(),
          onLinkSubprocess: vi.fn(),
          onUnlinkSubprocess: vi.fn(),
          onDeleteLinkedSubprocess: vi.fn(),
          onOpenSubprocess: vi.fn(),
          onInlineRename: vi.fn(),
        }}
        targetPosition={Position.Left}
        sourcePosition={Position.Right}
      />,
    )

    const title = screen.getByTestId('activity-inline-label-activity-1')
    expect(screen.getByTestId('activity-role-activity-1')).toHaveTextContent('SB')
    expect(screen.queryByText('Sachbearbeitung')).not.toBeInTheDocument()
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
          roleAcronym: 'SB',
          availableRoles,
          assigneeLabel: 'Max Mustermann',
          groupingMode: 'role_lanes',
          onOpenDetail: vi.fn(),
          onCreateSubprocess: vi.fn(),
          onLinkSubprocess: vi.fn(),
          onUnlinkSubprocess: vi.fn(),
          onDeleteLinkedSubprocess: vi.fn(),
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
          roleAcronym: 'SB',
          availableRoles,
          assigneeLabel: 'Max Mustermann',
          groupingMode: 'free',
          showHandles: true,
          isConnectionPreviewTarget: true,
          onOpenDetail: vi.fn(),
          onCreateSubprocess: vi.fn(),
          onLinkSubprocess: vi.fn(),
          onUnlinkSubprocess: vi.fn(),
          onDeleteLinkedSubprocess: vi.fn(),
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
          roleAcronym: 'SB',
          availableRoles,
          assigneeLabel: 'Max Mustermann',
          groupingMode: 'free',
          onOpenDetail: vi.fn(),
          onCreateSubprocess: vi.fn(),
          onLinkSubprocess: vi.fn(),
          onUnlinkSubprocess: vi.fn(),
          onDeleteLinkedSubprocess: vi.fn(),
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
          roleAcronym: 'SB',
          availableRoles,
          assigneeLabel: 'Max Mustermann',
          groupingMode: 'free',
          onOpenDetail: vi.fn(),
          onCreateSubprocess: vi.fn(),
          onLinkSubprocess: vi.fn(),
          onUnlinkSubprocess: vi.fn(),
          onDeleteLinkedSubprocess: vi.fn(),
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
          roleAcronym: 'SB',
          availableRoles,
          assigneeLabel: 'Max Mustermann',
          groupingMode: 'free',
          onOpenDetail: vi.fn(),
          onCreateSubprocess: vi.fn(),
          onLinkSubprocess: vi.fn(),
          onUnlinkSubprocess: vi.fn(),
          onDeleteLinkedSubprocess: vi.fn(),
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

  it('shows the quick type tooltip, opens the type popover and changes the type', async () => {
    const onOpenDetail = vi.fn()
    const onQuickChangeType = vi.fn().mockResolvedValue(undefined)

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
          roleAcronym: 'SB',
          availableRoles,
          assigneeLabel: 'Max Mustermann',
          groupingMode: 'free',
          onOpenDetail,
          onCreateSubprocess: vi.fn(),
          onLinkSubprocess: vi.fn(),
          onUnlinkSubprocess: vi.fn(),
          onDeleteLinkedSubprocess: vi.fn(),
          onOpenSubprocess: vi.fn(),
          onInlineRename: vi.fn(),
          onQuickChangeType,
        }}
        targetPosition={Position.Left}
        sourcePosition={Position.Right}
      />,
    )

    const trigger = screen.getByTestId('activity-type-trigger-activity-1')

    fireEvent.mouseEnter(trigger)
    expect(screen.getByTestId('activity-type-trigger-tooltip-activity-1')).toHaveTextContent('Typ aendern')

    fireEvent.click(trigger)
    expect(screen.getByTestId('activity-type-popover-activity-1')).toBeInTheDocument()
    expect(screen.getAllByTestId(/activity-type-option-activity-1-/)).toHaveLength(5)

    const createOption = screen.getByTestId('activity-type-option-activity-1-erstellen')
    fireEvent.mouseEnter(createOption)
    expect(screen.getByTestId('activity-type-option-tooltip-activity-1')).toHaveTextContent('Erstellen')

    fireEvent.click(createOption)

    await waitFor(() => {
      expect(onQuickChangeType).toHaveBeenCalledWith('activity-1', 'erstellen')
    })
    expect(onOpenDetail).not.toHaveBeenCalled()
  })

  it('renders a stable hovered activity-type popover state for visual debugging', () => {
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
          roleAcronym: 'SB',
          availableRoles,
          assigneeLabel: 'Max Mustermann',
          groupingMode: 'free',
          onOpenDetail: vi.fn(),
          onCreateSubprocess: vi.fn(),
          onLinkSubprocess: vi.fn(),
          onUnlinkSubprocess: vi.fn(),
          onDeleteLinkedSubprocess: vi.fn(),
          onOpenSubprocess: vi.fn(),
          onInlineRename: vi.fn(),
          onQuickChangeType: vi.fn(),
        }}
        targetPosition={Position.Left}
        sourcePosition={Position.Right}
      />,
    )

    fireEvent.click(screen.getByTestId('activity-type-trigger-activity-1'))
    fireEvent.mouseEnter(screen.getByTestId('activity-type-option-activity-1-erstellen'))

    const popover = screen.getByTestId('activity-type-popover-activity-1')
    expect(popover).toBeInTheDocument()
    expect(screen.getByTestId('activity-type-option-tooltip-activity-1')).toHaveTextContent('Erstellen')
    expect(popover).toMatchSnapshot()
  })

  it('closes the type popover via escape and outside click', () => {
    render(
      <div>
        <button type="button" data-testid="outside">
          Outside
        </button>
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
            roleAcronym: 'SB',
            availableRoles,
            assigneeLabel: 'Max Mustermann',
            groupingMode: 'free',
            onOpenDetail: vi.fn(),
          onCreateSubprocess: vi.fn(),
          onLinkSubprocess: vi.fn(),
          onUnlinkSubprocess: vi.fn(),
          onDeleteLinkedSubprocess: vi.fn(),
          onOpenSubprocess: vi.fn(),
            onInlineRename: vi.fn(),
            onQuickChangeType: vi.fn(),
          }}
          targetPosition={Position.Left}
          sourcePosition={Position.Right}
        />
      </div>,
    )

    const trigger = screen.getByTestId('activity-type-trigger-activity-1')

    fireEvent.click(trigger)
    expect(screen.getByTestId('activity-type-popover-activity-1')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByTestId('activity-type-popover-activity-1')).not.toBeInTheDocument()

    fireEvent.click(trigger)
    expect(screen.getByTestId('activity-type-popover-activity-1')).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByTestId('activity-type-popover-activity-1')).not.toBeInTheDocument()
  })

  it('shows the missing-role badge, opens the role popover and creates or assigns roles', async () => {
    const onQuickChangeRole = vi.fn().mockResolvedValue(undefined)
    const onCreateRole = vi.fn().mockResolvedValue({
      id: 'role-3',
      organization_id: 'org-1',
      label: 'Projekt-Leiter',
      acronym: 'PL',
      description: 'Leitet das Projekt',
      sort_order: 2,
      created_at: '2026-04-05T00:00:00.000Z',
      created_by: 'user-1',
    } satisfies CatalogRole)

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
          activity: createActivity({ role_id: null, assignee_label: null }),
          hasChildren: false,
          roleLabel: 'Nicht zugeordnet',
          roleAcronym: null,
          availableRoles,
          assigneeLabel: null,
          groupingMode: 'free',
          onOpenDetail: vi.fn(),
          onCreateSubprocess: vi.fn(),
          onLinkSubprocess: vi.fn(),
          onUnlinkSubprocess: vi.fn(),
          onDeleteLinkedSubprocess: vi.fn(),
          onOpenSubprocess: vi.fn(),
          onInlineRename: vi.fn(),
          onQuickChangeRole,
          onCreateRole,
        }}
        targetPosition={Position.Left}
        sourcePosition={Position.Right}
      />,
    )

    const trigger = screen.getByTestId('activity-role-trigger-activity-1')
    expect(screen.getByTestId('activity-role-activity-1')).toHaveTextContent('?')

    fireEvent.mouseEnter(trigger)
    expect(screen.getByTestId('activity-role-trigger-tooltip-activity-1')).toHaveTextContent('Rolle festlegen')

    fireEvent.click(trigger)
    expect(screen.getByTestId('activity-role-popover-activity-1')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('activity-role-option-activity-1-role-2'))

    await waitFor(() => {
      expect(onQuickChangeRole).toHaveBeenCalledWith('activity-1', 'role-2')
    })

    fireEvent.click(trigger)
    expect(screen.getByTestId('activity-role-create-toggle-activity-1')).toBeInTheDocument()
    expect(screen.queryByTestId('activity-role-create-name-activity-1')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('activity-role-create-toggle-activity-1'))
    fireEvent.change(screen.getByTestId('activity-role-create-name-activity-1'), { target: { value: 'Projekt-Leiter' } })
    fireEvent.change(screen.getByTestId('activity-role-create-acronym-activity-1'), { target: { value: 'PL' } })
    fireEvent.change(screen.getByTestId('activity-role-create-description-activity-1'), {
      target: { value: 'Leitet das Projekt' },
    })
    fireEvent.click(screen.getByTestId('activity-role-create-submit-activity-1'))

    await waitFor(() => {
      expect(onCreateRole).toHaveBeenCalledWith({
        label: 'Projekt-Leiter',
        acronym: 'PL',
        description: 'Leitet das Projekt',
      })
      expect(onQuickChangeRole).toHaveBeenCalledWith('activity-1', 'role-3')
    })
  })

  it('opens detail on double click, supports inline rename and opens the linked subprocess on click', async () => {
    const onOpenDetail = vi.fn()
    const onOpenSubprocess = vi.fn()
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
          roleAcronym: 'SB',
          availableRoles,
          assigneeLabel: 'Max Mustermann',
          groupingMode: 'free',
          onOpenDetail,
          onOpenSubprocess,
          onCreateSubprocess: vi.fn(),
          onLinkSubprocess: vi.fn(),
          onUnlinkSubprocess: vi.fn(),
          onDeleteLinkedSubprocess: vi.fn(),
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
    expect(onOpenSubprocess).toHaveBeenCalledWith('activity-1')

    expect(screen.getByTestId('subprocess-trigger-activity-1')).toHaveAttribute('data-subprocess-state', 'linked')
  })

  it('opens the compact create/link popover for unlinked subprocesses', () => {
    const onCreateSubprocess = vi.fn()
    const onLinkSubprocess = vi.fn()

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
          roleAcronym: 'SB',
          availableRoles,
          assigneeLabel: 'Max Mustermann',
          groupingMode: 'free',
          onOpenDetail: vi.fn(),
          onCreateSubprocess,
          onLinkSubprocess,
          onUnlinkSubprocess: vi.fn(),
          onDeleteLinkedSubprocess: vi.fn(),
          onOpenSubprocess: vi.fn(),
          onInlineRename: vi.fn(),
        }}
        targetPosition={Position.Left}
        sourcePosition={Position.Right}
      />,
    )

    fireEvent.click(screen.getByTestId('subprocess-trigger-activity-1'))
    expect(screen.getByTestId('subprocess-create-popover-activity-1')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('subprocess-create-option-activity-1-new'))
    expect(onCreateSubprocess).toHaveBeenCalledWith('activity-1')

    fireEvent.click(screen.getByTestId('subprocess-trigger-activity-1'))
    fireEvent.click(screen.getByTestId('subprocess-create-option-activity-1-link'))
    expect(onLinkSubprocess).toHaveBeenCalledWith('activity-1')
    expect(screen.getByTestId('subprocess-trigger-activity-1')).toHaveAttribute('data-subprocess-state', 'empty')
  })

  it('opens the linked subprocess action popover on delayed hover and supports unlink/delete actions', () => {
    vi.useFakeTimers()
    const onUnlinkSubprocess = vi.fn()
    const onDeleteLinkedSubprocess = vi.fn()

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
          hasChildren: false,
          roleLabel: 'Sachbearbeitung',
          roleAcronym: 'SB',
          availableRoles,
          assigneeLabel: 'Max Mustermann',
          groupingMode: 'free',
          onOpenDetail: vi.fn(),
          onCreateSubprocess: vi.fn(),
          onLinkSubprocess: vi.fn(),
          onUnlinkSubprocess,
          onDeleteLinkedSubprocess,
          onOpenSubprocess: vi.fn(),
          onInlineRename: vi.fn(),
        }}
        targetPosition={Position.Left}
        sourcePosition={Position.Right}
      />,
    )

    const trigger = screen.getByTestId('subprocess-trigger-activity-1')
    const control = trigger.parentElement as HTMLElement

    fireEvent.mouseEnter(control)
    act(() => {
      vi.advanceTimersByTime(249)
    })
    expect(screen.queryByTestId('subprocess-actions-popover-activity-1')).not.toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByTestId('subprocess-actions-popover-activity-1')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('subprocess-action-activity-1-unlink'))
    expect(onUnlinkSubprocess).toHaveBeenCalledWith('activity-1')

    fireEvent.mouseEnter(control)
    act(() => {
      vi.advanceTimersByTime(250)
    })
    fireEvent.click(screen.getByTestId('subprocess-action-activity-1-delete'))
    expect(screen.getByTestId('subprocess-delete-confirm-activity-1')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('subprocess-delete-confirm-button-activity-1'))
    expect(onDeleteLinkedSubprocess).toHaveBeenCalledWith('activity-1')

    vi.useRealTimers()
  })
})


