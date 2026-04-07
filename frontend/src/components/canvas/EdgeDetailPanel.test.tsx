import { useState, type ComponentProps } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EdgeDetailPanel } from './EdgeDetailPanel'
import type { CanvasEdge, EdgeDataObject, TransportModeOption } from '../../types'

const transportModes: TransportModeOption[] = [
  {
    id: 'mode-direkt',
    organization_id: 'org-1',
    key: 'direkt',
    label: 'Direkt',
    description: 'Direkte Uebergabe ohne Zwischenschritt.',
    sort_order: 0,
    is_active: true,
    is_default: true,
    created_at: new Date().toISOString(),
    created_by: 'user-1',
  },
  {
    id: 'mode-mail',
    organization_id: 'org-1',
    key: 'mail',
    label: 'Mail',
    description: 'Versand per Mail an die naechste Stelle.',
    sort_order: 1,
    is_active: true,
    is_default: false,
    created_at: new Date().toISOString(),
    created_by: 'user-1',
  },
  {
    id: 'mode-storage',
    organization_id: 'org-1',
    key: 'im_datenspeicher_bereitgestellt',
    label: 'Im Datenspeicher bereitgestellt',
    description: 'Zwischenspeicherung bis zur naechsten Bearbeitung.',
    sort_order: 2,
    is_active: false,
    is_default: false,
    created_at: new Date().toISOString(),
    created_by: 'user-1',
  },
]

function createEdge(overrides: Partial<CanvasEdge> = {}): CanvasEdge {
  return {
    id: 'edge-1',
    workspace_id: 'workspace-1',
    parent_activity_id: null,
    from_node_type: 'activity',
    from_node_id: 'activity-a',
    from_handle_id: 'source-right',
    to_node_type: 'activity',
    to_node_id: 'activity-b',
    to_handle_id: 'target-left',
    label: null,
    transport_mode_id: null,
    transport_mode: null,
    notes: null,
    ...overrides,
  }
}

function createDataObject(id: string, name: string, edgeId = 'edge-1', edgeSortOrder = 0, fieldCount = 0): EdgeDataObject {
  return {
    id,
    workspace_id: 'workspace-1',
    parent_activity_id: null,
    object_type: 'datenobjekt',
    name,
    edge_id: edgeId,
    edge_sort_order: edgeSortOrder,
    updated_at: '2026-04-03T00:00:00.000Z',
    fields: Array.from({ length: fieldCount }).map((_, index) => ({
      id: `${id}-field-${index}`,
      object_id: id,
      name: `feld_${index + 1}`,
      field_type: 'text',
      required: false,
      sort_order: index,
    })),
  }
}

function renderPanel(overrides?: Partial<ComponentProps<typeof EdgeDetailPanel>>) {
  return render(
    <EdgeDetailPanel
      edge={createEdge()}
      transportModes={transportModes}
      dataObjects={[]}
      reusableDataObjects={[]}
      onClose={vi.fn()}
      onSave={vi.fn()}
      onAddNewDataObject={vi.fn()}
      onAddExistingDataObject={vi.fn()}
      onRenameDataObject={vi.fn()}
      onOpenDataObject={vi.fn()}
      onDeleteDataObject={vi.fn()}
      {...overrides}
    />,
  )
}

