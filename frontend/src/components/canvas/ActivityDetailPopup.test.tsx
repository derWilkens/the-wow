import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ActivityDetailPopup } from './ActivityDetailPopup'
import type { Activity, CanvasEdge, CanvasObject, ITTool } from '../../types'

const mockUseUpsertActivity = vi.fn()
const mockUseActivityComments = vi.fn()
const mockUseCreateActivityComment = vi.fn()
const mockUseUpdateActivityComment = vi.fn()
const mockUseDeleteActivityComment = vi.fn()
const mockUseActivityTools = vi.fn()
const mockUseITTools = vi.fn()
const mockUseCreateITTool = vi.fn()
const mockUseLinkActivityTool = vi.fn()
const mockUseUnlinkActivityTool = vi.fn()
const mockUseCheckSources = vi.fn()
const mockUseAddCheckSource = vi.fn()
const mockUseRemoveCheckSource = vi.fn()
const mockUseOrganizationMembers = vi.fn()

vi.mock('../../api/activities', () => ({
  useUpsertActivity: (...args: unknown[]) => mockUseUpsertActivity(...args),
  useActivityComments: (...args: unknown[]) => mockUseActivityComments(...args),
  useCreateActivityComment: (...args: unknown[]) => mockUseCreateActivityComment(...args),
  useUpdateActivityComment: (...args: unknown[]) => mockUseUpdateActivityComment(...args),
  useDeleteActivityComment: (...args: unknown[]) => mockUseDeleteActivityComment(...args),
}))

vi.mock('../../api/activityResources', () => ({
  useActivityTools: (...args: unknown[]) => mockUseActivityTools(...args),
  useITTools: (...args: unknown[]) => mockUseITTools(...args),
  useCreateITTool: (...args: unknown[]) => mockUseCreateITTool(...args),
  useLinkActivityTool: (...args: unknown[]) => mockUseLinkActivityTool(...args),
  useUnlinkActivityTool: (...args: unknown[]) => mockUseUnlinkActivityTool(...args),
  useCheckSources: (...args: unknown[]) => mockUseCheckSources(...args),
  useAddCheckSource: (...args: unknown[]) => mockUseAddCheckSource(...args),
  useRemoveCheckSource: (...args: unknown[]) => mockUseRemoveCheckSource(...args),
}))

vi.mock('../../api/organizations', () => ({
  useOrganizationMembers: (...args: unknown[]) => mockUseOrganizationMembers(...args),
}))

function createActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'activity-1',
    workspace_id: 'workspace-1',
    parent_id: null,
    owner_id: 'user-1',
    assignee_user_id: null,
    node_type: 'activity',
    label: 'Rechnung pruefen',
    trigger_type: null,
    position_x: 100,
    position_y: 100,
    status: 'draft',
    status_icon: null,
    activity_type: 'pruefen_freigeben',
    description: 'Beschreibung',
    notes: null,
    duration_minutes: 10,
    linked_workflow_id: null,
    linked_workflow_mode: null,
    linked_workflow_purpose: null,
    linked_workflow_inputs: [],
    linked_workflow_outputs: [],
    updated_at: '2026-04-03T00:00:00.000Z',
    ...overrides,
  }
}

function createTool(id: string, name: string, description: string | null = null): ITTool {
  return {
    id,
    organization_id: 'org-1',
    name,
    description,
    created_at: '2026-04-03T00:00:00.000Z',
    created_by: 'user-1',
  }
}

const defaultCanvasObjects: CanvasObject[] = []
const defaultCanvasEdges: CanvasEdge[] = []

