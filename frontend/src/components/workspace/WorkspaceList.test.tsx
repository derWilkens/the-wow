import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { WorkspaceList } from './WorkspaceList'
import type { Organization, WorkflowTemplate, Workspace } from '../../types'

const mockUseCanvasStore = vi.fn()
const mockUseOrganizations = vi.fn()
const mockUseWorkspaces = vi.fn()
const mockUseWorkflowTemplates = vi.fn()
const mockUseCreateWorkspace = vi.fn()
const mockUseCreateWorkspaceFromTemplate = vi.fn()
const mockUseCreateWorkflowTemplate = vi.fn()
const mockUseUpdateWorkflowTemplate = vi.fn()
const mockUseDeleteWorkflowTemplate = vi.fn()
const mockUseDeleteWorkspace = vi.fn()

vi.mock('../../store/canvasStore', () => ({
  useCanvasStore: () => mockUseCanvasStore(),
}))

vi.mock('../../api/organizations', () => ({
  useOrganizations: () => mockUseOrganizations(),
}))

vi.mock('../../api/workspaces', () => ({
  useWorkspaces: (...args: unknown[]) => mockUseWorkspaces(...args),
  useCreateWorkspace: (...args: unknown[]) => mockUseCreateWorkspace(...args),
  useDeleteWorkspace: (...args: unknown[]) => mockUseDeleteWorkspace(...args),
}))

vi.mock('../../api/workflowTemplates', () => ({
  useWorkflowTemplates: (...args: unknown[]) => mockUseWorkflowTemplates(...args),
  useCreateWorkflowTemplate: (...args: unknown[]) => mockUseCreateWorkflowTemplate(...args),
  useCreateWorkspaceFromTemplate: (...args: unknown[]) => mockUseCreateWorkspaceFromTemplate(...args),
  useUpdateWorkflowTemplate: (...args: unknown[]) => mockUseUpdateWorkflowTemplate(...args),
  useDeleteWorkflowTemplate: (...args: unknown[]) => mockUseDeleteWorkflowTemplate(...args),
}))

function createWorkspace(id: string, name: string, overrides: Partial<Workspace> = {}): Workspace {
  return {
    id,
    organization_id: 'org-1',
    name,
    created_by: 'user-1',
    created_at: '2026-04-04T00:00:00.000Z',
    parent_workspace_id: null,
    parent_activity_id: null,
    workflow_scope: 'standalone',
    purpose: null,
    expected_inputs: [],
    expected_outputs: [],
    ...overrides,
  }
}

function createTemplate(id: string, name: string, overrides: Partial<WorkflowTemplate> = {}): WorkflowTemplate {
  return {
    id,
    organization_id: 'org-1',
    name,
    description: 'Standardprozess',
    category: null,
    source_workspace_id: null,
    is_system: true,
    snapshot: {},
    created_by: null,
    created_at: '2026-04-04T00:00:00.000Z',
    ...overrides,
  }
}

