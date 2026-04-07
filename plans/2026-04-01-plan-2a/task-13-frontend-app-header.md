# Task 13: Frontend — AppHeader erweitern

**Files:**
- Modify: `frontend/src/components/layout/AppHeader.tsx`
- Modify: `frontend/src/components/layout/AppHeader.test.tsx`
- Modify: `frontend/src/pages/CanvasPage.tsx`

- [ ] **Step 1: Tests aktualisieren**

`frontend/src/components/layout/AppHeader.test.tsx` vollständig ersetzen:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AppHeader } from './AppHeader'

const baseProps = {
  workspaceName: 'Mein Workspace',
  canInsertStart: true,
  canInsertEnd: true,
  onInsertStart: vi.fn(),
  onInsertActivity: vi.fn(),
  onInsertEnd: vi.fn(),
  onInsertQuelle: vi.fn(),
  onInsertDatenobjekt: vi.fn(),
  onSignOut: vi.fn(),
}

describe('AppHeader', () => {
  it('renders workspace name', () => {
    render(<AppHeader {...baseProps} />)
    expect(screen.getByText('Mein Workspace')).toBeInTheDocument()
  })

  it('renders all five toolbar buttons', () => {
    render(<AppHeader {...baseProps} />)
    expect(screen.getByText('Start')).toBeInTheDocument()
    expect(screen.getByText('Aktivität')).toBeInTheDocument()
    expect(screen.getByText('Ende')).toBeInTheDocument()
    expect(screen.getByText('Quelle')).toBeInTheDocument()
    expect(screen.getByText('Datenobjekt')).toBeInTheDocument()
  })

  it('Quelle button calls onInsertQuelle', () => {
    const onInsertQuelle = vi.fn()
    render(<AppHeader {...baseProps} onInsertQuelle={onInsertQuelle} />)
    fireEvent.click(screen.getByText('Quelle'))
    expect(onInsertQuelle).toHaveBeenCalled()
  })

  it('Datenobjekt button calls onInsertDatenobjekt', () => {
    const onInsertDatenobjekt = vi.fn()
    render(<AppHeader {...baseProps} onInsertDatenobjekt={onInsertDatenobjekt} />)
    fireEvent.click(screen.getByText('Datenobjekt'))
    expect(onInsertDatenobjekt).toHaveBeenCalled()
  })

  it('Abmelden calls onSignOut', () => {
    const onSignOut = vi.fn()
    render(<AppHeader {...baseProps} onSignOut={onSignOut} />)
    fireEvent.click(screen.getByText('Abmelden'))
    expect(onSignOut).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Tests ausführen — erwartet FAIL**

```bash
cd frontend && npx vitest run src/components/layout/AppHeader.test.tsx
```

Erwartet: FAIL — `onInsertQuelle`, `onInsertDatenobjekt` nicht in Props.

- [ ] **Step 3: AppHeader erweitern**

`frontend/src/components/layout/AppHeader.tsx` vollständig ersetzen:

```typescript
interface AppHeaderProps {
  workspaceName: string
  canInsertStart: boolean
  canInsertEnd: boolean
  onInsertStart: () => void
  onInsertActivity: () => void
  onInsertEnd: () => void
  onInsertQuelle: () => void
  onInsertDatenobjekt: () => void
  onSignOut: () => void
}

export function AppHeader({
  workspaceName,
  canInsertStart,
  canInsertEnd,
  onInsertStart,
  onInsertActivity,
  onInsertEnd,
  onInsertQuelle,
  onInsertDatenobjekt,
  onSignOut,
}: AppHeaderProps) {
  return (
    <header style={{ background: '#1e293b', borderBottom: '1px solid #334155', height: 44, display: 'flex', alignItems: 'center', gap: 0, padding: '0 12px', flexShrink: 0 }}>
      <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', marginRight: 10 }}>Way of Working</span>
      <span style={{ color: '#334155', marginRight: 10 }}>|</span>
      <span style={{ color: '#60a5fa', fontSize: 11, fontWeight: 600, marginRight: 14 }}>{workspaceName}</span>
      <span style={{ color: '#334155', marginRight: 14 }}>|</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Start */}
        <button
          onClick={canInsertStart ? onInsertStart : undefined}
          title={canInsertStart ? undefined : 'Start bereits vorhanden'}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: canInsertStart ? '#1a2d1a' : '#0f1a0f', border: `1.5px solid ${canInsertStart ? '#34d399' : '#1a3a2a'}`, borderRadius: 20, cursor: canInsertStart ? 'pointer' : 'not-allowed', opacity: canInsertStart ? 1 : 0.4 }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5">
            <circle cx="12" cy="12" r="9" /><polygon points="10,8 16,12 10,16" fill="#34d399" stroke="none" />
          </svg>
          <span style={{ fontSize: 10, color: '#34d399', fontWeight: 600 }}>Start</span>
        </button>

        {/* Aktivität */}
        <button
          onClick={onInsertActivity}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: '#1e293b', border: '1.5px solid #3b82f6', borderRadius: 6, cursor: 'pointer' }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
            <rect x="3" y="6" width="18" height="12" rx="2" />
          </svg>
          <span style={{ fontSize: 10, color: '#60a5fa', fontWeight: 600 }}>Aktivität</span>
        </button>

        {/* Ende */}
        <button
          onClick={canInsertEnd ? onInsertEnd : undefined}
          title={canInsertEnd ? undefined : 'Ende bereits vorhanden'}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: canInsertEnd ? '#3a1e1e' : '#1a0f0f', border: `1.5px solid ${canInsertEnd ? '#ef4444' : '#3a1a1a'}`, borderRadius: 20, cursor: canInsertEnd ? 'pointer' : 'not-allowed', opacity: canInsertEnd ? 1 : 0.4 }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5">
            <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" fill="#f87171" stroke="none" />
          </svg>
          <span style={{ fontSize: 10, color: '#f87171', fontWeight: 600 }}>Ende</span>
        </button>

        <span style={{ color: '#334155', margin: '0 4px' }}>·</span>

        {/* Quelle */}
        <button
          onClick={onInsertQuelle}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: '#0e2a2a', border: '1.5px solid #22d3ee', borderRadius: 20, cursor: 'pointer' }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12h8M14 9l3 3-3 3" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 10, color: '#22d3ee', fontWeight: 600 }}>Quelle</span>
        </button>

        {/* Datenobjekt */}
        <button
          onClick={onInsertDatenobjekt}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: '#1a1400', border: '1.5px solid #f59e0b', borderRadius: 6, cursor: 'pointer' }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
            <rect x="4" y="3" width="12" height="16" rx="1" />
            <path d="M8 7h6M8 11h4" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>Datenobjekt</span>
        </button>
      </div>

      <div style={{ flex: 1 }} />
      <button onClick={onSignOut} style={{ background: 'transparent', border: 'none', color: '#475569', fontSize: 10, cursor: 'pointer' }}>
        Abmelden
      </button>
    </header>
  )
}
```

- [ ] **Step 4: Tests ausführen — erwartet PASS**

```bash
cd frontend && npx vitest run src/components/layout/AppHeader.test.tsx
```

Erwartet: PASS (5 Tests grün).

- [ ] **Step 5: CanvasPage anpassen**

In `frontend/src/pages/CanvasPage.tsx` den AppHeader-Aufruf erweitern:

```typescript
<AppHeader
  workspaceName={workspace?.name ?? '…'}
  canInsertStart={!callbacks?.hasStart}
  canInsertEnd={!callbacks?.hasEnd}
  onInsertStart={() => callbacks?.onInsertStart()}
  onInsertActivity={() => callbacks?.onInsertActivity()}
  onInsertEnd={() => callbacks?.onInsertEnd()}
  onInsertQuelle={() => callbacks?.onInsertQuelle()}
  onInsertDatenobjekt={() => callbacks?.onInsertDatenobjekt()}
  onSignOut={handleSignOut}
/>
```

- [ ] **Step 6: TypeScript-Check**

```bash
cd frontend && npx tsc --noEmit
```

Erwartet: Keine Fehler.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/layout/AppHeader.tsx \
        frontend/src/components/layout/AppHeader.test.tsx \
        frontend/src/pages/CanvasPage.tsx
git commit -m "feat: add Quelle and Datenobjekt toolbar buttons to AppHeader"
```
