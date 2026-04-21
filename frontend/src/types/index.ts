export type TriggerType = 'email' | 'schedule' | 'manual' | 'webhook' | 'file_drop'
export type ActivityStatus = 'draft' | 'ready_for_review' | 'reviewed'
export type NodeType = 'activity' | 'start_event' | 'end_event' | 'gateway_decision' | 'gateway_merge'
export type StatusIcon = 'unclear' | 'ok' | 'in_progress' | 'blocked' | null
export type ActivityType =
  | 'unbestimmt'
  | 'erstellen'
  | 'transformieren_aktualisieren'
  | 'pruefen_freigeben'
  | 'weiterleiten_ablegen'
export type CanvasObjectType = 'quelle' | 'datenobjekt'
export type EdgeNodeType = 'activity' | 'canvas_object'
export type FieldType = 'text' | 'integer' | 'decimal' | 'date' | 'boolean'
export type OrganizationRole = 'owner' | 'admin' | 'member'
export type UiThemeMode = 'system' | 'light' | 'dark'
export type CanvasOpenBehavior = 'fit_view' | 'remember_last_view'

export interface ViewportCenter {
  x: number
  y: number
  zoom: number
}

export interface CatalogRole {
  id: string
  organization_id: string
  label: string
  acronym: string
  description: string | null
  sort_order: number
  created_at: string
  created_by: string | null
}

export interface TransportModeOption {
  id: string
  organization_id: string
  key: string
  label: string
  description: string | null
  sort_order: number
  is_active: boolean
  is_default: boolean
  created_at: string
  created_by: string | null
}

export interface Organization {
  id: string
  name: string
  created_by: string | null
  created_at: string
  membership_role: OrganizationRole
}

export interface UiPreferences {
  default_grouping_mode: CanvasGroupingMode
  canvas_open_behavior: CanvasOpenBehavior
  snap_to_grid: boolean
  enable_table_view: boolean
  enable_swimlane_view: boolean
  enable_node_collision_avoidance: boolean
  enable_alignment_guides: boolean
  enable_magnetic_connection_targets: boolean
  theme_mode: UiThemeMode
}

export type WorkspaceViewMemory = Record<string, ViewportCenter>

export interface OrganizationMember {
  user_id: string
  email: string | null
  role: OrganizationRole
  display_name?: string | null
  domain_role_label?: string | null
  created_at: string
}

export interface OrganizationUserOption extends OrganizationMember {
  display_name: string
}

export interface OrganizationInvitation {
  id: string
  email: string
  role: OrganizationRole
  token: string
  created_at: string
  organization: {
    id: string
    name: string
    created_by: string | null
    created_at: string
  }
}

export interface Workspace {
  id: string
  organization_id: string
  name: string
  created_by: string
  created_at: string
  parent_workspace_id: string | null
  parent_activity_id: string | null
  workflow_scope: 'standalone' | 'detail'
  purpose: string | null
  expected_inputs: string[]
  expected_outputs: string[]
}

export interface CanvasGroup {
  id: string
  workspace_id: string
  parent_activity_id: string | null
  label: string
  position_x: number
  position_y: number
  width: number
  height: number
  locked?: boolean
  collapsed?: boolean
  z_index?: number
  created_at: string
  created_by: string | null
}

interface CanvasObjectBase {
  id: string
  workspace_id: string
  parent_activity_id: string | null
  group_id?: string | null
  name: string
  is_locked?: boolean
  z_index?: number
  updated_at: string
  fields?: ObjectField[]
}

export interface SourceCanvasObject extends CanvasObjectBase {
  object_type: 'quelle'
  position_x: number
  position_y: number
  edge_id: null
  edge_sort_order: null
}

export interface EdgeDataObject extends CanvasObjectBase {
  object_type: 'datenobjekt'
  edge_id: string
  edge_sort_order: number
}

