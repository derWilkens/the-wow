# Task 8: Frontend — SourceNode + DataObjectNode

**Files:**
- Create: `frontend/src/components/canvas/SourceNode.tsx`
- Create: `frontend/src/components/canvas/SourceNode.test.tsx`
- Create: `frontend/src/components/canvas/DataObjectNode.tsx`
- Create: `frontend/src/components/canvas/DataObjectNode.test.tsx`

- [ ] **Step 1: Failing tests für SourceNode schreiben**

`frontend/src/components/canvas/SourceNode.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SourceNode } from './SourceNode'
import type { CanvasObjectNodeData } from '../../types'

vi.mock('reactflow', () => ({
  Handle: () => null,
  Position: { Left: 'left', Right: 'right' },
}))

const baseData: CanvasObjectNodeData = {
  canvasObject: {
    id: 'obj-1',
    workspace_id: 'ws-1',
    parent_activity_id: null,
    object_type: 'quelle',
    name: 'SAP',
    position_x: 0,
    position_y: 0,
    updated_at: '',
  },
}

describe('SourceNode', () => {
  it('renders object name', () => {
    render(<SourceNode data={baseData} selected={false} />)
    expect(screen.getByText('SAP')).toBeInTheDocument()
  })

  it('renders Quelle label', () => {
    render(<SourceNode data={baseData} selected={false} />)
    expect(screen.getByText('Quelle')).toBeInTheDocument()
  })

  it('double-click enters inline edit', () => {
    render(<SourceNode data={baseData} selected={false} />)
    fireEvent.doubleClick(screen.getByText('SAP'))
    expect(screen.getByDisplayValue('SAP')).toBeInTheDocument()
  })

  it('Enter key calls onNameChange and exits edit', () => {
    const onNameChange = vi.fn()
    render(<SourceNode data={{ ...baseData, onNameChange }} selected={false} />)
    fireEvent.doubleClick(screen.getByText('SAP'))
    const input = screen.getByDisplayValue('SAP')
    fireEvent.change(input, { target: { value: 'Oracle' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onNameChange).toHaveBeenCalledWith('obj-1', 'Oracle')
  })
})
```

- [ ] **Step 2: Failing tests für DataObjectNode schreiben**

`frontend/src/components/canvas/DataObjectNode.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DataObjectNode } from './DataObjectNode'
import type { CanvasObjectNodeData } from '../../types'

vi.mock('reactflow', () => ({
  Handle: () => null,
  Position: { Left: 'left', Right: 'right' },
}))

const baseData: CanvasObjectNodeData = {
  canvasObject: {
    id: 'obj-2',
    workspace_id: 'ws-1',
    parent_activity_id: null,
    object_type: 'datenobjekt',
    name: 'Rechnung',
    position_x: 0,
    position_y: 0,
    updated_at: '',
  },
}

describe('DataObjectNode', () => {
  it('renders object name', () => {
    render(<DataObjectNode data={baseData} selected={false} />)
    expect(screen.getByText('Rechnung')).toBeInTheDocument()
  })

  it('renders Datenobjekt label', () => {
    render(<DataObjectNode data={baseData} selected={false} />)
    expect(screen.getByText('Datenobjekt')).toBeInTheDocument()
  })

  it('double-click calls onOpenPopup', () => {
    const onOpenPopup = vi.fn()
    render(<DataObjectNode data={{ ...baseData, onOpenPopup }} selected={false} />)
    fireEvent.doubleClick(screen.getByText('Rechnung'))
    expect(onOpenPopup).toHaveBeenCalledWith('obj-2')
  })
})
```

- [ ] **Step 3: Tests ausführen — erwartet FAIL**

```bash
cd frontend && npx vitest run src/components/canvas/SourceNode.test.tsx src/components/canvas/DataObjectNode.test.tsx
```

Erwartet: FAIL — Komponenten existieren nicht.

- [ ] **Step 4: SourceNode implementieren**

`frontend/src/components/canvas/SourceNode.tsx`:

```typescript
import { useCallback, useState } from 'react'
import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'
import type { CanvasObjectNodeData } from '../../types'

export function SourceNode({ data, selected }: NodeProps<CanvasObjectNodeData>) {
  const { canvasObject } = data
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(canvasObject.name)

  const handleDoubleClick = useCallback(() => {
    setDraft(canvasObject.name)
    setEditing(true)
  }, [canvasObject.name])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setEditing(false)
      data.onNameChange?.(canvasObject.id, draft)
    }
    if (e.key === 'Escape') {
      setDraft(canvasObject.name)
      setEditing(false)
    }
  }, [canvasObject.id, canvasObject.name, draft, data])

  return (
    <div
      style={{
        background: '#0e2a2a',
        border: `2px solid ${selected ? '#67e8f9' : '#22d3ee'}`,
        borderRadius: 20,
        padding: '4px 12px',
        minWidth: 100,
        textAlign: 'center',
        cursor: 'default',
      }}
    >
      <div style={{ fontSize: '0.6rem', color: '#67e8f9', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Quelle
      </div>

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setEditing(false)}
          className="w-full bg-slate-950 border border-cyan-400 rounded px-1 text-white text-xs font-semibold text-center outline-none"
        />
      ) : (
        <div
          onDoubleClick={handleDoubleClick}
          style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.8rem', marginTop: 1 }}
        >
          {canvasObject.name || <span style={{ color: '#475569', fontStyle: 'italic' }}>Kein Name</span>}
        </div>
      )}

      <Handle type="source" position={Position.Right} style={{ background: '#0f172a', border: '2px solid #22d3ee', width: 12, height: 12 }} />
    </div>
  )
}
```

- [ ] **Step 5: DataObjectNode implementieren**

`frontend/src/components/canvas/DataObjectNode.tsx`:

```typescript
import { useCallback } from 'react'
import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'
import type { CanvasObjectNodeData } from '../../types'

export function DataObjectNode({ data, selected }: NodeProps<CanvasObjectNodeData>) {
  const { canvasObject } = data

  const handleDoubleClick = useCallback(() => {
    data.onOpenPopup?.(canvasObject.id)
  }, [canvasObject.id, data])

  return (
    <div
      onDoubleClick={handleDoubleClick}
      style={{
        background: '#1a1400',
        border: `2px solid ${selected ? '#fbbf24' : '#f59e0b'}`,
        borderRadius: 6,
        padding: '4px 12px',
        minWidth: 110,
        textAlign: 'center',
        cursor: 'default',
      }}
    >
      <div style={{ fontSize: '0.6rem', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Datenobjekt
      </div>

      <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.8rem', marginTop: 1 }}>
        {canvasObject.name || <span style={{ color: '#475569', fontStyle: 'italic' }}>Kein Name</span>}
      </div>

      <Handle type="target" position={Position.Left} style={{ background: '#0f172a', border: '2px solid #f59e0b', width: 12, height: 12 }} />
      <Handle type="source" position={Position.Right} style={{ background: '#0f172a', border: '2px solid #f59e0b', width: 12, height: 12 }} />
    </div>
  )
}
```

- [ ] **Step 6: Tests ausführen — erwartet PASS**

```bash
cd frontend && npx vitest run src/components/canvas/SourceNode.test.tsx src/components/canvas/DataObjectNode.test.tsx
```

Erwartet: PASS (7 Tests grün).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/canvas/SourceNode.tsx \
        frontend/src/components/canvas/SourceNode.test.tsx \
        frontend/src/components/canvas/DataObjectNode.tsx \
        frontend/src/components/canvas/DataObjectNode.test.tsx
git commit -m "feat: add SourceNode and DataObjectNode canvas components"
```
