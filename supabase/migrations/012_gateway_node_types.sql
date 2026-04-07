do $$
begin
  alter type node_type_enum add value if not exists 'gateway_decision';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type node_type_enum add value if not exists 'gateway_merge';
exception
  when duplicate_object then null;
end $$;

comment on type node_type_enum is 'Canvas node types including activities, events, and business-facing gateway nodes.';
