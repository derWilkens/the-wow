# Task 9: Frontend — DataObjectPopup

**Files:**
- Create: `frontend/src/components/canvas/DataObjectPopup.tsx`
- Create: `frontend/src/components/canvas/DataObjectPopup.test.tsx`

- [ ] **Step 1: Failing tests schreiben**

`frontend/src/components/canvas/DataObjectPopup.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DataObjectPopup } from './DataObjectPopup'
import * as canvasObjectsApi from '../../api/canvasObjects'
import type { CanvasObject, ObjectField } from '../../types'

const mockObject: CanvasObject = {
  id: 'obj-1',
  workspace_id: 'ws-1',
  parent_activity_id: null,
  object_type: 'datenobjekt',
  name: 'Rechnung',
  position_x: 0,
  position_y: 0,
  updated_at: '',
}

const mockFields: ObjectField[] = [
  { id: 'f-1', object_id: 'obj-1', name: 'Betrag', field_type: 'decimal', required: true, sort_order: 0 },
]

vi.mock('../../api/canvasObjects', () => ({
  useObjectFields: vi.fn(),
  useUpsertObjectField: vi.fn(),
  useDeleteObjectField: vi.fn(),
  useUpsertCanvasObject: vi.fn(),
}))

function setupMocks() {
  vi.mocked(canvasObjectsApi.useObjectFields).mockReturnValue({
    data: mockFields,
  } as ReturnType<typeof canvasObjectsApi.useObjectFields>)
  vi.mocked(canvasObjectsApi.useUpsertObjectField).mockReturnValue({
    mutateAsync: vi.fn(),
  } as unknown as ReturnType<typeof canvasObjectsApi.useUpsertObjectField>)
  vi.mocked(canvasObjectsApi.useDeleteObjectField).mockReturnValue({
    mutateAsync: vi.fn(),
  } as unknown as ReturnType<typeof canvasObjectsApi.useDeleteObjectField>)
  vi.mocked(canvasObjectsApi.useUpsertCanvasObject).mockReturnValue({
    mutateAsync: vi.fn(),
  } as unknown as ReturnType<typeof canvasObjectsApi.useUpsertCanvasObject>)
}

describe('DataObjectPopup', () => {
  it('renders object name in header', () => {
    setupMocks()
    render(
      <DataObjectPopup canvasObject={mockObject} workspaceId="ws-1" onClose={vi.fn()} />,
    )
    expect(screen.getByDisplayValue('Rechnung')).toBeInTheDocument()
  })

  it('renders existing fields', () => {
    setupMocks()
    render(
      <DataObjectPopup canvasObject={mockObject} workspaceId="ws-1" onClose={vi.fn()} />,
    )
    expect(screen.getByDisplayValue('Betrag')).toBeInTheDocument()
  })

  it('clicking Schließen calls onClose', () => {
    setupMocks()
    const onClose = vi.fn()
    render(
      <DataObjectPopup canvasObject={mockObject} workspaceId="ws-1" onClose={onClose} />,
    )
    fireEvent.click(screen.getByText('Schließen'))
    expect(onClose).toHaveBeenCalled()
  })

  it('clicking + Feld hinzufügen adds an empty field row', async () => {
    setupMocks()
    render(
      <DataObjectPopup canvasObject={mockObject} workspaceId="ws-1" onClose={vi.fn()} />,
    )
    fireEvent.click(screen.getByText('+ Feld hinzufügen'))
    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('Feldname')).toHaveLength(1)
    })
  })
})
```

- [ ] **Step 2: Test ausführen — erwartet FAIL**

```bash
cd frontend && npx vitest run src/components/canvas/DataObjectPopup.test.tsx
```

Erwartet: FAIL — Komponente existiert nicht.

- [ ] **Step 3: DataObjectPopup implementieren**

`frontend/src/components/canvas/DataObjectPopup.tsx`:

