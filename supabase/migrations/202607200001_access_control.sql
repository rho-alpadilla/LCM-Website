begin;

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create table public.staff_profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  display_name text not null check (char_length(display_name) between 1 and 120),
  phone text,
  job_title text,
  account_status text not null default 'invited'
    check (account_status in ('invited', 'active', 'suspended', 'disabled')),
  must_enroll_mfa boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null unique check (char_length(name) between 1 and 80),
  description text not null,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.permissions (
  code text primary key check (code ~ '^[a-z][a-z0-9_.]*$'),
  description text not null,
  sensitivity text not null default 'standard'
    check (sensitivity in ('standard', 'personal', 'prayer', 'financial', 'security'))
);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_code text not null references public.permissions (code) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_code)
);

create table public.staff_roles (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff_profiles (id) on delete restrict,
  role_id uuid not null references public.roles (id) on delete restrict,
  assigned_by uuid not null references public.staff_profiles (id) on delete restrict,
  assignment_reason text,
  assigned_at timestamptz not null default now(),
  revoked_by uuid references public.staff_profiles (id) on delete restrict,
  revoked_at timestamptz,
  revocation_reason text,
  constraint staff_roles_revocation_complete check (
    (revoked_at is null and revoked_by is null and revocation_reason is null)
    or
    (revoked_at is not null and revoked_by is not null and char_length(revocation_reason) > 0)
  )
);

create unique index staff_roles_one_active_assignment
  on public.staff_roles (staff_id, role_id)
  where revoked_at is null;

create index staff_roles_active_staff
  on public.staff_roles (staff_id)
  where revoked_at is null;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_staff_id uuid references public.staff_profiles (id) on delete restrict,
  actor_type text not null check (actor_type in ('staff', 'system', 'provider')),
  action text not null check (action ~ '^[a-z][a-z0-9_.]*$'),
  resource_type text not null,
  resource_id uuid,
  sensitivity text not null default 'standard'
    check (sensitivity in ('standard', 'personal', 'prayer', 'financial', 'security')),
  metadata jsonb not null default '{}'::jsonb,
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_staff_id, created_at desc);
create index audit_logs_resource_idx
  on public.audit_logs (resource_type, resource_id, created_at desc);
