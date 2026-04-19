import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { GroupNode } from './GroupNode'
import { createCanvasGroup } from './WorkflowCanvas.test-utils'

describe('GroupNode', () => {
  it('renders the member count badge', () => {
    render(
      <GroupNode
        id="group-1"
        data={{
          canvasGroup: createCanvasGroup(),
          memberCount: 3,
        }}
        type="groupNode"
        selected={false}
        xPos={0}
        yPos={0}
        zIndex={0}
        isConnectable={false}
        dragging={false}
      />,
    )

    expect(screen.getByTestId('group-node-count-group-1')).toHaveTextContent('3')
  })

  it('shows a lock indicator for locked groups', () => {
    render(
      <GroupNode
        id="group-1"
        data={{
          canvasGroup: createCanvasGroup({ locked: true }),
          memberCount: 2,
        }}
        type="groupNode"
        selected={false}
        xPos={0}
        yPos={0}
        zIndex={0}
        isConnectable={false}
        dragging={false}
      />,
    )

    expect(screen.getByTestId('group-node-lock-group-1')).toBeVisible()
  })

  it('renders quick actions for selected groups and wires lock/delete', () => {
    const onToggleLock = vi.fn()
    const onDelete = vi.fn()
    const onBringToFront = vi.fn()
    const onSendToBack = vi.fn()

    render(
      <GroupNode
        id="group-1"
        data={{
          canvasGroup: createCanvasGroup(),
          memberCount: 2,
          onBringToFront,
          onSendToBack,
          onToggleLock,
          onDelete,
        }}
        type="groupNode"
        selected
        xPos={0}
        yPos={0}
        zIndex={0}
        isConnectable={false}
        dragging={false}
      />,
    )

    fireEvent.click(screen.getByTestId('group-node-bring-front-group-1'))
    fireEvent.click(screen.getByTestId('group-node-send-back-group-1'))
    fireEvent.click(screen.getByTestId('group-node-toggle-lock-group-1'))
    fireEvent.click(screen.getByTestId('group-node-delete-group-1'))

    expect(onBringToFront).toHaveBeenCalledWith('group-1')
    expect(onSendToBack).toHaveBeenCalledWith('group-1')
    expect(onToggleLock).toHaveBeenCalledWith('group-1')
    expect(onDelete).toHaveBeenCalledWith('group-1')
  })

  it('marks the header as the explicit interaction area for group-level actions', () => {
    render(
      <GroupNode
        id="group-1"
        data={{
          canvasGroup: createCanvasGroup(),
          memberCount: 1,
        }}
        type="groupNode"
        selected={false}
        xPos={0}
        yPos={0}
        zIndex={0}
        isConnectable={false}
        dragging={false}
      />,
    )

    expect(screen.getByTestId('group-node-header-group-1')).toBeVisible()
  })

  it('supports inline renaming and collapse toggle from the header', () => {
    const onRename = vi.fn()
    const onCancelRename = vi.fn()
    const onToggleCollapsed = vi.fn()

    function Harness() {
      const [draftLabel, setDraftLabel] = useState('Gruppe 1')

      return (
        <GroupNode
          id="group-1"
          data={{
            canvasGroup: createCanvasGroup(),
            draftLabel,
            memberCount: 1,
            onRename,
            onDraftLabelChange: (_groupId, label) => setDraftLabel(label),
            onCancelRename,
            onToggleCollapsed,
          }}
          type="groupNode"
          selected
          xPos={0}
          yPos={0}
          zIndex={0}
          isConnectable={false}
          dragging={false}
        />
      )
    }

    render(<Harness />)

    fireEvent.click(screen.getByTestId('group-node-toggle-collapsed-group-1'))
    fireEvent.change(screen.getByTestId('group-node-label-input-group-1'), { target: { value: 'Neuer Gruppenname' } })
    fireEvent.blur(screen.getByTestId('group-node-label-input-group-1'))

    expect(onToggleCollapsed).toHaveBeenCalledWith('group-1')
    expect(onRename).toHaveBeenCalledWith('group-1', 'Neuer Gruppenname')
    expect(onCancelRename).not.toHaveBeenCalled()
  })
})