```typescript
import { useState } from 'react'
import type { CanvasObject, ObjectField, ObjectFieldType } from '../../types'
import {
  useObjectFields,
  useUpsertObjectField,
  useDeleteObjectField,
  useUpsertCanvasObject,
} from '../../api/canvasObjects'

interface DataObjectPopupProps {
  canvasObject: CanvasObject
  workspaceId: string
  onClose: () => void
}

interface DraftField {
  id?: string
  name: string
  field_type: ObjectFieldType
  required: boolean
  sort_order: number
}

const FIELD_TYPES: ObjectFieldType[] = ['text', 'integer', 'decimal', 'date', 'boolean']

export function DataObjectPopup({ canvasObject, workspaceId, onClose }: DataObjectPopupProps) {
  const [name, setName] = useState(canvasObject.name)
  const [newFields, setNewFields] = useState<DraftField[]>([])

  const { data: savedFields = [] } = useObjectFields(workspaceId, canvasObject.id)
  const upsertObject = useUpsertCanvasObject(workspaceId)
  const upsertField = useUpsertObjectField(workspaceId, canvasObject.id)
  const deleteField = useDeleteObjectField(workspaceId, canvasObject.id)

  async function handleSave() {
    if (name !== canvasObject.name) {
      await upsertObject.mutateAsync({
        id: canvasObject.id,
        name,
        object_type: canvasObject.object_type,
        position_x: canvasObject.position_x,
        position_y: canvasObject.position_y,
        parent_activity_id: canvasObject.parent_activity_id,
      })
    }
    for (const f of newFields) {
      if (f.name.trim()) {
        await upsertField.mutateAsync(f)
      }
    }
    setNewFields([])
    onClose()
  }

  function addNewField() {
    setNewFields(prev => [
      ...prev,
      { name: '', field_type: 'text', required: false, sort_order: savedFields.length + prev.length },
    ])
  }

  function updateNewField(index: number, patch: Partial<DraftField>) {
    setNewFields(prev => prev.map((f, i) => i === index ? { ...f, ...patch } : f))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 24, width: 480, maxHeight: '80vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.65rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Datenobjekt</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        <input
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '6px 10px', color: '#e2e8f0', fontSize: '1rem', fontWeight: 600, width: '100%' }}
        />

        {savedFields.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>Felder</span>
            {savedFields.map((field: ObjectField) => (
              <FieldRow key={field.id} field={field} onDelete={() => deleteField.mutateAsync(field.id)} />
            ))}
          </div>
        )}

        {newFields.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              placeholder="Feldname"
              value={f.name}
              onChange={e => updateNewField(i, { name: e.target.value })}
              style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: 4, padding: '4px 8px', color: '#e2e8f0', fontSize: '0.8rem' }}
            />
            <select
              value={f.field_type}
              onChange={e => updateNewField(i, { field_type: e.target.value as ObjectFieldType })}
              style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 4, padding: '4px 6px', color: '#e2e8f0', fontSize: '0.8rem' }}
            >
              {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontSize: '0.75rem' }}>
              <input type="checkbox" checked={f.required} onChange={e => updateNewField(i, { required: e.target.checked })} />
              Pflicht
            </label>
            <button onClick={() => setNewFields(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
        ))}

        <button onClick={addNewField} style={{ background: 'none', border: '1px dashed #334155', borderRadius: 6, padding: '6px 0', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}>
          + Feld hinzufügen
        </button>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #334155', borderRadius: 6, padding: '6px 16px', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}>
            Schließen
          </button>
          <button onClick={handleSave} style={{ background: '#f59e0b', border: 'none', borderRadius: 6, padding: '6px 16px', color: '#0f172a', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
            Speichern
          </button>
        </div>
      </div>
    </div>
  )
}

function FieldRow({ field, onDelete }: { field: ObjectField; onDelete: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input defaultValue={field.name} readOnly style={{ flex: 1, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4, padding: '4px 8px', color: '#94a3b8', fontSize: '0.8rem' }} />
      <span style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4, padding: '4px 6px', color: '#64748b', fontSize: '0.75rem' }}>{field.field_type}</span>
      {field.required && <span style={{ color: '#f59e0b', fontSize: '0.7rem' }}>Pflicht</span>}
      <button onClick={onDelete} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>×</button>
    </div>
  )
}
```

- [ ] **Step 4: Tests ausführen — erwartet PASS**

```bash
cd frontend && npx vitest run src/components/canvas/DataObjectPopup.test.tsx
```

Erwartet: PASS (4 Tests grün).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/canvas/DataObjectPopup.tsx \
        frontend/src/components/canvas/DataObjectPopup.test.tsx
git commit -m "feat: add DataObjectPopup with field editor"
```
