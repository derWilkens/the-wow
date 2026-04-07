alter table workspaces
  add column if not exists parent_workspace_id uuid references workspaces(id) on delete cascade,
  add column if not exists parent_activity_id uuid references activities(id) on delete set null,
  add column if not exists workflow_scope text not null default 'standalone' check (workflow_scope in ('standalone', 'detail')),
  add column if not exists purpose text,
  add column if not exists expected_inputs text[] not null default '{}',
  add column if not exists expected_outputs text[] not null default '{}';

alter table activities
  add column if not exists linked_workflow_id uuid references workspaces(id) on delete set null,
  add column if not exists linked_workflow_mode text check (linked_workflow_mode in ('detail', 'reference')),
  add column if not exists linked_workflow_purpose text,
  add column if not exists linked_workflow_inputs text[] not null default '{}',
  add column if not exists linked_workflow_outputs text[] not null default '{}';

create index if not exists idx_workspaces_parent_workspace_id on workspaces(parent_workspace_id);
create index if not exists idx_workspaces_parent_activity_id on workspaces(parent_activity_id);
create index if not exists idx_workspaces_workflow_scope on workspaces(workflow_scope);
create index if not exists idx_activities_linked_workflow_id on activities(linked_workflow_id);

comment on table workspaces is 'Stores workflow records. In the product UI these are shown as Arbeitsablaeufe.';
comment on column workspaces.parent_workspace_id is 'References the parent workflow when this workflow is nested inside another workflow.';
comment on column workspaces.parent_activity_id is 'References the activity in the parent workflow that this detailed workflow explains.';
comment on column workspaces.workflow_scope is 'Distinguishes top-level workflows from detailed child workflows.';
comment on column workspaces.purpose is 'Business-facing purpose or intended result of the workflow.';
comment on column workspaces.expected_inputs is 'Inputs the surrounding context provides to this workflow.';
comment on column workspaces.expected_outputs is 'Outputs this workflow is expected to return to its surrounding context.';

comment on column activities.linked_workflow_id is 'Optional workflow linked from this activity, either newly detailed or re-used by reference.';
comment on column activities.linked_workflow_mode is 'detail = dedicated child workflow, reference = existing workflow re-used here.';
comment on column activities.linked_workflow_purpose is 'Why the linked workflow is used from this activity.';
comment on column activities.linked_workflow_inputs is 'Inputs the activity passes into the linked workflow.';
comment on column activities.linked_workflow_outputs is 'Outputs expected back from the linked workflow.';

create or replace view workflow_catalog as
select
  id,
  name,
  created_at,
  created_by,
  parent_workspace_id as parent_workflow_id,
  parent_activity_id,
  workflow_scope,
  purpose,
  expected_inputs,
  expected_outputs
from workspaces;
