import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GatewayNode } from './GatewayNode'
import type { Activity } from '../../types'

vi.mock('reactflow', async () => {
  const React = await import('react')
  return {
    Handle: ({ id }: { id: string }) => <div data-testid={id} />,
    Position: { Top: 'top', Right: 'right', Bottom: 'bottom', Left: 'left' },
  }
})

function createGateway(node_type: Activity['node_type'], label: string): Activity {
  return {
    id: 'gateway-1',
    workspace_id: 'workspace-1',
    parent_id: null,
    owner_id: 'user-1',
    node_type,
    label,
    trigger_type: null,
    position_x: 0,
    position_y: 0,
    status: 'draft',
    status_icon: null,
    activity_type: null,
    description: null,
    notes: null,
    duration_minutes: null,
    linked_workflow_id: null,
    linked_workflow_mode: null,
    linked_workflow_purpose: null,
    linked_workflow_inputs: [],
    linked_workflow_outputs: [],
    updated_at: '2026-04-04T00:00:00.000Z',
  }
}

describe('GatewayNode', () => {
  it('renders a decision gateway with the business label', () => {
    render(
      <GatewayNode
        id="gateway-1"
        data={{
          activity: createGateway('gateway_decision', 'Freigabe?'),
          hasChildren: false,
          onOpenDetail: vi.fn(),
          onOpenSubprocessMenu: vi.fn(),
          onOpenSubprocess: vi.fn(),
        }}
        selected={false}
        xPos={0}
        yPos={0}
        dragging={false}
        zIndex={1}
        isConnectable
        type="gatewayNode"
      />,
    )

    expect(screen.getByTestId('gateway-node-gateway-1')).toHaveTextContent('Entscheidung')
    expect(screen.getByTestId('gateway-node-gateway-1')).toHaveTextContent('Freigabe?')
  })

  it('renders a merge gateway with the business label', () => {
    render(
      <GatewayNode
        id="gateway-1"
        data={{
          activity: createGateway('gateway_merge', 'Pfad zusammenführen'),
          hasChildren: false,
          onOpenDetail: vi.fn(),
          onOpenSubprocessMenu: vi.fn(),
          onOpenSubprocess: vi.fn(),
        }}
        selected={false}
        xPos={0}
        yPos={0}
        dragging={false}
        zIndex={1}
        isConnectable
        type="gatewayNode"
      />,
    )

    expect(screen.getByTestId('gateway-node-gateway-1')).toHaveTextContent('Zusammenführung')
    expect(screen.getByTestId('gateway-node-gateway-1')).toHaveTextContent('Pfad zusammenführen')
  })
})
