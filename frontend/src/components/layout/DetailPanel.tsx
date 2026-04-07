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
    mint: 'from-emerald-400/15 to-cyan-400/5 border-emerald-300/15',
    amber: 'from-amber-400/15 to-orange-400/5 border-amber-300/15',
    cyan: 'from-cyan-400/15 to-sky-400/5 border-cyan-300/15',
  }

  return (
    <section className={`rounded-[24px] border bg-gradient-to-b p-5 ${accents[accent]}`}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{eyebrow}</p>
          <h2 className="mt-1 font-display text-lg text-white">{title}</h2>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-200">{icon}</div>
      </div>
      {children}
    </section>
  )
}
