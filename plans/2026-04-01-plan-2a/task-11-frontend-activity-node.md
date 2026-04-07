# Task 11: Frontend — ActivityNode anpassen

**Files:**
- Modify: `frontend/src/components/canvas/ActivityNode.tsx`
- Modify: `frontend/src/components/canvas/ActivityNode.test.tsx`

- [ ] **Step 1: Tests aktualisieren**

`frontend/src/components/canvas/ActivityNode.test.tsx` vollständig ersetzen:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ActivityNode } from './ActivityNode'
import type { ActivityNodeData } from '../../types'

vi.mock('reactflow', () => ({
  Handle: () => null,
  Position: { Left: 'left', Right: 'right' },
}))

vi.mock('../../store/canvasStore', () => ({
  useCanvasStore: () => ({ drillInto: vi.fn() }),
}))

const baseActivity = {
  id: 'act-1',
  workspace_id: 'ws-1',
  parent_id: null,
  owner_id: 'u-1',
  label: 'Rechnungen prüfen',
  trigger_type: 'email' as const,
  position_x: 0,
  position_y: 0,
  status: 'draft' as const,
  status_icon: null,
  node_type: 'activity' as const,
  activity_type: null,
  description: null,
  notes: null,
  duration_minutes: null,
  updated_at: '',
}

const baseData: ActivityNodeData = {
  activity: baseActivity,
  hasChildren: false,
}

describe('ActivityNode', () => {
  it('renders activity label', () => {
    render(<ActivityNode data={baseData} selected={false} />)
    expect(screen.getByText('Rechnungen prüfen')).toBeInTheDocument()
  })

  it('shows filled subprocess marker when hasChildren is true', () => {
    render(<ActivityNode data={{ ...baseData, hasChildren: true }} selected={false} />)
    expect(screen.getByTitle('Subprozess öffnen')).toBeInTheDocument()
  })

  it('shows empty subprocess marker when hasChildren is false', () => {
    render(<ActivityNode data={baseData} selected={false} />)
    expect(screen.getByTitle('Subprozess anlegen')).toBeInTheDocument()
  })

  it('double-click calls onOpenDetail with activity id', () => {
    const onOpenDetail = vi.fn()
    render(<ActivityNode data={{ ...baseData, onOpenDetail }} selected={false} />)
    fireEvent.doubleClick(screen.getByText('Rechnungen prüfen'))
    expect(onOpenDetail).toHaveBeenCalledWith('act-1')
  })

  it('double-click does not open inline editor', () => {
    render(<ActivityNode data={baseData} selected={false} />)
    fireEvent.doubleClick(screen.getByText('Rechnungen prüfen'))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Tests ausführen — erwartet FAIL**

```bash
cd frontend && npx vitest run src/components/canvas/ActivityNode.test.tsx
```

Erwartet: FAIL — `onOpenDetail` wird nicht aufgerufen, Inline-Editor erscheint noch.

- [ ] **Step 3: ActivityNode anpassen**

`frontend/src/components/canvas/ActivityNode.tsx` vollständig ersetzen:

```typescript
import { useCallback, useState } from 'react'
import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'
import { TriggerIcon } from './TriggerIcon'
import { SubprocessMarker } from './SubprocessMarker'
import { StatusIconBadge } from './StatusIconBadge'
import { useCanvasStore } from '../../store/canvasStore'
import type { ActivityNodeData } from '../../types'

export function ActivityNode({ data, selected }: NodeProps<ActivityNodeData>) {
  const { activity, hasChildren } = data
  const { drillInto } = useCanvasStore()
  const [hovering, setHovering] = useState(false)

  const handleDoubleClick = useCallback(() => {
    data.onOpenDetail?.(activity.id)
  }, [activity.id, data])

  const handleSubprocessClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    drillInto(activity.id, activity.label)
  }, [activity.id, activity.label, drillInto])

  return (
    <div
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="relative"
      style={{
        background: '#1e293b',
        border: `2px solid ${selected ? '#60a5fa' : '#3b82f6'}`,
        borderRadius: 8,
        padding: '8px 16px 22px',
        minWidth: 152,
        textAlign: 'center',
        cursor: 'default',
      }}
    >
      <TriggerIcon type={activity.trigger_type} />

      <div style={{ fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Aktivität
      </div>

      <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.88rem', marginTop: 2 }}>
        {activity.label || <span style={{ color: '#475569', fontStyle: 'italic' }}>Kein Name</span>}
      </div>

      <div className="flex justify-center mt-1.5">
        <SubprocessMarker hasChildren={hasChildren} onClick={handleSubprocessClick} />
      </div>

      <div style={{ position: 'absolute', bottom: 5, left: 7 }}>
        <StatusIconBadge
          icon={activity.status_icon ?? null}
          isHovering={hovering}
          onChange={icon => data.onStatusIconChange?.(activity.id, icon)}
        />
      </div>

      <Handle type="target" position={Position.Left} style={{ background: '#0f172a', border: '2px solid #3b82f6', width: 14, height: 14 }} />
      <Handle type="source" position={Position.Right} style={{ background: '#0f172a', border: '2px solid #34d399', width: 14, height: 14 }} />
    </div>
  )
}
```

- [ ] **Step 4: Tests ausführen — erwartet PASS**

```bash
cd frontend && npx vitest run src/components/canvas/ActivityNode.test.tsx
```

Erwartet: PASS (5 Tests grün).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/canvas/ActivityNode.tsx \
        frontend/src/components/canvas/ActivityNode.test.tsx
git commit -m "feat: ActivityNode double-click opens detail popup instead of inline edit"
```
