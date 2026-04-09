import type { LucideIcon } from 'lucide-react'
import { CheckCircle2, CircleHelp, FileCog, Forward, Shapes } from 'lucide-react'
import type { ActivityType } from '../../types'

export interface ActivityTypeOption {
  label: string
  value: ActivityType
  description: string
  icon: LucideIcon
}

export const activityTypeOptions: ActivityTypeOption[] = [
  {
    label: 'Unbestimmt',
    value: 'unbestimmt',
    description: 'Noch offen, welcher fachliche Aktivitaetstyp passend ist',
    icon: CircleHelp,
  },
  { label: 'Erstellen', value: 'erstellen', description: 'Neue Inhalte oder Ergebnisse erzeugen', icon: FileCog },
  {
    label: 'Transformieren / Aktualisieren',
    value: 'transformieren_aktualisieren',
    description: 'Bestehende Inhalte anpassen oder fortschreiben',
    icon: Shapes,
  },
  {
    label: 'Pruefen / Freigeben',
    value: 'pruefen_freigeben',
    description: 'Ergebnisse fachlich pruefen und freigeben',
    icon: CheckCircle2,
  },
  {
    label: 'Weiterleiten / Ablegen',
    value: 'weiterleiten_ablegen',
    description: 'Informationen weitergeben oder dokumentieren',
    icon: Forward,
  },
]

export const activityTypeOptionsByValue = Object.fromEntries(
  activityTypeOptions.map((option) => [option.value, option]),
) as Record<ActivityType, ActivityTypeOption>
