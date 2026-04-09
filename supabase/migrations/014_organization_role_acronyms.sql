alter table public.organization_roles
  add column if not exists acronym text;

update public.organization_roles
set acronym = (
  select coalesce(
    string_agg(
      case
        when token ~ '^[A-ZÄÖÜ0-9]{2,4}$' then upper(token)
        when upper(token) in ('BIM', 'CAD', 'ERP', 'PLM', 'SAP', 'IT') then upper(token)
        else upper(left(token, 1))
      end,
      ''
    ),
    'R'
  )
  from regexp_split_to_table(regexp_replace(label, '[/-]+', ' ', 'g'), '\s+') as token
  where btrim(token) <> ''
)
where acronym is null
   or btrim(acronym) = '';

alter table public.organization_roles
  alter column acronym set not null;