describe('WorkspaceList', () => {
  beforeEach(() => {
    mockUseCanvasStore.mockReturnValue({
      organizationId: 'org-1',
      organizationName: 'Acme GmbH',
      openWorkspace: vi.fn(),
      openWorkspacePath: vi.fn(),
      selectOrganization: vi.fn(),
    })
    mockUseOrganizations.mockReturnValue({
      data: [
        {
          id: 'org-1',
          name: 'Acme GmbH',
          membership_role: 'owner',
        } satisfies Partial<Organization>,
      ],
    })
    mockUseWorkspaces.mockReturnValue({
      data: [createWorkspace('workspace-1', 'Rechnungseingang')],
      isLoading: false,
      refetch: vi.fn(),
    })
    mockUseWorkflowTemplates.mockReturnValue({
      data: [createTemplate('template-1', 'Freigabeprozess')],
    })
    mockUseCreateWorkspace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mockUseCreateWorkspaceFromTemplate.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mockUseCreateWorkflowTemplate.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mockUseUpdateWorkflowTemplate.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mockUseDeleteWorkflowTemplate.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mockUseDeleteWorkspace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('creates a workflow from a selected template', async () => {
    const openWorkspace = vi.fn()
    const createFromTemplate = vi.fn().mockResolvedValue(createWorkspace('workspace-2', 'Neuer Ablauf'))
    mockUseCanvasStore.mockReturnValue({
      organizationId: 'org-1',
      organizationName: 'Acme GmbH',
      openWorkspace,
      openWorkspacePath: vi.fn(),
      selectOrganization: vi.fn(),
    })
    mockUseCreateWorkspaceFromTemplate.mockReturnValue({ mutateAsync: createFromTemplate, isPending: false })

    render(<WorkspaceList />)

    fireEvent.click(screen.getByTestId('workspace-create-mode-template'))
    fireEvent.click(screen.getByTestId('workspace-template-option-template-1'))
    fireEvent.change(screen.getByPlaceholderText('Name des Arbeitsablaufs'), {
      target: { value: 'Neuer Ablauf' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Aus Vorlage starten' }))

    await waitFor(() => {
      expect(createFromTemplate).toHaveBeenCalledWith({
        template_id: 'template-1',
        name: 'Neuer Ablauf',
      })
      expect(openWorkspace).toHaveBeenCalledWith('workspace-2', 'Neuer Ablauf')
    })
  })

  it('opens the save-template dialog and persists the template metadata', async () => {
    const saveTemplate = vi.fn().mockResolvedValue(createTemplate('template-2', 'Rechnungseingang Vorlage', { is_system: false }))
    mockUseCreateWorkflowTemplate.mockReturnValue({ mutateAsync: saveTemplate, isPending: false })

    render(<WorkspaceList />)

    fireEvent.click(screen.getByTestId('workspace-save-template-workspace-1'))
    fireEvent.change(screen.getByTestId('workspace-template-name'), {
      target: { value: 'Rechnungseingang Vorlage' },
    })
    fireEvent.change(screen.getByTestId('workspace-template-description'), {
      target: { value: 'Typischer Ablauf fuer eingehende Rechnungen' },
    })
    fireEvent.click(screen.getByTestId('workspace-template-save'))

    await waitFor(() => {
      expect(saveTemplate).toHaveBeenCalledWith({
        source_workspace_id: 'workspace-1',
        name: 'Rechnungseingang Vorlage',
        description: 'Typischer Ablauf fuer eingehende Rechnungen',
      })
    })
  })

  it('filters the template list via the search input', () => {
    mockUseWorkflowTemplates.mockReturnValue({
      data: [
        createTemplate('template-1', 'Freigabeprozess'),
        createTemplate('template-2', 'Rechnungseingang', { description: 'Buchhaltung' }),
      ],
    })

    render(<WorkspaceList />)

    fireEvent.click(screen.getByTestId('workspace-create-mode-template'))
    fireEvent.change(screen.getByTestId('workspace-template-search'), {
      target: { value: 'Rechnung' },
    })

    expect(screen.getByTestId('workspace-template-option-template-2')).toBeInTheDocument()
    expect(screen.queryByTestId('workspace-template-option-template-1')).not.toBeInTheDocument()
  })

  it('updates a custom template from the template picker', async () => {
    const updateTemplate = vi.fn().mockResolvedValue(createTemplate('template-2', 'Bearbeitete Vorlage', { is_system: false }))
    mockUseWorkflowTemplates.mockReturnValue({
      data: [
        createTemplate('template-1', 'Freigabeprozess'),
        createTemplate('template-2', 'Eigene Vorlage', { is_system: false, description: 'Alt' }),
      ],
    })
    mockUseUpdateWorkflowTemplate.mockReturnValue({ mutateAsync: updateTemplate, isPending: false })

    render(<WorkspaceList />)

    fireEvent.click(screen.getByTestId('workspace-create-mode-template'))
    fireEvent.click(screen.getByTestId('workspace-template-edit-template-2'))
    fireEvent.change(screen.getByTestId('workspace-template-edit-name'), {
      target: { value: 'Bearbeitete Vorlage' },
    })
    fireEvent.change(screen.getByTestId('workspace-template-edit-description'), {
      target: { value: 'Neu beschrieben' },
    })
    fireEvent.click(screen.getByTestId('workspace-template-edit-save'))

    await waitFor(() => {
      expect(updateTemplate).toHaveBeenCalledWith({
        template_id: 'template-2',
        name: 'Bearbeitete Vorlage',
        description: 'Neu beschrieben',
      })
    })
  })
})
