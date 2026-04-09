import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SourceInsertDialog } from './SourceInsertDialog'

describe('SourceInsertDialog', () => {
  it('lets the user select an existing source and confirm it', () => {
    const onUseExisting = vi.fn()

    render(
      <SourceInsertDialog
        isOpen
        existingSources={[
          { id: 'source-1', name: 'Archiv' },
          { id: 'source-2', name: 'Projektablage' },
        ]}
        isSubmitting={false}
        onClose={vi.fn()}
        onUseExisting={onUseExisting}
        onCreateNew={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTestId('source-insert-option-source-2'))
    fireEvent.click(screen.getByTestId('source-insert-use-existing'))

    expect(onUseExisting).toHaveBeenCalledWith('source-2')
  })

  it('disables existing-source confirmation when no source exists', () => {
    render(
      <SourceInsertDialog
        isOpen
        existingSources={[]}
        isSubmitting={false}
        onClose={vi.fn()}
        onUseExisting={vi.fn()}
        onCreateNew={vi.fn()}
      />,
    )

    expect(screen.getByTestId('source-insert-empty')).toBeInTheDocument()
    expect(screen.getByTestId('source-insert-use-existing')).toBeDisabled()
  })

  it('closes when the overlay is clicked', () => {
    const onClose = vi.fn()

    render(
      <SourceInsertDialog
        isOpen
        existingSources={[]}
        isSubmitting={false}
        onClose={onClose}
        onUseExisting={vi.fn()}
        onCreateNew={vi.fn()}
      />,
    )

    fireEvent.mouseDown(screen.getByTestId('source-insert-overlay'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
