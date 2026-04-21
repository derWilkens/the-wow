import type { ReactNode } from 'react'

export function DetailPanel({
  title,
  eyebrow,
  accent,
  icon,
  children,
}: {
  title: string
  eyebrow: string
  accent: 'mint' | 'amber' | 'cyan'
  icon: ReactNode
  children: ReactNode
}) {
  const accents = {
    mint: 'border-[rgba(22,163,74,0.18)] bg-[rgba(22,163,74,0.04)]',
    amber: 'border-[rgba(217,119,6,0.18)] bg-[rgba(217,119,6,0.04)]',
    cyan: 'border-[var(--wow-panel-border)] bg-[var(--wow-secondary-soft)]',
  }

  return (
    <section className={`rounded-[var(--wow-panel-radius)] border p-5 ${accents[accent]}`}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="wow-ui-eyebrow">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">{title}</h2>
        </div>
        <div className="wow-ui-icon-button">{icon}</div>
      </div>
      {children}
    </section>
  )
}
