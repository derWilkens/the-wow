import type { ComponentProps } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UiPreferences } from '../../types'
import { SettingsDialog } from './SettingsDialog'

const mutateUpdateOrganizationAsync = vi.fn()
const mutateCreateTransportModeAsync = vi.fn()
const mutateUpdateTransportModeAsync = vi.fn()
const mutateDeactivateTransportModeAsync = vi.fn()
const mutateCreateItToolAsync = vi.fn()
const mutateUpdateItToolAsync = vi.fn()
const mutateDeleteItToolAsync = vi.fn()
const mutateCreateRoleAsync = vi.fn()
const mutateUpdateRoleAsync = vi.fn()
const mutateDeleteRoleAsync = vi.fn()

const defaultUiPreferences: UiPreferences = {
  default_grouping_mode: 'free',
  canvas_open_behavior: 'fit_view',
  snap_to_grid: true,
  enable_table_view: false,
  enable_swimlane_view: false,
  enable_node_collision_avoidance: true,
  enable_alignment_guides: true,
  enable_magnetic_connection_targets: true,
  theme_mode: 'system',
}

vi.mock('../../api/organizations', () => ({
  useUpdateOrganization: () => ({
    isPending: false,
    mutateAsync: mutateUpdateOrganizationAsync,
  }),
}))

vi.mock('../../api/transportModes', () => ({
  useTransportModes: () => ({
    data: [
      {
        id: 'mode-direkt',
        organization_id: 'org-1',
        key: 'direkt',
        label: 'Direkt',
        description: 'Direkte Uebergabe',
        sort_order: 0,
        is_active: true,
        is_default: true,
        created_at: new Date().toISOString(),
        created_by: 'user-1',
      },
    ],
  }),
  useCreateTransportMode: () => ({
    isPending: false,
    mutateAsync: mutateCreateTransportModeAsync,
  }),
  useUpdateTransportMode: () => ({
    mutateAsync: mutateUpdateTransportModeAsync,
  }),
  useDeactivateTransportMode: () => ({
    mutateAsync: mutateDeactivateTransportModeAsync,
  }),
}))

vi.mock('../../api/activityResources', () => ({
  useOrganizationITTools: () => ({
    data: [
      {
        id: 'tool-1',
        organization_id: 'org-1',
        name: 'SAP',
        description: 'ERP',
        created_at: new Date().toISOString(),
        created_by: 'user-1',
      },
    ],
  }),
  useCreateOrganizationITTool: () => ({
    isPending: false,
    mutateAsync: mutateCreateItToolAsync,
  }),
  useUpdateOrganizationITTool: () => ({
    mutateAsync: mutateUpdateItToolAsync,
  }),
  useDeleteOrganizationITTool: () => ({
    mutateAsync: mutateDeleteItToolAsync,
  }),
}))

vi.mock('../../api/organizationRoles', () => ({
  useOrganizationRoles: () => ({
    data: [
      {
        id: 'role-1',
        organization_id: 'org-1',
        label: 'BIM-Koordination',
        acronym: 'BK',
        description: 'koordiniert',
        sort_order: 0,
        created_at: new Date().toISOString(),
        created_by: 'user-1',
      },
    ],
  }),
  useCreateOrganizationRole: () => ({
    isPending: false,
    mutateAsync: mutateCreateRoleAsync,
  }),
  useUpdateOrganizationRole: () => ({
    mutateAsync: mutateUpdateRoleAsync,
  }),
  useDeleteOrganizationRole: () => ({
    mutateAsync: mutateDeleteRoleAsync,
  }),
}))

