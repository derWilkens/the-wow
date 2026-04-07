export const defaultTransportModes = [
  {
    key: 'direkt',
    label: 'Direkt',
    description: 'Direkte Übergabe ohne Zwischenspeicherung.',
    sort_order: 0,
    is_default: true,
  },
  {
    key: 'mail',
    label: 'Mail',
    description: 'Übergabe oder Benachrichtigung per E-Mail.',
    sort_order: 1,
    is_default: false,
  },
  {
    key: 'im_datenspeicher_bereitgestellt',
    label: 'Im Datenspeicher bereitgestellt',
    description: 'Ergebnis wird in einem Datenspeicher bereitgestellt.',
    sort_order: 2,
    is_default: false,
  },
  {
    key: 'zyklisch_abgeholt',
    label: 'Zyklisch abgeholt',
    description: 'Nachgelagerte Aktivität holt die Daten periodisch ab.',
    sort_order: 3,
    is_default: false,
  },
] as const

export type DefaultTransportMode = (typeof defaultTransportModes)[number]
