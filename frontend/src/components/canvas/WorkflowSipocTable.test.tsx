import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WorkflowSipocTable } from './WorkflowSipocTable'
import type { CatalogRole, EdgeDataObject, TransportModeOption, WorkflowSipocRow } from '../../types'

const roles: CatalogRole[] = [
  {
    id: 'role-1',
    organization_id: 'org-1',
    label: 'BIM-Koordination',
    description: 'koordiniert',
    sort_order: 0,
    created_at: new Date().toISOString(),
    created_by: 'user-1',
  },
  {
    id: 'role-2',
    organization_id: 'org-1',
    label: 'Fachplanung',
    description: 'liefert zu',
    sort_order: 1,
    created_at: new Date().toISOString(),
    created_by: 'user-1',
  },
]

const transportModes: TransportModeOption[] = [
  {
    id: 'mode-1',
    organization_id: 'org-1',
    key: 'mail',
    label: 'Per E-Mail',
    description: null,
    sort_order: 0,
    is_active: true,
    is_default: true,
    created_at: new Date().toISOString(),
    created_by: 'user-1',
  },
]

const reusableDataObjects: EdgeDataObject[] = [
  {
    id: 'object-2',
    workspace_id: 'workspace-1',
    parent_activity_id: null,
    object_type: 'datenobjekt',
    name: 'Pruefnotiz',
    edge_id: 'edge-x',
    edge_sort_order: 0,
    updated_at: new Date().toISOString(),
  },
]

const rows: WorkflowSipocRow[] = [
  {
    activityId: 'activity-1',
    processLabel: 'Unterlagen pruefen',
    processRoleId: 'role-1',
    processRoleLabel: 'BIM-Koordination',
    supplierRoles: [
      {
        activityId: 'activity-supplier',
        activityLabel: 'Unterlagen zusammenstellen',
        roleId: 'role-2',
        roleLabel: 'Fachplanung',
      },
    ],
    consumerRoles: [
      {
        activityId: 'activity-consumer',
        activityLabel: 'Unterlagen freigeben',
        roleId: null,
        roleLabel: 'Nicht zugeordnet',
      },
    ],
    inputs: [
      {
        id: 'object-1',
        edgeId: 'edge-1',
        objectName: 'Unterlagenpaket',
        transportModeId: 'mode-1',
        transportModeLabel: 'Per E-Mail',
      },
    ],
    outputs: [],
  },
]

describe('WorkflowSipocTable', () => {
  function renderTable() {
    return render(
      <WorkflowSipocTable
        rows={rows}
        roles={roles}
        transportModes={transportModes}
        reusableDataObjects={reusableDataObjects}
        onSelectActivity={vi.fn()}
        onRenameProcess={vi.fn()}
        onUpdateProcessRole={vi.fn()}
        onUpdateRelatedRole={vi.fn()}
        onCreateRole={vi.fn()}
        onUpdateEdgeTransportMode={vi.fn()}
        onAddExistingDataObjectToEdge={vi.fn()}
        onCreateDataObjectOnEdge={vi.fn()}
      />,
    )
  }

  it('renders editable sipoc columns with process role below process', () => {
    renderTable()

    expect(screen.getByTestId('workflow-sipoc-table')).toBeInTheDocument()
    expect(screen.getByText('Supplier')).toBeInTheDocument()
    expect(screen.getByText('Input')).toBeInTheDocument()
    expect(screen.getByText('Prozess')).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Prozessrolle' })).not.toBeInTheDocument()
    expect(screen.getByText('Output')).toBeInTheDocument()
    expect(screen.getByText('Consumer')).toBeInTheDocument()
    expect(screen.getByTestId('sipoc-process-input-activity-1')).toHaveValue('Unterlagen pruefen')
    expect(screen.getByTestId('sipoc-process-role-activity-1-trigger')).toBeInTheDocument()
    expect(screen.getByText('Unterlagenpaket')).toBeInTheDocument()
    expect(screen.getByText('Per E-Mail')).toBeInTheDocument()
  })

  it('commits inline process renames on blur', () => {
    const onRenameProcess = vi.fn()

    render(
      <WorkflowSipocTable
        rows={rows}
        roles={roles}
        transportModes={transportModes}
        reusableDataObjects={reusableDataObjects}
        onSelectActivity={vi.fn()}
        onRenameProcess={onRenameProcess}
        onUpdateProcessRole={vi.fn()}
        onUpdateRelatedRole={vi.fn()}
        onCreateRole={vi.fn()}
        onUpdateEdgeTransportMode={vi.fn()}
        onAddExistingDataObjectToEdge={vi.fn()}
        onCreateDataObjectOnEdge={vi.fn()}
      />,
    )

    const input = screen.getByTestId('sipoc-process-input-activity-1')
    fireEvent.change(input, { target: { value: 'Unterlagen final pruefen' } })
    fireEvent.blur(input)

    expect(onRenameProcess).toHaveBeenCalledWith('activity-1', 'Unterlagen final pruefen')
  })

  it('updates edge transport mode through the input cell selector', () => {
    const onUpdateEdgeTransportMode = vi.fn()

    render(
      <WorkflowSipocTable
        rows={rows}
        roles={roles}
        transportModes={transportModes}
        reusableDataObjects={reusableDataObjects}
        onSelectActivity={vi.fn()}
        onRenameProcess={vi.fn()}
        onUpdateProcessRole={vi.fn()}
        onUpdateRelatedRole={vi.fn()}
        onCreateRole={vi.fn()}
        onUpdateEdgeTransportMode={onUpdateEdgeTransportMode}
        onAddExistingDataObjectToEdge={vi.fn()}
        onCreateDataObjectOnEdge={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTestId('sipoc-input-transport-edge-1-trigger'))
    fireEvent.click(screen.getByTestId('sipoc-input-transport-edge-1-clear'))

    expect(onUpdateEdgeTransportMode).toHaveBeenCalledWith('edge-1', null)
  })
})