describe('EdgeDetailPanel', () => {
  it('renders separate sections and saves transport mode plus context note', () => {
    const onSave = vi.fn()

    renderPanel({ onSave })

    expect(screen.getByTestId('edge-section-transport')).toBeInTheDocument()
    expect(screen.getByTestId('edge-section-data-objects')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('edge-transport-mode-trigger'))
    fireEvent.click(screen.getByTestId('edge-transport-mode-option-mode-mail'))
    fireEvent.change(screen.getByTestId('edge-notes'), {
      target: { value: 'Uebergabe per Mail an die naechste Stelle.' },
    })

    expect(screen.getByTestId('edge-transport-description')).toHaveTextContent('Versand per Mail an die naechste Stelle.')
    fireEvent.click(screen.getByTestId('edge-save'))

    expect(onSave).toHaveBeenCalledWith({
      label: null,
      transport_mode_id: 'mode-mail',
      notes: 'Uebergabe per Mail an die naechste Stelle.',
    })
  })

  it('renders in the fixed top-right dock layout', () => {
    const { container } = renderPanel()

    expect(container.firstChild).toHaveClass('pointer-events-none', 'absolute', 'inset-0', 'flex', 'items-start', 'justify-end', 'p-4')
  })

  it('shows and saves a visible path label for gateway edges', () => {
    const onSave = vi.fn()

    renderPanel({
      allowPathLabel: true,
      onSave,
    })

    fireEvent.change(screen.getByTestId('edge-path-label'), {
      target: { value: 'Ja' },
    })
    fireEvent.click(screen.getByTestId('edge-save'))

    expect(onSave).toHaveBeenCalledWith({
      label: 'Ja',
      transport_mode_id: null,
      notes: null,
    })
  })

  it('resets local draft state when the selected edge changes', () => {
    const { rerender } = render(
      <EdgeDetailPanel
        edge={createEdge({
          id: 'edge-1',
          label: 'Ja',
          notes: 'Erste Kante',
        })}
        allowPathLabel
        transportModes={transportModes}
        dataObjects={[]}
        reusableDataObjects={[]}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onAddNewDataObject={vi.fn()}
        onAddExistingDataObject={vi.fn()}
        onRenameDataObject={vi.fn()}
        onOpenDataObject={vi.fn()}
        onDeleteDataObject={vi.fn()}
      />,
    )

    expect(screen.getByTestId('edge-path-label')).toHaveValue('Ja')
    expect(screen.getByTestId('edge-notes')).toHaveValue('Erste Kante')

    rerender(
      <EdgeDetailPanel
        edge={createEdge({
          id: 'edge-2',
          label: 'Nein',
          notes: 'Zweite Kante',
        })}
        allowPathLabel
        transportModes={transportModes}
        dataObjects={[]}
        reusableDataObjects={[]}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onAddNewDataObject={vi.fn()}
        onAddExistingDataObject={vi.fn()}
        onRenameDataObject={vi.fn()}
        onOpenDataObject={vi.fn()}
        onDeleteDataObject={vi.fn()}
      />,
    )

    expect(screen.getByTestId('edge-path-label')).toHaveValue('Nein')
    expect(screen.getByTestId('edge-notes')).toHaveValue('Zweite Kante')
  })

  it('keeps an inactive but selected mode visible', () => {
    renderPanel({
      edge: createEdge({
        transport_mode_id: 'mode-storage',
        transport_mode: transportModes[2],
        notes: 'Bereits gesetzt',
      }),
    })

    expect(screen.getByTestId('edge-transport-mode-trigger')).toHaveTextContent('Im Datenspeicher bereitgestellt')
    expect(screen.getByTestId('edge-transport-description')).toHaveTextContent('Zwischenspeicherung bis zur naechsten Bearbeitung.')
    expect(screen.getByTestId('edge-transport-status-chip')).toHaveTextContent('Im Datenspeicher bereitgestellt (inaktiv)')
  })

  it('styles the transport mode choice trigger to match the dialog look and feel', () => {
    renderPanel()

    expect(screen.getByTestId('edge-transport-mode-trigger')).toHaveClass(
      'rounded-2xl',
      'bg-slate-950/70',
      'shadow-[0_12px_30px_rgba(2,8,12,0.22)]',
    )
    expect(screen.getByTestId('edge-transport-description')).toHaveClass(
      'rounded-2xl',
      'border',
      'bg-white/[0.03]',
    )
  })

  it('creates a new transport mode inline and selects it', async () => {
    const onCreateTransportMode = vi.fn().mockResolvedValue({
      id: 'mode-portal',
      organization_id: 'org-1',
      key: 'portal',
      label: 'Portal',
      description: 'Bereitstellung im Fachportal.',
      sort_order: 3,
      is_active: true,
      is_default: false,
      created_at: new Date().toISOString(),
      created_by: 'user-1',
    } satisfies TransportModeOption)

    renderPanel({
      canCreateTransportMode: true,
      onCreateTransportMode,
    })

    fireEvent.click(screen.getByTestId('edge-transport-mode-trigger'))
    fireEvent.click(screen.getByTestId('edge-transport-mode-create-toggle'))
    fireEvent.change(screen.getByTestId('edge-transport-mode-create-name'), {
      target: { value: 'Portal' },
    })
    fireEvent.change(screen.getByTestId('edge-transport-mode-create-description'), {
      target: { value: 'Bereitstellung im Fachportal.' },
    })
    fireEvent.click(screen.getByTestId('edge-transport-mode-create-submit'))

    await waitFor(() => {
      expect(onCreateTransportMode).toHaveBeenCalledWith({
        label: 'Portal',
        description: 'Bereitstellung im Fachportal.',
        is_default: false,
      })
    })

    expect(screen.getByTestId('edge-transport-mode-trigger')).toHaveTextContent('Portal')
  })

  it('creates a new data object and renames it inline', async () => {
    const onRenameDataObject = vi.fn().mockResolvedValue(undefined)
    const createdObject = createDataObject('data-9', 'Datenobjekt 1')

    function Wrapper() {
      const [items, setItems] = useState([createDataObject('data-1', 'Gepruefte Rechnung', 'edge-1', 0, 2)])

      return (
        <EdgeDetailPanel
          edge={createEdge()}
          transportModes={transportModes}
          dataObjects={items}
          reusableDataObjects={[]}
          onClose={vi.fn()}
          onSave={vi.fn()}
          onAddNewDataObject={async () => {
            setItems((current) => [...current, createdObject])
            return createdObject
          }}
          onAddExistingDataObject={vi.fn()}
          onRenameDataObject={onRenameDataObject}
          onOpenDataObject={vi.fn()}
          onDeleteDataObject={vi.fn()}
        />
      )
    }

    render(<Wrapper />)

    fireEvent.click(screen.getByTestId('edge-add-new-data-object'))

    const inlineInput = await screen.findByTestId('edge-inline-name-data-9')
    fireEvent.change(inlineInput, { target: { value: 'Freigabeprotokoll' } })
    fireEvent.click(screen.getByTestId('edge-inline-save-data-9'))

    await waitFor(() => {
      expect(onRenameDataObject).toHaveBeenCalledWith('data-9', 'Freigabeprotokoll')
    })
  })

  it('closes the first inline rename optimistically before a second data object is created', async () => {
    let resolveRename: (() => void) | null = null
    const onRenameDataObject = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRename = resolve
        }),
    )

    function Wrapper() {
      const [items, setItems] = useState([createDataObject('data-1', 'Datenobjekt 1')])
      let createdCount = items.length

      return (
        <EdgeDetailPanel
          edge={createEdge()}
          transportModes={transportModes}
          dataObjects={items}
          reusableDataObjects={[]}
          onClose={vi.fn()}
          onSave={vi.fn()}
          onAddNewDataObject={async () => {
            createdCount += 1
            const createdObject = createDataObject(`data-${createdCount}`, `Datenobjekt ${createdCount}`)
            setItems((current) => [...current, createdObject])
            return createdObject
          }}
          onAddExistingDataObject={vi.fn()}
          onRenameDataObject={onRenameDataObject}
          onOpenDataObject={vi.fn()}
          onDeleteDataObject={vi.fn()}
        />
      )
    }

    render(<Wrapper />)

    fireEvent.click(screen.getByTestId('edge-add-new-data-object'))
    fireEvent.change(await screen.findByTestId('edge-inline-name-data-2'), {
      target: { value: 'Koordinationsbericht' },
    })
    fireEvent.click(screen.getByTestId('edge-inline-save-data-2'))

    await waitFor(() => {
      expect(screen.queryByTestId('edge-inline-name-data-2')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('edge-add-new-data-object'))
    expect(await screen.findByTestId('edge-inline-name-data-3')).toBeInTheDocument()
    expect(screen.getByTestId('edge-data-object-row-data-2')).toHaveTextContent('Koordinationsbericht')

    const completeRename = resolveRename as (() => void) | null
    if (completeRename) {
      completeRename()
    }
  })

  it('shows item actions for editing and removing data objects', () => {
    const onOpenDataObject = vi.fn()
    const onDeleteDataObject = vi.fn()
    const dataObject = createDataObject('data-1', 'Gepruefte Rechnung', 'edge-1', 0, 2)

    renderPanel({
      dataObjects: [dataObject],
      onOpenDataObject,
      onDeleteDataObject,
    })

    expect(screen.getByTestId('edge-data-object-row-data-1')).toHaveTextContent('2 Felder')

    fireEvent.click(screen.getByTestId('edge-open-data-object-data-1'))
    expect(onOpenDataObject).toHaveBeenCalledWith(dataObject)

    fireEvent.click(screen.getByTestId('edge-delete-data-object-data-1'))
    expect(onDeleteDataObject).toHaveBeenCalledWith('data-1')
  })

  it('filters reusable data objects by search and adds the selected item', () => {
    const onAddExistingDataObject = vi.fn()

    renderPanel({
      dataObjects: [createDataObject('data-1', 'Gepruefte Rechnung')],
      reusableDataObjects: [
        createDataObject('data-2', 'Gepruefte Rechnung', 'edge-2'),
        createDataObject('data-3', 'Lieferschein', 'edge-3', 0, 1),
        createDataObject('data-4', 'Wareneingang', 'edge-4', 0, 3),
      ],
      onAddExistingDataObject,
    })

    expect(screen.queryByTestId('edge-existing-data-object-option-data-2')).not.toBeInTheDocument()

    fireEvent.change(screen.getByTestId('edge-existing-data-object-search'), {
      target: { value: 'Lief' },
    })

    expect(screen.getByTestId('edge-existing-data-object-option-data-3')).toBeInTheDocument()
    expect(screen.queryByTestId('edge-existing-data-object-option-data-4')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('edge-existing-data-object-option-data-3'))
    expect(onAddExistingDataObject).toHaveBeenCalledWith('data-3')
  })
})

