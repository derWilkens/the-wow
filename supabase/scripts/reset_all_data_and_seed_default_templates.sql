-- WARNING:
-- This script deletes all application data in the public schema and rebuilds
-- a clean baseline from auth.users.
--
-- It keeps auth.users untouched.
-- It recreates:
--   - organizations
--   - organization_members (owner membership for each user)
--   - transport_modes default catalog per organization
--   - workflow_templates default catalog per organization

begin;

truncate table
  public.activity_comments,
  public.activity_it_tools,
  public.activity_check_sources,
  public.object_fields,
  public.canvas_objects,
  public.canvas_edges,
  public.activity_roles,
  public.activities,
  public.workflow_templates,
  public.transport_modes,
  public.it_tools,
  public.organization_invitations,
  public.organization_members,
  public.workspaces,
  public.organizations
restart identity cascade;

insert into public.organizations (id, name, created_by, created_at)
select
  uuid_generate_v4(),
  coalesce(
    nullif(trim(split_part(coalesce(u.email, ''), '@', 1)), ''),
    'Organisation ' || substr(u.id::text, 1, 8)
  ) as name,
  u.id,
  now()
from auth.users u;

insert into public.organization_members (organization_id, user_id, role, created_at)
select
  o.id,
  o.created_by,
  'owner'::organization_role_enum,
  o.created_at
from public.organizations o
where o.created_by is not null;

insert into public.transport_modes (
  id,
  organization_id,
  key,
  label,
  description,
  sort_order,
  is_active,
  is_default,
  created_at,
  created_by
)
select
  uuid_generate_v4(),
  o.id,
  defaults.key,
  defaults.label,
  defaults.description,
  defaults.sort_order,
  true,
  defaults.is_default,
  now(),
  o.created_by
from public.organizations o
cross join (
  values
    ('direkt', 'Direkt', 'Direkte Uebergabe ohne Zwischenspeicherung.', 0, true),
    ('mail', 'Mail', 'Uebergabe oder Benachrichtigung per E-Mail.', 1, false),
    ('im_datenspeicher_bereitgestellt', 'Im Datenspeicher bereitgestellt', 'Ergebnis wird in einem Datenspeicher bereitgestellt.', 2, false),
    ('zyklisch_abgeholt', 'Zyklisch abgeholt', 'Nachgelagerte Aktivitaet holt die Daten periodisch ab.', 3, false)
) as defaults(key, label, description, sort_order, is_default);

insert into public.workflow_templates (
  id,
  organization_id,
  name,
  description,
  category,
  source_workspace_id,
  is_system,
  snapshot,
  created_by,
  created_at
)
select
  uuid_generate_v4(),
  o.id,
  templates.name,
  templates.description,
  templates.category,
  null,
  true,
  templates.snapshot,
  o.created_by,
  now()
