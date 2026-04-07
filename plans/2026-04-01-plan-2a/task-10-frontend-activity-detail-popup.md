# Task 10: Frontend — ActivityDetailPopup

**Files:**
- Create: `frontend/src/components/canvas/ActivityDetailPopup.tsx`
- Create: `frontend/src/components/canvas/ActivityDetailPopup.test.tsx`

- [ ] **Step 1: Failing tests schreiben**

`frontend/src/components/canvas/ActivityDetailPopup.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ActivityDetailPopup } from './ActivityDetailPopup'
import * as activitiesApi from '../../api/activities'
import * as resourcesApi from '../../api/activityResources'
import * as edgesApi from '../../api/canvasEdges'
import * as objectsApi from '../../api/canvasObjects'
import type { Activity } from '../../types'

const mockActivity: Activity = {
  id: 'act-1',
  workspace_id: 'ws-1',
  parent_id: null,
  owner_id: 'u-1',
  node_type: 'activity',
  label: 'Rechnung prüfen',
  trigger_type: null,
  position_x: 0,
  position_y: 0,
  status: 'draft',
  status_icon: null,
  activity_type: null,
  description: null,
  notes: null,
  duration_minutes: null,
  updated_at: '',
}

vi.mock('../../api/activities', () => ({ useUpsertActivity: vi.fn() }))
vi.mock('../../api/activityResources', () => ({
  useActivityTools: vi.fn(),
  useAddActivityTool: vi.fn(),
  useRemoveActivityTool: vi.fn(),
  useCheckSources: vi.fn(),
  useAddCheckSource: vi.fn(),
  useRemoveCheckSource: vi.fn(),
}))
vi.mock('../../api/canvasEdges', () => ({ useCanvasEdges: vi.fn() }))
vi.mock('../../api/canvasObjects', () => ({ useCanvasObjects: vi.fn() }))

function setupMocks() {
  vi.mocked(activitiesApi.useUpsertActivity).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue(mockActivity),
  } as unknown as ReturnType<typeof activitiesApi.useUpsertActivity>)
  vi.mocked(resourcesApi.useActivityTools).mockReturnValue({ data: [] } as unknown as ReturnType<typeof resourcesApi.useActivityTools>)
  vi.mocked(resourcesApi.useAddActivityTool).mockReturnValue({ mutateAsync: vi.fn() } as unknown as ReturnType<typeof resourcesApi.useAddActivityTool>)
  vi.mocked(resourcesApi.useRemoveActivityTool).mockReturnValue({ mutateAsync: vi.fn() } as unknown as ReturnType<typeof resourcesApi.useRemoveActivityTool>)
  vi.mocked(resourcesApi.useCheckSources).mockReturnValue({ data: [] } as unknown as ReturnType<typeof resourcesApi.useCheckSources>)
  vi.mocked(resourcesApi.useAddCheckSource).mockReturnValue({ mutateAsync: vi.fn() } as unknown as ReturnType<typeof resourcesApi.useAddCheckSource>)
  vi.mocked(resourcesApi.useRemoveCheckSource).mockReturnValue({ mutateAsync: vi.fn() } as unknown as ReturnType<typeof resourcesApi.useRemoveCheckSource>)
  vi.mocked(edgesApi.useCanvasEdges).mockReturnValue({ data: [] } as unknown as ReturnType<typeof edgesApi.useCanvasEdges>)
  vi.mocked(objectsApi.useCanvasObjects).mockReturnValue({ data: [] } as unknown as ReturnType<typeof objectsApi.useCanvasObjects>)
}

describe('ActivityDetailPopup', () => {
  it('renders activity label in Bezeichnung field', () => {
    setupMocks()
    render(<ActivityDetailPopup activity={mockActivity} workspaceId="ws-1" parentActivityId={null} onClose={vi.fn()} />)
    expect(screen.getByDisplayValue('Rechnung prüfen')).toBeInTheDocument()
  })

  it('renders all four Aktivitätstyp buttons', () => {
    setupMocks()
    render(<ActivityDetailPopup activity={mockActivity} workspaceId="ws-1" parentActivityId={null} onClose={vi.fn()} />)
    expect(screen.getByText('Erstellen')).toBeInTheDocument()
    expect(screen.getByText('Transformieren / Aktualisieren')).toBeInTheDocument()
    expect(screen.getByText('Prüfen / Freigeben')).toBeInTheDocument()
    expect(screen.getByText('Weiterleiten / Ablegen')).toBeInTheDocument()
  })

  it('Sollzustand section hidden when activity_type is not pruefen_freigeben', () => {
    setupMocks()
    render(<ActivityDetailPopup activity={mockActivity} workspaceId="ws-1" parentActivityId={null} onClose={vi.fn()} />)
    expect(screen.queryByText('Sollzustand')).not.toBeInTheDocument()
  })

  it('Sollzustand section visible when pruefen_freigeben selected', () => {
    setupMocks()
    render(<ActivityDetailPopup activity={{ ...mockActivity, activity_type: 'pruefen_freigeben' }} workspaceId="ws-1" parentActivityId={null} onClose={vi.fn()} />)
    expect(screen.getByText('Sollzustand')).toBeInTheDocument()
  })

  it('Abbrechen calls onClose without saving', () => {
    setupMocks()
    const onClose = vi.fn()
    const mutateAsync = vi.fn()
    vi.mocked(activitiesApi.useUpsertActivity).mockReturnValue({ mutateAsync } as unknown as ReturnType<typeof activitiesApi.useUpsertActivity>)
    render(<ActivityDetailPopup activity={mockActivity} workspaceId="ws-1" parentActivityId={null} onClose={onClose} />)
    fireEvent.click(screen.getByText('Abbrechen'))
    expect(onClose).toHaveBeenCalled()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('Speichern calls upsertActivity and then onClose', async () => {
    setupMocks()
    const onClose = vi.fn()
    render(<ActivityDetailPopup activity={mockActivity} workspaceId="ws-1" parentActivityId={null} onClose={onClose} />)
    fireEvent.click(screen.getByText('Speichern'))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})
```