export interface Activity {
  id: string
  workspace_id: string
  parent_id: string | null
  group_id?: string | null
  owner_id: string
  assignee_label?: string | null
  role_id?: string | null
  node_type: NodeType
  label: string
  trigger_type: TriggerType | null
  position_x: number
  position_y: number
  status: ActivityStatus
  status_icon: StatusIcon
  activity_type: ActivityType | null
  description: string | null
  notes: string | null
  duration_minutes: number | null
  linked_workflow_id: string | null
  linked_workflow_mode: 'detail' | 'reference' | null
  linked_workflow_purpose: string | null
  linked_workflow_inputs: string[]
  linked_workflow_outputs: string[]
  is_locked?: boolean
  updated_at: string
}

export interface ObjectField {
  id?: string
  object_id: string
  name: string
  field_type: FieldType
  required: boolean
  sort_order: number
}

export type CanvasObject = SourceCanvasObject | EdgeDataObject

export interface CanvasEdge {
  id: string
  workspace_id: string
  parent_activity_id: string | null
  from_node_type: EdgeNodeType
  from_node_id: string
  from_handle_id: string | null
  to_node_type: EdgeNodeType
  to_node_id: string
  to_handle_id: string | null
  label: string | null
  transport_mode_id: string | null
  transport_mode: TransportModeOption | null
  notes: string | null
}

export interface ITTool {
  id: string
  organization_id: string
  name: string
  description: string | null
  created_at: string
  created_by: string | null
}

export interface ActivityComment {
  id: string
  activity_id: string
  organization_id: string
  author_user_id: string | null
  body: string
  created_at: string
  updated_at: string
}

export type CanvasGroupingMode = 'free' | 'role_lanes'
export type WorkflowViewMode = 'canvas' | 'sipoc_table'

export interface WorkflowSipocItem {
  id: string
  edgeId: string
  objectName: string
  transportModeId: string | null
  transportModeLabel: string
}

export interface WorkflowSipocRoleRef {
  activityId: string
  activityLabel: string
  roleId: string | null
  roleLabel: string
}

export interface WorkflowSipocRow {
  activityId: string
  processLabel: string
  processRoleId: string | null
  processRoleLabel: string
  supplierRoles: WorkflowSipocRoleRef[]
  consumerRoles: WorkflowSipocRoleRef[]
  inputs: WorkflowSipocItem[]
  outputs: WorkflowSipocItem[]
}

export interface WorkflowTemplate {
  id: string
  organization_id: string
  name: string
  description: string | null
  category: string | null
  source_workspace_id: string | null
  is_system: boolean
  snapshot: Record<string, unknown>
  created_by: string | null
  created_at: string
}

export interface ActivityCheckSource {
  id: string
  activity_id: string
  canvas_object_id: string
  notes: string | null
}

export interface UpsertActivityInput {
  id?: string
  parent_id: string | null
  group_id?: string | null
  node_type: NodeType
  label: string
  trigger_type?: TriggerType | null
  position_x: number
  position_y: number
  status?: ActivityStatus
  status_icon?: StatusIcon
  activity_type?: ActivityType | null
  description?: string | null
  notes?: string | null
  assignee_label?: string | null
  role_id?: string | null
  duration_minutes?: number | null
  linked_workflow_id?: string | null
  linked_workflow_mode?: 'detail' | 'reference' | null
  linked_workflow_purpose?: string | null
  linked_workflow_inputs?: string[]
  linked_workflow_outputs?: string[]
  is_locked?: boolean
}

export interface CreateWorkspaceInput {
  organization_id: string
  name: string
  parent_workspace_id?: string | null
  parent_activity_id?: string | null
  workflow_scope?: 'standalone' | 'detail'
  purpose?: string | null
  expected_inputs?: string[]
  expected_outputs?: string[]
}

export interface CreateWorkspaceFromTemplateInput {
  organization_id: string
  template_id: string
  name: string
}

export interface CreateSubprocessInput {
  name: string
  goal: string
  expected_inputs: string[]
  expected_outputs: string[]
  steps: string[]
}

export interface LinkSubprocessInput {
  linked_workflow_id: string
  linked_workflow_mode?: 'detail' | 'reference' | null
  linked_workflow_purpose?: string | null
  linked_workflow_inputs?: string[]
  linked_workflow_outputs?: string[]
}

