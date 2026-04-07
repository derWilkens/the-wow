export interface DefaultWorkflowTemplateSeed {
  key: string
  name: string
  description: string
  category: string
  snapshot: Record<string, unknown>
}

export const defaultWorkflowTemplates: DefaultWorkflowTemplateSeed[] = [
  {
    key: 'freigabeprozess',
    name: 'Freigabeprozess',
    description: 'Ein typischer Ablauf mit Erstellung, Prüfung und Freigabe.',
    category: 'Pruefung',
    snapshot: {
      rootWorkspace: {
        name: 'Freigabeprozess',
        purpose: 'Dokument oder Antrag erstellen, pruefen und freigeben.',
        expected_inputs: ['Antrag'],
        expected_outputs: ['Freigabe'],
      },
      workspaces: [],
      activities: [
        { tempId: 'start', parentTempId: null, node_type: 'start_event', label: 'Start', position_x: 60, position_y: 220 },
        { tempId: 'create', parentTempId: null, node_type: 'activity', label: 'Antrag erstellen', position_x: 250, position_y: 190 },
        { tempId: 'review', parentTempId: null, node_type: 'activity', label: 'Pruefen', position_x: 520, position_y: 190 },
        { tempId: 'approve', parentTempId: null, node_type: 'activity', label: 'Freigeben', position_x: 790, position_y: 190 },
        { tempId: 'end', parentTempId: null, node_type: 'end_event', label: 'Ende', position_x: 1040, position_y: 220 },
      ],
      edges: [
        { tempId: 'e1', from: 'start', to: 'create' },
        { tempId: 'e2', from: 'create', to: 'review' },
        { tempId: 'e3', from: 'review', to: 'approve' },
        { tempId: 'e4', from: 'approve', to: 'end' },
      ],
      canvasObjects: [],
    },
  },
  {
    key: 'rechnungseingang',
    name: 'Rechnungseingang',
    description: 'Vorbefuellter Ablauf fuer Eingang, Pruefung und Ablage einer Rechnung.',
    category: 'Finanzen',
    snapshot: {
      rootWorkspace: {
        name: 'Rechnungseingang',
        purpose: 'Rechnung entgegennehmen, pruefen und ablegen.',
        expected_inputs: ['Rechnung'],
        expected_outputs: ['Gepruefte Rechnung'],
      },
      workspaces: [],
      activities: [
        { tempId: 'start', parentTempId: null, node_type: 'start_event', label: 'Start', position_x: 60, position_y: 240 },
        { tempId: 'receive', parentTempId: null, node_type: 'activity', label: 'Rechnung erfassen', position_x: 240, position_y: 210 },
        { tempId: 'check', parentTempId: null, node_type: 'activity', label: 'Rechnung pruefen', position_x: 500, position_y: 210 },
        { tempId: 'store', parentTempId: null, node_type: 'activity', label: 'Im Datenspeicher ablegen', position_x: 760, position_y: 210 },
        { tempId: 'end', parentTempId: null, node_type: 'end_event', label: 'Ende', position_x: 1000, position_y: 240 },
      ],
      edges: [
        { tempId: 'e1', from: 'start', to: 'receive' },
        { tempId: 'e2', from: 'receive', to: 'check' },
        { tempId: 'e3', from: 'check', to: 'store' },
        { tempId: 'e4', from: 'store', to: 'end' },
      ],
      canvasObjects: [
        { tempId: 'invoice', object_type: 'datenobjekt', name: 'Rechnung', edgeTempId: 'e1', edge_sort_order: 0, fields: [] },
        { tempId: 'checked-invoice', object_type: 'datenobjekt', name: 'Gepruefte Rechnung', edgeTempId: 'e3', edge_sort_order: 0, fields: [] },
      ],
    },
  },
]