- [ ] **Step 2: Test ausführen — erwartet FAIL**

```bash
cd frontend && npx vitest run src/components/canvas/ActivityDetailPopup.test.tsx
```

Erwartet: FAIL — Komponente existiert nicht.

- [ ] **Step 3: ActivityDetailPopup implementieren**

`frontend/src/components/canvas/ActivityDetailPopup.tsx`:

```typescript
import { useState } from 'react'
import type { Activity, ActivityType, CanvasObject, CanvasEdge } from '../../types'
import { useUpsertActivity } from '../../api/activities'
import {
  useActivityTools,
  useAddActivityTool,
  useRemoveActivityTool,
  useCheckSources,
  useAddCheckSource,
  useRemoveCheckSource,
} from '../../api/activityResources'
import { useCanvasEdges } from '../../api/canvasEdges'
import { useCanvasObjects } from '../../api/canvasObjects'

interface ActivityDetailPopupProps {
  activity: Activity
  workspaceId: string
  parentActivityId: string | null
  onClose: () => void
}

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: 'erstellen', label: 'Erstellen' },
  { value: 'transformieren_aktualisieren', label: 'Transformieren / Aktualisieren' },
  { value: 'pruefen_freigeben', label: 'Prüfen / Freigeben' },
  { value: 'weiterleiten_ablegen', label: 'Weiterleiten / Ablegen' },
]

export function ActivityDetailPopup({ activity, workspaceId, parentActivityId, onClose }: ActivityDetailPopupProps) {
  const [label, setLabel] = useState(activity.label)
  const [activityType, setActivityType] = useState<ActivityType | null>(activity.activity_type)
  const [description, setDescription] = useState(activity.description ?? '')
  const [notes, setNotes] = useState(activity.notes ?? '')
  const [duration, setDuration] = useState(activity.duration_minutes?.toString() ?? '')
  const [toolInput, setToolInput] = useState('')

  const upsert = useUpsertActivity(workspaceId)
  const { data: tools = [] } = useActivityTools(workspaceId, activity.id)
  const addTool = useAddActivityTool(workspaceId, activity.id)
  const removeTool = useRemoveActivityTool(workspaceId, activity.id)
  const { data: checkSources = [] } = useCheckSources(workspaceId, activity.id)
  const addCheckSource = useAddCheckSource(workspaceId, activity.id)
  const removeCheckSource = useRemoveCheckSource(workspaceId, activity.id)
  const { data: edges = [] } = useCanvasEdges(workspaceId, parentActivityId)
  const { data: canvasObjects = [] } = useCanvasObjects(workspaceId, parentActivityId)

  const incomingObjects = edges
    .filter((e: CanvasEdge) => e.to_node_id === activity.id && e.from_node_type === 'canvas_object')
    .map((e: CanvasEdge) => canvasObjects.find((o: CanvasObject) => o.id === e.from_node_id))
    .filter(Boolean) as CanvasObject[]

  const outgoingObjects = edges
    .filter((e: CanvasEdge) => e.from_node_id === activity.id && e.to_node_type === 'canvas_object')
    .map((e: CanvasEdge) => canvasObjects.find((o: CanvasObject) => o.id === e.to_node_id))
    .filter(Boolean) as CanvasObject[]

  const datenobjekte = canvasObjects.filter((o: CanvasObject) => o.object_type === 'datenobjekt')
  const isPruefen = activityType === 'pruefen_freigeben'
  const saveDisabled = isPruefen && checkSources.length === 0

  async function handleSave() {
    await upsert.mutateAsync({
      id: activity.id,
      label,
      position_x: activity.position_x,
      position_y: activity.position_y,
      parent_id: parentActivityId,
      node_type: activity.node_type,
      activity_type: activityType,
      description: description || null,
      notes: notes || null,
      duration_minutes: duration ? parseInt(duration, 10) : null,
    })
    onClose()
  }

  async function handleAddTool() {
    const name = toolInput.trim()
    if (!name) return
    await addTool.mutateAsync(name)
    setToolInput('')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', zIndex: 50 }}>
      <div style={{ background: '#1e293b', borderLeft: '1px solid #334155', width: 420, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Aktivität</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>

          {/* 1. Bezeichnung */}
          <Section label="Bezeichnung">
            <input value={label} onChange={e => setLabel(e.target.value)} style={inputStyle} />
          </Section>

          {/* 2. Aktivitätstyp */}
          <Section label="Aktivitätstyp">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {ACTIVITY_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setActivityType(activityType === t.value ? null : t.value)}
                  style={{ padding: '6px 8px', background: activityType === t.value ? '#1e3a5f' : '#0f172a', border: `1.5px solid ${activityType === t.value ? '#3b82f6' : '#334155'}`, borderRadius: 6, color: activityType === t.value ? '#93c5fd' : '#64748b', fontSize: '0.72rem', cursor: 'pointer', textAlign: 'left' }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Section>

          {/* 3. Beschreibung */}
          <Section label="Beschreibung">
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </Section>

          {/* 4. Notizen */}
          <Section label="Notizen">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </Section>

          {/* 5. Dauer + Ausführende(r) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Section label="Dauer (Min.)">
              <input type="number" value={duration} onChange={e => setDuration(e.target.value)} min={0} style={inputStyle} />
            </Section>
            <Section label="Ausführende(r)">
              <div style={{ ...inputStyle, color: '#475569', fontSize: '0.75rem' }}>{activity.owner_id.slice(0, 8)}…</div>
            </Section>
          </div>

          {/* 6. Tools / Systeme */}
          <Section label="Tools / Systeme">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {tools.map(t => (
                <span key={t.tool_name} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, padding: '2px 10px', color: '#94a3b8', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {t.tool_name}
                  <button onClick={() => removeTool.mutateAsync(t.tool_name)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={toolInput} onChange={e => setToolInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTool()} placeholder="Tool hinzufügen…" style={{ ...inputStyle, flex: 1 }} />
              <button onClick={handleAddTool} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '4px 10px', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}>+</button>
            </div>
          </Section>

          {/* 7. Eingaben */}
          {incomingObjects.length > 0 && (
            <Section label="Eingaben">
              {incomingObjects.map(o => (
                <div key={o.id} style={{ color: '#94a3b8', fontSize: '0.8rem', padding: '3px 0' }}>{o.name || '(ohne Name)'}</div>
              ))}
            </Section>
          )}

          {/* 8. Ausgaben */}
          {outgoingObjects.length > 0 && (
            <Section label="Ausgaben">
              {outgoingObjects.map(o => (
                <div key={o.id} style={{ color: '#94a3b8', fontSize: '0.8rem', padding: '3px 0' }}>{o.name || '(ohne Name)'}</div>
              ))}
            </Section>
          )}

          {/* 9. Sollzustand */}
          {isPruefen && (
            <Section label="Sollzustand">
              <div style={{ background: '#1a0f2e', border: '1px solid #6d28d9', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {checkSources.map(cs => {
                  const obj = canvasObjects.find((o: CanvasObject) => o.id === cs.canvas_object_id)
                  return (
                    <div key={cs.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#c4b5fd', fontSize: '0.8rem' }}>{obj?.name ?? cs.canvas_object_id}</span>
                      <button onClick={() => removeCheckSource.mutateAsync(cs.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>×</button>
                    </div>
                  )
                })}
                <select
                  defaultValue=""
                  onChange={async e => {
                    if (!e.target.value) return
                    await addCheckSource.mutateAsync({ canvas_object_id: e.target.value, notes: null })
                    e.target.value = ''
                  }}
                  style={{ background: '#0f172a', border: '1px solid #6d28d9', borderRadius: 4, padding: '4px 8px', color: '#c4b5fd', fontSize: '0.8rem' }}
                >
                  <option value="">+ Datenobjekt wählen…</option>
                  {datenobjekte.map((o: CanvasObject) => (
                    <option key={o.id} value={o.id}>{o.name || '(ohne Name)'}</option>
                  ))}
                </select>
                {checkSources.length === 0 && (
                  <span style={{ color: '#ef4444', fontSize: '0.72rem' }}>Mindestens ein Sollzustand erforderlich.</span>
                )}
              </div>
            </Section>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #334155', borderRadius: 6, padding: '6px 16px', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}>
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saveDisabled}
            style={{ background: saveDisabled ? '#1e3a5f' : '#3b82f6', border: 'none', borderRadius: 6, padding: '6px 16px', color: saveDisabled ? '#475569' : '#fff', cursor: saveDisabled ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: 6,
  padding: '6px 10px',
  color: '#e2e8f0',
  fontSize: '0.85rem',
  width: '100%',
}
```

- [ ] **Step 4: Tests ausführen — erwartet PASS**

```bash
cd frontend && npx vitest run src/components/canvas/ActivityDetailPopup.test.tsx
```

Erwartet: PASS (6 Tests grün).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/canvas/ActivityDetailPopup.tsx \
        frontend/src/components/canvas/ActivityDetailPopup.test.tsx
git commit -m "feat: add ActivityDetailPopup with metadata, tools, check sources and edges"
```