export interface UpsertCanvasObjectInput {
  id?: string
  parent_activity_id: string | null
  group_id?: string | null
  object_type: CanvasObjectType
  name: string
  is_locked?: boolean
  z_index?: number
  edge_id?: string | null
  edge_sort_order?: number | null
  position_x?: number
  position_y?: number
  fields?: Array<{
    id?: string
    name: string
    field_type: FieldType
    required: boolean
    sort_order: number
  }>
}

export interface UpsertCanvasEdgeInput {
  id?: string
  parent_activity_id: string | null
  from_node_type: EdgeNodeType
  from_node_id: string
  from_handle_id?: string | null
  to_node_type: EdgeNodeType
  to_node_id: string
  to_handle_id?: string | null
  label?: string | null
  transport_mode_id?: string | null
  notes?: string | null
}

export interface ActivityNodeData {
  activity: Activity
  hasChildren: boolean
  roleLabel?: string
  roleAcronym?: string | null
  availableRoles?: CatalogRole[]
  assigneeLabel?: string | null
  groupingMode?: CanvasGroupingMode
  showHandles?: boolean
  isConnectionPreviewTarget?: boolean
  onOpenDetail: (id: string) => void
  onInlineRename?: (id: string, label: string) => Promise<void> | void
  onQuickChangeType?: (id: string, nextType: ActivityType) => Promise<void> | void
  onQuickChangeRole?: (id: string, roleId: string | null) => Promise<void> | void
  onCreateRole?: (input: { label: string; acronym?: string | null; description: string }) => Promise<CatalogRole | void> | CatalogRole | void
  onOpenSubprocess: (activityId: string) => void
  onCreateSubprocess?: (activityId: string) => void
  onLinkSubprocess?: (activityId: string) => void
  onUnlinkSubprocess?: (activityId: string) => void
  onDeleteLinkedSubprocess?: (activityId: string) => void
}

export interface CanvasObjectNodeData {
  canvasObject: SourceCanvasObject
  showHandles?: boolean
  isConnectionPreviewTarget?: boolean
  onOpenPopup: (id: string) => void
  onBringToFront?: (id: string) => void
  onSendToBack?: (id: string) => void
}

export interface CanvasGroupNodeData {
  canvasGroup: CanvasGroup
  memberCount?: number
  draftLabel?: string
  onRename?: (groupId: string, label: string) => Promise<void> | void
  onDraftLabelChange?: (groupId: string, label: string) => void
  onCancelRename?: (groupId: string) => void
  onToggleCollapsed?: (groupId: string) => void
  onToggleLock?: (groupId: string) => void
  onDelete?: (groupId: string) => void
  onBringToFront?: (groupId: string) => void
  onSendToBack?: (groupId: string) => void
}

export interface UpsertCanvasGroupInput {
  id?: string
  parent_activity_id: string | null
  label: string
  position_x: number
  position_y: number
  width: number
  height: number
  locked?: boolean
  collapsed?: boolean
  z_index?: number
}

export interface AggregateActivitiesToSubprocessInput {
  activity_ids: string[]
}

export type HierarchyFocusState =
  | 'collapsed'
  | 'expanding'
  | 'expanded'
  | 'maximizing'
  | 'maximized'
  | 'minimizing'
  | 'collapsing'

export interface HierarchyFocusRects {
  originRect: { x: number; y: number; width: number; height: number }
  previewRect: { x: number; y: number; width: number; height: number }
  maximizedRect: { x: number; y: number; width: number; height: number }
}

export interface HierarchyFocusPreviewLayout {
  mode: 'origin_zoom' | 'fit_view'
  zoom: number
  innerPadding: number
}

export interface HierarchyFocusSession {
  originActivityId: string
  originActivityLabel: string
  originWorkspaceId: string
  originWorkspaceName: string
  originCanvasCenter: { x: number; y: number; zoom: number }
  childWorkspaceId: string
  childWorkspaceName: string
  viewportSnapshot: { x: number; y: number; width: number; height: number; zoom: number }
  rects: HierarchyFocusRects
  previewLayout: HierarchyFocusPreviewLayout
}
