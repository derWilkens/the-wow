import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DataObjectPopup } from './DataObjectPopup'
import type { EdgeDataObject, SourceCanvasObject, UpsertCanvasObjectInput } from '../../types'

function createDataObject(): EdgeDataObject {
  return {
    id: 'data-1',
    workspace_id: 'workspace-1',
    parent_activity_id: null,
    object_type: 'datenobjekt',
    name: 'Gepruefte Rechnung',
    edge_id: 'edge-1',
    edge_sort_order: 0,
    updated_at: '2026-04-04T00:00:00.000Z',
    fields: [],
  }
}

function createSource(): SourceCanvasObject {
  return {
    id: 'source-1',
    workspace_id: 'workspace-1',
    parent_activity_id: null,
    object_type: 'quelle',
    name: 'Archiv',
    position_x: 10,
    position_y: 20,
    edge_id: null,
    edge_sort_order: null,
    updated_at: '2026-04-04T00:00:00.000Z',
  }
}

describe('DataObjectPopup', () => {
  it('closes immediately and forwards the save payload', () => {
    const onClose = vi.fn()
    const onSave = vi.fn<(input: UpsertCanvasObjectInput) => Promise<void>>(() => new Promise(() => {}))

    render(
      <DataObjectPopup
        canvasObject={createDataObject()}
        onClose={onClose}
        onSave={onSave}
        onDelete={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByTestId('data-object-name'), {
      target: { value: 'Freigabeprotokoll' },
    })
    fireEvent.click(screen.getByTestId('data-object-add-field'))
    fireEvent.click(screen.getByTestId('data-object-save'))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'data-1',
        name: 'Freigabeprotokoll',
        object_type: 'datenobjekt',
        edge_id: 'edge-1',
        edge_sort_order: 0,
      }),
    )
  })

  it('closes immediately and forwards delete for a data object', () => {
    const onClose = vi.fn()
    const onDelete = vi.fn<(id: string) => Promise<void>>(() => new Promise(() => {}))

    render(
      <DataObjectPopup
        canvasObject={createDataObject()}
        onClose={onClose}
        onSave={vi.fn()}
        onDelete={onDelete}
      />,
    )

    fireEvent.click(screen.getByTestId('data-object-delete'))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith('data-1')
  })

  it('forwards source-specific save data without edge fields', () => {
    const onSave = vi.fn()

    render(
      <DataObjectPopup
        canvasObject={createSource()}
        onClose={vi.fn()}
        onSave={onSave}
        onDelete={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByTestId('data-object-name'), {
      target: { value: 'Digitales Archiv' },
    })
    fireEvent.click(screen.getByTestId('data-object-save'))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'source-1',
        object_type: 'quelle',
        name: 'Digitales Archiv',
        position_x: 10,
        position_y: 20,
        edge_id: null,
        edge_sort_order: null,
      }),
    )
  })

  it('closes when the overlay outside the dialog is clicked', () => {
    const onClose = vi.fn()

    render(
      <DataObjectPopup
        canvasObject={createDataObject()}
        onClose={onClose}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    fireEvent.mouseDown(screen.getByTestId('data-object-overlay'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