describe('ActivityDetailPopup', () => {
  beforeEach(() => {
    mockUseUpsertActivity.mockReturnValue({ mutateAsync: vi.fn() })
    mockUseActivityTools.mockReturnValue({ data: [] })
    mockUseActivityComments.mockReturnValue({ data: [] })
    mockUseCreateActivityComment.mockReturnValue({ mutateAsync: vi.fn() })
    mockUseUpdateActivityComment.mockReturnValue({ mutateAsync: vi.fn() })
    mockUseDeleteActivityComment.mockReturnValue({ mutateAsync: vi.fn() })
    mockUseITTools.mockReturnValue({ data: [] })
    mockUseCreateITTool.mockReturnValue({ mutateAsync: vi.fn() })
    mockUseLinkActivityTool.mockReturnValue({ mutateAsync: vi.fn() })
    mockUseUnlinkActivityTool.mockReturnValue({ mutateAsync: vi.fn() })
    mockUseCheckSources.mockReturnValue({ data: [] })
    mockUseAddCheckSource.mockReturnValue({ mutateAsync: vi.fn() })
    mockUseRemoveCheckSource.mockReturnValue({ mutateAsync: vi.fn() })
    mockUseOrganizationMembers.mockReturnValue({ data: [] })
  })

  it('shows linked IT tools as chips and filters them from the selectable catalog', () => {
    mockUseActivityTools.mockReturnValue({ data: [createTool('tool-1', 'SAP')] })
    mockUseITTools.mockReturnValue({ data: [createTool('tool-1', 'SAP'), createTool('tool-2', 'Outlook')] })

    render(
      <ActivityDetailPopup
        activity={createActivity({ activity_type: 'erstellen' })}
        workspaceId="workspace-1"
        organizationId="org-1"
        currentUserId="user-1"
        canvasObjects={defaultCanvasObjects}
        canvasEdges={defaultCanvasEdges}
        connectionCount={2}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByTestId('activity-tool-chip-tool-1')).toHaveTextContent('SAP')
    fireEvent.click(screen.getByTestId('activity-tool-select-trigger'))
    expect(screen.getByTestId('activity-tool-select-option-tool-2')).toHaveTextContent('Outlook')
    expect(screen.queryByTestId('activity-tool-select-option-tool-1')).not.toBeInTheDocument()
  })

  it('creates a new IT tool and links it immediately from the detail dialog', async () => {
    const createToolMutation = vi.fn().mockResolvedValue(createTool('tool-3', 'SharePoint', 'Dokumentenablage'))
    const linkToolMutation = vi.fn().mockResolvedValue(createTool('tool-3', 'SharePoint', 'Dokumentenablage'))
    mockUseCreateITTool.mockReturnValue({ mutateAsync: createToolMutation })
    mockUseLinkActivityTool.mockReturnValue({ mutateAsync: linkToolMutation })

    render(
      <ActivityDetailPopup
        activity={createActivity({ activity_type: 'erstellen' })}
        workspaceId="workspace-1"
        organizationId="org-1"
        currentUserId="user-1"
        canvasObjects={defaultCanvasObjects}
        canvasEdges={defaultCanvasEdges}
        connectionCount={2}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTestId('activity-tool-select-trigger'))
    fireEvent.click(screen.getByTestId('activity-tool-select-create-toggle'))
    const submit = screen.getByTestId('activity-tool-select-create-submit')
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByTestId('activity-tool-select-create-name'), {
      target: { value: 'SharePoint' },
    })
    fireEvent.change(screen.getByTestId('activity-tool-select-create-description'), {
      target: { value: 'Dokumentenablage' },
    })

    expect(submit).not.toBeDisabled()
    await act(async () => {
      fireEvent.click(submit)
    })

    await waitFor(() => {
      expect(createToolMutation).toHaveBeenCalledWith({
        name: 'SharePoint',
        description: 'Dokumentenablage',
      })
      expect(linkToolMutation).toHaveBeenCalledWith('tool-3')
    })
  })

  it('lets the user assign an executor and saves the derived assignee id', async () => {
    const upsertMutation = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    mockUseUpsertActivity.mockReturnValue({ mutateAsync: upsertMutation })
    mockUseOrganizationMembers.mockReturnValue({
      data: [
        {
          organization_id: 'org-1',
          user_id: 'user-2',
          email: 'sachbearbeitung@example.com',
          role: 'member',
          created_at: '2026-04-04T00:00:00.000Z',
        },
      ],
    })

    render(
      <ActivityDetailPopup
        activity={createActivity({ activity_type: 'erstellen' })}
        workspaceId="workspace-1"
        organizationId="org-1"
        currentUserId="user-1"
        canvasObjects={defaultCanvasObjects}
        canvasEdges={defaultCanvasEdges}
        connectionCount={2}
        onDelete={vi.fn()}
        onClose={onClose}
      />,
    )

    fireEvent.click(screen.getByTestId('activity-assignee-select-trigger'))
    fireEvent.click(screen.getByTestId('activity-assignee-select-option-user-2'))
    fireEvent.click(screen.getByTestId('activity-detail-save'))

    await waitFor(() => {
      expect(upsertMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'activity-1',
          assignee_user_id: 'user-2',
        }),
      )
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('uses the custom choice list for check sources in review activities', async () => {
    const addCheckSourceMutation = vi.fn().mockResolvedValue(undefined)
    mockUseAddCheckSource.mockReturnValue({ mutateAsync: addCheckSourceMutation })

    render(
      <ActivityDetailPopup
        activity={createActivity()}
        workspaceId="workspace-1"
        organizationId="org-1"
        currentUserId="user-1"
        canvasObjects={[
          {
            id: 'obj-1',
            workspace_id: 'workspace-1',
            parent_activity_id: null,
            object_type: 'datenobjekt',
            name: 'Pruefprotokoll',
            edge_id: 'edge-1',
            edge_sort_order: 0,
            updated_at: '2026-04-03T00:00:00.000Z',
            fields: [],
          },
        ]}
        canvasEdges={defaultCanvasEdges}
        connectionCount={2}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTestId('activity-check-source-select-trigger'))
    fireEvent.click(screen.getByTestId('activity-check-source-select-option-obj-1'))
    await act(async () => {
      fireEvent.click(screen.getByText('Add'))
    })

    expect(addCheckSourceMutation).toHaveBeenCalledWith({
      canvas_object_id: 'obj-1',
      notes: null,
    })
  })

  it('creates, edits and deletes activity comments', async () => {
    const createCommentMutation = vi.fn().mockResolvedValue(undefined)
    const updateCommentMutation = vi.fn().mockResolvedValue(undefined)
    const deleteCommentMutation = vi.fn().mockResolvedValue(undefined)
    mockUseActivityComments.mockReturnValue({
      data: [
        {
          id: 'comment-1',
          activity_id: 'activity-1',
          organization_id: 'org-1',
          author_user_id: 'user-1',
          body: 'Bitte mit Vier-Augen-Prinzip pruefen.',
          created_at: '2026-04-04T08:00:00.000Z',
          updated_at: '2026-04-04T08:00:00.000Z',
        },
      ],
    })
    mockUseCreateActivityComment.mockReturnValue({ mutateAsync: createCommentMutation })
    mockUseUpdateActivityComment.mockReturnValue({ mutateAsync: updateCommentMutation })
    mockUseDeleteActivityComment.mockReturnValue({ mutateAsync: deleteCommentMutation })
    mockUseOrganizationMembers.mockReturnValue({
      data: [
        {
          organization_id: 'org-1',
          user_id: 'user-1',
          email: 'owner@example.com',
          role: 'owner',
          created_at: '2026-04-04T00:00:00.000Z',
        },
      ],
    })

    render(
      <ActivityDetailPopup
        activity={createActivity()}
        workspaceId="workspace-1"
        organizationId="org-1"
        currentUserId="user-1"
        canvasObjects={defaultCanvasObjects}
        canvasEdges={defaultCanvasEdges}
        connectionCount={2}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByTestId('activity-comment-input'), {
      target: { value: 'Rueckfrage an Buchhaltung vorbereiten' },
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId('activity-comment-submit'))
    })

    expect(createCommentMutation).toHaveBeenCalledWith('Rueckfrage an Buchhaltung vorbereiten')

    fireEvent.click(screen.getByTestId('activity-comment-edit-comment-1'))
    fireEvent.change(screen.getByDisplayValue('Bitte mit Vier-Augen-Prinzip pruefen.'), {
      target: { value: 'Bitte mit Vier-Augen-Prinzip und Checkliste pruefen.' },
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('activity-comment-save-comment-1'))
    })

    expect(updateCommentMutation).toHaveBeenCalledWith({
      commentId: 'comment-1',
      body: 'Bitte mit Vier-Augen-Prinzip und Checkliste pruefen.',
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('activity-comment-delete-comment-1'))
    })

    expect(deleteCommentMutation).toHaveBeenCalledWith('comment-1')
  })
})