from public.organizations o
cross join (
  values
    (
      'Freigabeprozess',
      'Ein typischer Ablauf mit Erstellung, Pruefung und Freigabe.',
      'Pruefung',
      jsonb_build_object(
        'rootWorkspace', jsonb_build_object(
          'name', 'Freigabeprozess',
          'purpose', 'Dokument oder Antrag erstellen, pruefen und freigeben.',
          'expected_inputs', jsonb_build_array('Antrag'),
          'expected_outputs', jsonb_build_array('Freigabe')
        ),
        'workspaces', jsonb_build_array(),
        'activities', jsonb_build_array(
          jsonb_build_object('tempId', 'start', 'workspaceTempId', 'root', 'parentTempId', null, 'linkedWorkflowTempId', null, 'node_type', 'start_event', 'label', 'Start', 'trigger_type', null, 'position_x', 60, 'position_y', 220, 'status', 'draft', 'status_icon', null, 'activity_type', null, 'description', null, 'notes', null, 'duration_minutes', null, 'linked_workflow_mode', null, 'linked_workflow_purpose', null, 'linked_workflow_inputs', jsonb_build_array(), 'linked_workflow_outputs', jsonb_build_array()),
          jsonb_build_object('tempId', 'create', 'workspaceTempId', 'root', 'parentTempId', null, 'linkedWorkflowTempId', null, 'node_type', 'activity', 'label', 'Antrag erstellen', 'trigger_type', null, 'position_x', 250, 'position_y', 190, 'status', 'draft', 'status_icon', null, 'activity_type', null, 'description', null, 'notes', null, 'duration_minutes', null, 'linked_workflow_mode', null, 'linked_workflow_purpose', null, 'linked_workflow_inputs', jsonb_build_array(), 'linked_workflow_outputs', jsonb_build_array()),
          jsonb_build_object('tempId', 'review', 'workspaceTempId', 'root', 'parentTempId', null, 'linkedWorkflowTempId', null, 'node_type', 'activity', 'label', 'Pruefen', 'trigger_type', null, 'position_x', 520, 'position_y', 190, 'status', 'draft', 'status_icon', null, 'activity_type', null, 'description', null, 'notes', null, 'duration_minutes', null, 'linked_workflow_mode', null, 'linked_workflow_purpose', null, 'linked_workflow_inputs', jsonb_build_array(), 'linked_workflow_outputs', jsonb_build_array()),
          jsonb_build_object('tempId', 'approve', 'workspaceTempId', 'root', 'parentTempId', null, 'linkedWorkflowTempId', null, 'node_type', 'activity', 'label', 'Freigeben', 'trigger_type', null, 'position_x', 790, 'position_y', 190, 'status', 'draft', 'status_icon', null, 'activity_type', null, 'description', null, 'notes', null, 'duration_minutes', null, 'linked_workflow_mode', null, 'linked_workflow_purpose', null, 'linked_workflow_inputs', jsonb_build_array(), 'linked_workflow_outputs', jsonb_build_array()),
          jsonb_build_object('tempId', 'end', 'workspaceTempId', 'root', 'parentTempId', null, 'linkedWorkflowTempId', null, 'node_type', 'end_event', 'label', 'Ende', 'trigger_type', null, 'position_x', 1040, 'position_y', 220, 'status', 'draft', 'status_icon', null, 'activity_type', null, 'description', null, 'notes', null, 'duration_minutes', null, 'linked_workflow_mode', null, 'linked_workflow_purpose', null, 'linked_workflow_inputs', jsonb_build_array(), 'linked_workflow_outputs', jsonb_build_array())
        ),
        'edges', jsonb_build_array(
          jsonb_build_object('tempId', 'e1', 'workspaceTempId', 'root', 'parentActivityTempId', null, 'from_node_type', 'activity', 'from_node_temp_id', 'start', 'from_handle_id', null, 'to_node_type', 'activity', 'to_node_temp_id', 'create', 'to_handle_id', null, 'label', null, 'transport_mode_id', null, 'notes', null),
          jsonb_build_object('tempId', 'e2', 'workspaceTempId', 'root', 'parentActivityTempId', null, 'from_node_type', 'activity', 'from_node_temp_id', 'create', 'from_handle_id', null, 'to_node_type', 'activity', 'to_node_temp_id', 'review', 'to_handle_id', null, 'label', null, 'transport_mode_id', null, 'notes', null),
          jsonb_build_object('tempId', 'e3', 'workspaceTempId', 'root', 'parentActivityTempId', null, 'from_node_type', 'activity', 'from_node_temp_id', 'review', 'from_handle_id', null, 'to_node_type', 'activity', 'to_node_temp_id', 'approve', 'to_handle_id', null, 'label', null, 'transport_mode_id', null, 'notes', null),
          jsonb_build_object('tempId', 'e4', 'workspaceTempId', 'root', 'parentActivityTempId', null, 'from_node_type', 'activity', 'from_node_temp_id', 'approve', 'from_handle_id', null, 'to_node_type', 'activity', 'to_node_temp_id', 'end', 'to_handle_id', null, 'label', null, 'transport_mode_id', null, 'notes', null)
        ),
        'canvasObjects', jsonb_build_array()
      )
    ),
    (
      'Rechnungseingang',
      'Vorbefuellter Ablauf fuer Eingang, Pruefung und Ablage einer Rechnung.',
      'Finanzen',
      jsonb_build_object(
        'rootWorkspace', jsonb_build_object(
          'name', 'Rechnungseingang',
          'purpose', 'Rechnung entgegennehmen, pruefen und ablegen.',
          'expected_inputs', jsonb_build_array('Rechnung'),
          'expected_outputs', jsonb_build_array('Gepruefte Rechnung')
        ),
        'workspaces', jsonb_build_array(),
        'activities', jsonb_build_array(
          jsonb_build_object('tempId', 'start', 'workspaceTempId', 'root', 'parentTempId', null, 'linkedWorkflowTempId', null, 'node_type', 'start_event', 'label', 'Start', 'trigger_type', null, 'position_x', 60, 'position_y', 240, 'status', 'draft', 'status_icon', null, 'activity_type', null, 'description', null, 'notes', null, 'duration_minutes', null, 'linked_workflow_mode', null, 'linked_workflow_purpose', null, 'linked_workflow_inputs', jsonb_build_array(), 'linked_workflow_outputs', jsonb_build_array()),
          jsonb_build_object('tempId', 'receive', 'workspaceTempId', 'root', 'parentTempId', null, 'linkedWorkflowTempId', null, 'node_type', 'activity', 'label', 'Rechnung erfassen', 'trigger_type', null, 'position_x', 240, 'position_y', 210, 'status', 'draft', 'status_icon', null, 'activity_type', null, 'description', null, 'notes', null, 'duration_minutes', null, 'linked_workflow_mode', null, 'linked_workflow_purpose', null, 'linked_workflow_inputs', jsonb_build_array(), 'linked_workflow_outputs', jsonb_build_array()),
          jsonb_build_object('tempId', 'check', 'workspaceTempId', 'root', 'parentTempId', null, 'linkedWorkflowTempId', null, 'node_type', 'activity', 'label', 'Rechnung pruefen', 'trigger_type', null, 'position_x', 500, 'position_y', 210, 'status', 'draft', 'status_icon', null, 'activity_type', null, 'description', null, 'notes', null, 'duration_minutes', null, 'linked_workflow_mode', null, 'linked_workflow_purpose', null, 'linked_workflow_inputs', jsonb_build_array(), 'linked_workflow_outputs', jsonb_build_array()),
          jsonb_build_object('tempId', 'store', 'workspaceTempId', 'root', 'parentTempId', null, 'linkedWorkflowTempId', null, 'node_type', 'activity', 'label', 'Im Datenspeicher ablegen', 'trigger_type', null, 'position_x', 760, 'position_y', 210, 'status', 'draft', 'status_icon', null, 'activity_type', null, 'description', null, 'notes', null, 'duration_minutes', null, 'linked_workflow_mode', null, 'linked_workflow_purpose', null, 'linked_workflow_inputs', jsonb_build_array(), 'linked_workflow_outputs', jsonb_build_array()),
          jsonb_build_object('tempId', 'end', 'workspaceTempId', 'root', 'parentTempId', null, 'linkedWorkflowTempId', null, 'node_type', 'end_event', 'label', 'Ende', 'trigger_type', null, 'position_x', 1000, 'position_y', 240, 'status', 'draft', 'status_icon', null, 'activity_type', null, 'description', null, 'notes', null, 'duration_minutes', null, 'linked_workflow_mode', null, 'linked_workflow_purpose', null, 'linked_workflow_inputs', jsonb_build_array(), 'linked_workflow_outputs', jsonb_build_array())
        ),
        'edges', jsonb_build_array(
          jsonb_build_object('tempId', 'e1', 'workspaceTempId', 'root', 'parentActivityTempId', null, 'from_node_type', 'activity', 'from_node_temp_id', 'start', 'from_handle_id', null, 'to_node_type', 'activity', 'to_node_temp_id', 'receive', 'to_handle_id', null, 'label', null, 'transport_mode_id', null, 'notes', null),
          jsonb_build_object('tempId', 'e2', 'workspaceTempId', 'root', 'parentActivityTempId', null, 'from_node_type', 'activity', 'from_node_temp_id', 'receive', 'from_handle_id', null, 'to_node_type', 'activity', 'to_node_temp_id', 'check', 'to_handle_id', null, 'label', null, 'transport_mode_id', null, 'notes', null),
          jsonb_build_object('tempId', 'e3', 'workspaceTempId', 'root', 'parentActivityTempId', null, 'from_node_type', 'activity', 'from_node_temp_id', 'check', 'from_handle_id', null, 'to_node_type', 'activity', 'to_node_temp_id', 'store', 'to_handle_id', null, 'label', null, 'transport_mode_id', null, 'notes', null),
          jsonb_build_object('tempId', 'e4', 'workspaceTempId', 'root', 'parentActivityTempId', null, 'from_node_type', 'activity', 'from_node_temp_id', 'store', 'from_handle_id', null, 'to_node_type', 'activity', 'to_node_temp_id', 'end', 'to_handle_id', null, 'label', null, 'transport_mode_id', null, 'notes', null)
        ),
        'canvasObjects', jsonb_build_array(
          jsonb_build_object('tempId', 'invoice', 'workspaceTempId', 'root', 'parentActivityTempId', null, 'object_type', 'datenobjekt', 'name', 'Rechnung', 'edgeTempId', 'e1', 'edge_sort_order', 0, 'position_x', null, 'position_y', null, 'fields', jsonb_build_array()),
          jsonb_build_object('tempId', 'checked-invoice', 'workspaceTempId', 'root', 'parentActivityTempId', null, 'object_type', 'datenobjekt', 'name', 'Gepruefte Rechnung', 'edgeTempId', 'e3', 'edge_sort_order', 0, 'position_x', null, 'position_y', null, 'fields', jsonb_build_array())
        )
      )
    )
) as templates(name, description, category, snapshot);

commit;