describe('SettingsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function renderDialog(overrides: Partial<ComponentProps<typeof SettingsDialog>> = {}) {
    return render(
      <SettingsDialog
        organizationId="org-1"
        organizationName="Acme GmbH"
        organizationRole="owner"
        isOpen
        uiPreferences={defaultUiPreferences}
        isSavingUiPreferences={false}
        onClose={vi.fn()}
        onOrganizationRenamed={vi.fn()}
        onUiPreferencesChange={vi.fn()}
        {...overrides}
      />,
    )
  }

  it('updates the organization name', async () => {
    const onOrganizationRenamed = vi.fn()
    mutateUpdateOrganizationAsync.mockResolvedValue({
      id: 'org-1',
      name: 'Neue Acme GmbH',
      membership_role: 'owner',
    })

    renderDialog({ onOrganizationRenamed })

    fireEvent.change(screen.getByTestId('settings-company-name'), { target: { value: 'Neue Acme GmbH' } })
    fireEvent.click(screen.getByTestId('settings-company-save'))

    await waitFor(() =>
      expect(mutateUpdateOrganizationAsync).toHaveBeenCalledWith({
        organizationId: 'org-1',
        name: 'Neue Acme GmbH',
      }),
    )
    expect(onOrganizationRenamed).toHaveBeenCalledWith('Neue Acme GmbH')
  })

  it('saves ui preferences including theme mode', async () => {
    const onUiPreferencesChange = vi.fn().mockResolvedValue(undefined)

    renderDialog({ onUiPreferencesChange })

    fireEvent.click(screen.getByTestId('settings-nav-ui'))
    fireEvent.click(screen.getByTestId('settings-ui-grouping-lanes'))
    fireEvent.click(screen.getByTestId('settings-ui-canvas-open-remember-last-view'))
    fireEvent.click(screen.getByTestId('settings-ui-table-view-on'))
    fireEvent.click(screen.getByTestId('settings-ui-swimlane-on'))
    fireEvent.click(screen.getByTestId('settings-ui-snap-off'))
    fireEvent.click(screen.getByTestId('settings-ui-collision-off'))
    fireEvent.click(screen.getByTestId('settings-ui-alignment-guides-off'))
    fireEvent.click(screen.getByTestId('settings-ui-magnetic-targets-off'))
    fireEvent.click(screen.getByTestId('settings-ui-theme-light'))
    fireEvent.click(screen.getByTestId('settings-ui-save'))

    await waitFor(() =>
      expect(onUiPreferencesChange).toHaveBeenCalledWith({
        default_grouping_mode: 'role_lanes',
        canvas_open_behavior: 'remember_last_view',
        snap_to_grid: false,
        enable_table_view: true,
        enable_swimlane_view: true,
        enable_node_collision_avoidance: false,
        enable_alignment_guides: false,
        enable_magnetic_connection_targets: false,
        theme_mode: 'light',
      }),
    )
  })

  it('defaults theme mode to system when no custom preference is supplied', () => {
    renderDialog()

    fireEvent.click(screen.getByTestId('settings-nav-ui'))

    expect(screen.getByTestId('settings-ui-theme-system')).toHaveClass('bg-cyan-400')
    expect(screen.getByTestId('settings-ui-canvas-open-fit-view')).toHaveClass('bg-cyan-400')
    expect(screen.getByTestId('settings-ui-snap-on')).toHaveClass('bg-cyan-400')
    expect(screen.getByTestId('settings-ui-table-view-off')).toHaveClass('bg-cyan-400')
    expect(screen.getByTestId('settings-ui-swimlane-off')).toHaveClass('bg-cyan-400')
    expect(screen.getByTestId('settings-ui-collision-on')).toHaveClass('bg-cyan-400')
    expect(screen.getByTestId('settings-ui-alignment-guides-on')).toHaveClass('bg-cyan-400')
    expect(screen.getByTestId('settings-ui-magnetic-targets-on')).toHaveClass('bg-cyan-400')
  })

  it('resets grouping to free when swimlane view is disabled before saving', async () => {
    const onUiPreferencesChange = vi.fn().mockResolvedValue(undefined)

    renderDialog({ onUiPreferencesChange })

    fireEvent.click(screen.getByTestId('settings-nav-ui'))
    fireEvent.click(screen.getByTestId('settings-ui-grouping-lanes'))
    fireEvent.click(screen.getByTestId('settings-ui-swimlane-off'))
    fireEvent.click(screen.getByTestId('settings-ui-save'))

    await waitFor(() =>
      expect(onUiPreferencesChange).toHaveBeenCalledWith({
        default_grouping_mode: 'free',
        canvas_open_behavior: 'fit_view',
        snap_to_grid: true,
        enable_table_view: false,
        enable_swimlane_view: false,
        enable_node_collision_avoidance: true,
        enable_alignment_guides: true,
        enable_magnetic_connection_targets: true,
        theme_mode: 'system',
      }),
    )
  })

  it('creates transport modes, roles and organization IT tools from the master-data section', async () => {
    mutateCreateTransportModeAsync.mockResolvedValue(undefined)
    mutateCreateRoleAsync.mockResolvedValue(undefined)
    mutateCreateItToolAsync.mockResolvedValue(undefined)

    renderDialog()

    fireEvent.click(screen.getByTestId('settings-nav-master-data'))
    fireEvent.change(screen.getByTestId('settings-transport-mode-new-label'), { target: { value: 'Teams' } })
    fireEvent.change(screen.getByTestId('settings-transport-mode-new-description'), { target: { value: 'Chat' } })
    fireEvent.click(screen.getByTestId('settings-transport-mode-create'))

    await waitFor(() =>
      expect(mutateCreateTransportModeAsync).toHaveBeenCalledWith({
        label: 'Teams',
        description: 'Chat',
        sort_order: 1,
        is_default: false,
      }),
    )

    fireEvent.change(screen.getByTestId('settings-role-new-label'), { target: { value: 'Architektur' } })
    fireEvent.change(screen.getByTestId('settings-role-new-acronym'), { target: { value: 'ARC' } })
    fireEvent.change(screen.getByTestId('settings-role-new-description'), { target: { value: 'Fachplanung Architektur' } })
    fireEvent.click(screen.getByTestId('settings-role-create'))

    await waitFor(() =>
      expect(mutateCreateRoleAsync).toHaveBeenCalledWith({
        label: 'Architektur',
        acronym: 'ARC',
        description: 'Fachplanung Architektur',
      }),
    )

    fireEvent.change(screen.getByTestId('settings-it-tool-new-name'), { target: { value: 'Revit' } })
    fireEvent.change(screen.getByTestId('settings-it-tool-new-description'), { target: { value: 'BIM Authoring' } })
    fireEvent.click(screen.getByTestId('settings-it-tool-create'))

    await waitFor(() =>
      expect(mutateCreateItToolAsync).toHaveBeenCalledWith({
        name: 'Revit',
        description: 'BIM Authoring',
      }),
    )
  })

  it('updates and deletes existing roles and IT tools', async () => {
    mutateUpdateRoleAsync.mockResolvedValue(undefined)
    mutateDeleteRoleAsync.mockResolvedValue({ success: true })
    mutateUpdateItToolAsync.mockResolvedValue(undefined)
    mutateDeleteItToolAsync.mockResolvedValue({ success: true })

    renderDialog()

    fireEvent.click(screen.getByTestId('settings-nav-master-data'))
    fireEvent.change(screen.getByLabelText('BIM-Koordination Rollenname'), { target: { value: 'BIM-Lead' } })
    fireEvent.change(screen.getByLabelText('BIM-Koordination Akronym'), { target: { value: 'BL' } })
    fireEvent.click(screen.getByTestId('settings-role-save-role-1'))

    await waitFor(() =>
      expect(mutateUpdateRoleAsync).toHaveBeenCalledWith({
        id: 'role-1',
        label: 'BIM-Lead',
        acronym: 'BL',
        description: 'koordiniert',
      }),
    )

    fireEvent.click(screen.getByTestId('settings-role-delete-role-1'))
    await waitFor(() => expect(mutateDeleteRoleAsync).toHaveBeenCalledWith('role-1'))

    fireEvent.change(screen.getByLabelText('SAP Name'), { target: { value: 'SAP S/4' } })
    fireEvent.click(screen.getByTestId('it-tool-save-tool-1'))

    await waitFor(() =>
      expect(mutateUpdateItToolAsync).toHaveBeenCalledWith({
        id: 'tool-1',
        name: 'SAP S/4',
        description: 'ERP',
      }),
    )

    fireEvent.click(screen.getByTestId('it-tool-delete-tool-1'))
    await waitFor(() => expect(mutateDeleteItToolAsync).toHaveBeenCalledWith('tool-1'))
  })
})