create index audit_logs_sensitivity_idx
  on public.audit_logs (sensitivity, created_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger staff_profiles_set_updated_at
before update on public.staff_profiles
for each row execute function private.set_updated_at();

create or replace function private.current_staff_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select staff.id
  from public.staff_profiles as staff
  where staff.id = (select auth.uid())
    and staff.account_status = 'active'
$$;

create or replace function private.has_mfa()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
$$;

create or replace function private.has_permission(requested_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_profiles as staff
    join public.staff_roles as assignment
      on assignment.staff_id = staff.id
      and assignment.revoked_at is null
    join public.role_permissions as granted
      on granted.role_id = assignment.role_id
    where staff.id = (select auth.uid())
      and staff.account_status = 'active'
      and granted.permission_code = requested_permission
  )
$$;

create or replace function private.enforce_elevated_assignment_reason()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_role_code text;
begin
  select role.code
  into assigned_role_code
  from public.roles as role
  where role.id = new.role_id;

  if assigned_role_code = 'core_leader'
     and coalesce(char_length(trim(new.assignment_reason)), 0) = 0 then
    raise exception 'Core Leader assignment requires a reason';
  end if;

  return new;
end;
$$;

create trigger staff_roles_require_elevated_reason
before insert or update of role_id, assignment_reason on public.staff_roles
for each row execute function private.enforce_elevated_assignment_reason();

insert into public.roles (code, name, description) values
  ('system_admin', 'System Administrator', 'Manages accounts, roles, security, integrations and system activity.'),
  ('senior_pastor', 'Senior Pastor', 'Senior church leadership access, including approved sensitive decisions.'),
  ('associate_pastor', 'Associate Pastor', 'Pastoral and operational leadership access.'),
  ('leader', 'Leader', 'Associate-Pastor-equivalent day-to-day operational access.'),
  ('core_leader', 'Core Leader', 'System-Administrator-assigned Senior-Pastor-equivalent access for selected trusted Leaders.'),
  ('multimedia_head', 'Multimedia Head', 'Multimedia scope management, approval, publishing and self-approval.'),
  ('multimedia_team', 'Multimedia Team', 'Creates and submits multimedia-scope content.'),
  ('bulletin_head', 'Bulletin Head', 'Bulletin scope management, approval, publishing and self-approval.'),
  ('bulletin_team', 'Bulletin Team', 'Creates and submits bulletin-scope content.'),
  ('treasurer', 'Treasurer', 'Manages detailed giving records, reconciliation, receipts and reports.'),
  ('prayer_warrior', 'Prayer Warrior', 'Works with permitted prayer requests and pastoral escalation.');

insert into public.permissions (code, description, sensitivity) values
  ('admin.access', 'Access the protected administration application.', 'standard'),
  ('staff.read', 'Read the staff directory.', 'personal'),
  ('staff.invite', 'Invite an individual staff account.', 'security'),
  ('staff.suspend', 'Suspend or disable a staff account.', 'security'),
  ('staff.roles.manage', 'Assign and revoke staff roles.', 'security'),
  ('roles.permissions.manage', 'Manage role permission mappings.', 'security'),
  ('settings.read', 'Read administrative settings.', 'security'),
  ('settings.manage', 'Change administrative settings.', 'security'),
  ('audit.activity.read', 'Read permitted administrative activity history.', 'security'),
  ('audit.security.read', 'Read security audit history.', 'security'),
  ('audit.prayer.read', 'Read prayer-domain audit history without prayer text.', 'prayer'),
  ('audit.finance.read', 'Read finance-domain audit history.', 'financial'),
  ('content.pages.manage', 'Manage public pages.', 'standard'),
  ('content.ministries.manage', 'Manage ministry content.', 'standard'),
  ('content.sermons.manage', 'Manage sermons.', 'standard'),
  ('content.series.manage', 'Manage sermon series.', 'standard'),
  ('content.speakers.manage', 'Manage sermon speakers.', 'standard'),
  ('content.schedule.manage', 'Manage schedule items.', 'standard'),
  ('content.announcements.manage', 'Manage announcements.', 'standard'),
  ('content.bulletins.manage', 'Manage bulletins.', 'standard'),
  ('content.media.manage', 'Manage approved media assets.', 'standard'),
  ('content.submit', 'Submit content for approval.', 'standard'),
  ('content.approve', 'Approve content inside an allowed content scope.', 'standard'),
  ('content.publish', 'Publish approved content inside an allowed content scope.', 'standard'),
  ('content.archive', 'Archive content inside an allowed content scope.', 'standard'),
  ('content.self_approve', 'Approve the account holder''s own work inside an allowed Head scope.', 'security'),
  ('content.emergency_publish', 'Publish without the ordinary review path.', 'security'),
  ('contact.read', 'Read contact submissions.', 'personal'),
  ('contact.respond', 'Respond to contact submissions.', 'personal'),
  ('contact.assign', 'Assign contact submissions.', 'personal'),
  ('contact.export', 'Export contact submissions.', 'personal'),
  ('ministry_interest.read', 'Read ministry-interest submissions.', 'personal'),
  ('ministry_interest.respond', 'Respond to ministry-interest submissions.', 'personal'),
  ('ministry_interest.assign', 'Assign ministry-interest submissions.', 'personal'),
  ('ministry_interest.export', 'Export ministry-interest submissions.', 'personal'),
  ('prayer.read_team', 'Read prayer-team requests.', 'prayer'),
  ('prayer.read_pastoral', 'Read pastoral-only prayer requests.', 'prayer'),
  ('prayer.update_team', 'Update prayer-team requests.', 'prayer'),
  ('prayer.update_pastoral', 'Update pastoral-only prayer requests.', 'prayer'),
  ('prayer.assign', 'Assign prayer requests.', 'prayer'),
  ('prayer.contact.read', 'Read consented prayer contact information when allowed.', 'prayer'),
  ('prayer.escalate', 'Escalate a prayer request to pastoral leadership.', 'prayer'),
  ('prayer.close', 'Close an allowed prayer request.', 'prayer'),
  ('prayer.export', 'Export prayer requests.', 'prayer'),
  ('giving.summary.read', 'Read aggregate giving summaries.', 'financial'),
  ('giving.details.read', 'Read transaction-level giving records.', 'financial'),
  ('giving.contributors.read', 'Read contributor identity.', 'financial'),
  ('giving.online.reconcile', 'Reconcile online giving.', 'financial'),
  ('giving.offline.create', 'Create offline giving entries.', 'financial'),
  ('giving.offline.verify', 'Verify another staff member''s offline entry.', 'financial'),
  ('giving.adjustment.request', 'Request a contribution adjustment.', 'financial'),
  ('giving.adjustment.approve', 'Approve another staff member''s adjustment.', 'financial'),
  ('giving.refund.request', 'Request a refund.', 'financial'),
  ('giving.refund.approve', 'Approve another staff member''s refund.', 'financial'),
  ('giving.receipt.manage', 'Manage receipt requests.', 'financial'),
  ('giving.categories.manage', 'Manage giving categories.', 'financial'),
  ('giving.export', 'Export permitted giving records.', 'financial'),
  ('reports.content.read', 'Read permitted content reports.', 'standard'),
  ('reports.engagement.read', 'Read engagement reports.', 'personal'),
  ('reports.system.read', 'Read system health and usage reports.', 'security'),
  ('integrations.status.read', 'Read masked integration status.', 'security'),
  ('integrations.manage', 'Manage integration configuration.', 'security'),
  ('backups.status.read', 'Read backup status.', 'security'),
  ('data.retention.manage', 'Manage approved retention operations.', 'security');

with permission_grants(role_code, permission_code) as (
  values
    ('system_admin', 'admin.access'),
    ('system_admin', 'staff.read'),
    ('system_admin', 'staff.invite'),
    ('system_admin', 'staff.suspend'),
    ('system_admin', 'staff.roles.manage'),
    ('system_admin', 'roles.permissions.manage'),
    ('system_admin', 'settings.read'),
    ('system_admin', 'settings.manage'),
    ('system_admin', 'audit.activity.read'),
    ('system_admin', 'audit.security.read'),
    ('system_admin', 'reports.system.read'),
    ('system_admin', 'integrations.status.read'),
    ('system_admin', 'integrations.manage'),
    ('system_admin', 'backups.status.read'),

    ('senior_pastor', 'admin.access'),
    ('senior_pastor', 'staff.read'),
    ('senior_pastor', 'settings.read'),
    ('senior_pastor', 'audit.activity.read'),
    ('senior_pastor', 'audit.prayer.read'),
    ('senior_pastor', 'audit.finance.read'),
    ('senior_pastor', 'content.pages.manage'),
    ('senior_pastor', 'content.ministries.manage'),
    ('senior_pastor', 'content.sermons.manage'),
    ('senior_pastor', 'content.series.manage'),
    ('senior_pastor', 'content.speakers.manage'),
    ('senior_pastor', 'content.schedule.manage'),
    ('senior_pastor', 'content.announcements.manage'),
    ('senior_pastor', 'content.bulletins.manage'),
    ('senior_pastor', 'content.media.manage'),
    ('senior_pastor', 'content.submit'),
    ('senior_pastor', 'content.approve'),
    ('senior_pastor', 'content.publish'),
    ('senior_pastor', 'content.archive'),
    ('senior_pastor', 'contact.read'),
    ('senior_pastor', 'contact.respond'),
    ('senior_pastor', 'contact.assign'),
    ('senior_pastor', 'ministry_interest.read'),
    ('senior_pastor', 'ministry_interest.respond'),
    ('senior_pastor', 'ministry_interest.assign'),
    ('senior_pastor', 'prayer.read_team'),
    ('senior_pastor', 'prayer.read_pastoral'),
    ('senior_pastor', 'prayer.update_team'),
    ('senior_pastor', 'prayer.update_pastoral'),
    ('senior_pastor', 'prayer.assign'),
    ('senior_pastor', 'prayer.contact.read'),
    ('senior_pastor', 'prayer.escalate'),
    ('senior_pastor', 'prayer.close'),
    ('senior_pastor', 'giving.summary.read'),
    ('senior_pastor', 'giving.adjustment.approve'),
    ('senior_pastor', 'giving.refund.approve'),
    ('senior_pastor', 'reports.content.read'),
    ('senior_pastor', 'reports.engagement.read'),
    ('senior_pastor', 'reports.system.read'),
    ('senior_pastor', 'integrations.status.read'),
    ('senior_pastor', 'backups.status.read'),

    ('associate_pastor', 'admin.access'),
    ('associate_pastor', 'staff.read'),
    ('associate_pastor', 'settings.read'),
    ('associate_pastor', 'audit.activity.read'),
    ('associate_pastor', 'audit.prayer.read'),
    ('associate_pastor', 'content.pages.manage'),
    ('associate_pastor', 'content.ministries.manage'),
    ('associate_pastor', 'content.sermons.manage'),
    ('associate_pastor', 'content.series.manage'),
    ('associate_pastor', 'content.speakers.manage'),
    ('associate_pastor', 'content.schedule.manage'),
    ('associate_pastor', 'content.announcements.manage'),
    ('associate_pastor', 'content.bulletins.manage'),
    ('associate_pastor', 'content.media.manage'),
    ('associate_pastor', 'content.submit'),
    ('associate_pastor', 'content.approve'),
    ('associate_pastor', 'content.publish'),
    ('associate_pastor', 'content.archive'),
    ('associate_pastor', 'contact.read'),
    ('associate_pastor', 'contact.respond'),
    ('associate_pastor', 'contact.assign'),
    ('associate_pastor', 'ministry_interest.read'),
    ('associate_pastor', 'ministry_interest.respond'),
    ('associate_pastor', 'ministry_interest.assign'),
    ('associate_pastor', 'prayer.read_team'),
    ('associate_pastor', 'prayer.read_pastoral'),
    ('associate_pastor', 'prayer.update_team'),
    ('associate_pastor', 'prayer.update_pastoral'),
    ('associate_pastor', 'prayer.assign'),
    ('associate_pastor', 'prayer.contact.read'),
    ('associate_pastor', 'prayer.escalate'),
    ('associate_pastor', 'prayer.close'),
    ('associate_pastor', 'giving.summary.read'),
    ('associate_pastor', 'reports.content.read'),
    ('associate_pastor', 'reports.engagement.read'),
    ('associate_pastor', 'reports.system.read'),

    ('multimedia_head', 'admin.access'),
    ('multimedia_head', 'content.sermons.manage'),
    ('multimedia_head', 'content.series.manage'),
    ('multimedia_head', 'content.speakers.manage'),
    ('multimedia_head', 'content.schedule.manage'),
    ('multimedia_head', 'content.announcements.manage'),
    ('multimedia_head', 'content.media.manage'),
    ('multimedia_head', 'content.submit'),
    ('multimedia_head', 'content.approve'),
    ('multimedia_head', 'content.publish'),
    ('multimedia_head', 'content.archive'),
    ('multimedia_head', 'content.self_approve'),
    ('multimedia_head', 'reports.content.read'),

    ('multimedia_team', 'admin.access'),
    ('multimedia_team', 'content.sermons.manage'),
    ('multimedia_team', 'content.series.manage'),
    ('multimedia_team', 'content.speakers.manage'),
    ('multimedia_team', 'content.schedule.manage'),
    ('multimedia_team', 'content.announcements.manage'),
    ('multimedia_team', 'content.media.manage'),
    ('multimedia_team', 'content.submit'),
    ('multimedia_team', 'reports.content.read'),

    ('bulletin_head', 'admin.access'),
    ('bulletin_head', 'content.schedule.manage'),
    ('bulletin_head', 'content.announcements.manage'),
    ('bulletin_head', 'content.bulletins.manage'),
    ('bulletin_head', 'content.media.manage'),
    ('bulletin_head', 'content.submit'),
    ('bulletin_head', 'content.approve'),
    ('bulletin_head', 'content.publish'),
    ('bulletin_head', 'content.archive'),
    ('bulletin_head', 'content.self_approve'),
    ('bulletin_head', 'reports.content.read'),

    ('bulletin_team', 'admin.access'),
    ('bulletin_team', 'content.schedule.manage'),
    ('bulletin_team', 'content.announcements.manage'),
    ('bulletin_team', 'content.bulletins.manage'),
    ('bulletin_team', 'content.media.manage'),
    ('bulletin_team', 'content.submit'),
    ('bulletin_team', 'reports.content.read'),

    ('treasurer', 'admin.access'),
    ('treasurer', 'audit.finance.read'),
    ('treasurer', 'giving.summary.read'),
    ('treasurer', 'giving.details.read'),
    ('treasurer', 'giving.contributors.read'),
    ('treasurer', 'giving.online.reconcile'),
    ('treasurer', 'giving.offline.create'),
    ('treasurer', 'giving.offline.verify'),
    ('treasurer', 'giving.adjustment.request'),
    ('treasurer', 'giving.refund.request'),
    ('treasurer', 'giving.receipt.manage'),
    ('treasurer', 'giving.export'),

    ('prayer_warrior', 'admin.access'),
    ('prayer_warrior', 'prayer.read_team'),
    ('prayer_warrior', 'prayer.update_team'),
    ('prayer_warrior', 'prayer.contact.read'),
    ('prayer_warrior', 'prayer.escalate')
)
insert into public.role_permissions (role_id, permission_code)
select role.id, grant_row.permission_code
from permission_grants as grant_row
join public.roles as role on role.code = grant_row.role_code
join public.permissions as permission on permission.code = grant_row.permission_code;

insert into public.role_permissions (role_id, permission_code)
select leader_role.id, granted.permission_code
from public.roles as leader_role
join public.roles as associate_role on associate_role.code = 'associate_pastor'
join public.role_permissions as granted on granted.role_id = associate_role.id
where leader_role.code = 'leader';

insert into public.role_permissions (role_id, permission_code)
select core_role.id, granted.permission_code
from public.roles as core_role
join public.roles as senior_role on senior_role.code = 'senior_pastor'
join public.role_permissions as granted on granted.role_id = senior_role.id
where core_role.code = 'core_leader';

alter table public.staff_profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.staff_roles enable row level security;
alter table public.audit_logs enable row level security;

create policy staff_profiles_read_own_or_directory
on public.staff_profiles
for select
to authenticated
using (
  id = (select private.current_staff_id())
  or (select private.has_permission('staff.read'))
);

create policy roles_read_by_active_staff
on public.roles
for select
to authenticated
using ((select private.current_staff_id()) is not null);

create policy permissions_read_by_active_staff
on public.permissions
for select
to authenticated
using ((select private.current_staff_id()) is not null);

create policy role_permissions_read_by_active_staff
on public.role_permissions
for select
to authenticated
using ((select private.current_staff_id()) is not null);

create policy staff_roles_read_own_or_directory
on public.staff_roles
for select
to authenticated
using (
  staff_id = (select private.current_staff_id())
  or (select private.has_permission('staff.read'))
);

create policy audit_logs_read_by_sensitivity
on public.audit_logs
for select
to authenticated
using (
  case sensitivity
    when 'security' then (select private.has_permission('audit.security.read'))
    when 'prayer' then (select private.has_permission('audit.prayer.read'))
    when 'financial' then (select private.has_permission('audit.finance.read'))
    else (select private.has_permission('audit.activity.read'))
  end
);

grant select on public.staff_profiles to authenticated;
grant select on public.roles to authenticated;
grant select on public.permissions to authenticated;
grant select on public.role_permissions to authenticated;
grant select on public.staff_roles to authenticated;
grant select on public.audit_logs to authenticated;

grant usage on schema private to authenticated;
grant execute on function private.current_staff_id() to authenticated;
grant execute on function private.has_mfa() to authenticated;
grant execute on function private.has_permission(text) to authenticated;

revoke all on function private.enforce_elevated_assignment_reason() from public;
revoke all on function private.set_updated_at() from public;

commit;
