begin;

create or replace function private.require_staff_action(requested_permission text)
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  actor_id uuid;
begin
  actor_id := private.current_staff_id();

  if actor_id is null then
    raise exception 'An active staff account is required';
  end if;

  if not private.has_mfa() then
    raise exception 'Multi-factor authentication is required';
  end if;

  if not private.has_permission(requested_permission) then
    raise exception 'The required permission is missing';
  end if;

  return actor_id;
end;
$$;

create or replace function private.active_system_administrator_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(distinct assignment.staff_id)::integer
  from public.staff_roles as assignment
  join public.staff_profiles as staff on staff.id = assignment.staff_id
  join public.roles as role on role.id = assignment.role_id
  where role.code = 'system_admin'
    and assignment.revoked_at is null
    and staff.account_status = 'active'
$$;

create or replace function private.is_active_system_administrator(requested_staff_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_roles as assignment
    join public.staff_profiles as staff on staff.id = assignment.staff_id
    join public.roles as role on role.id = assignment.role_id
    where assignment.staff_id = requested_staff_id
      and role.code = 'system_admin'
      and assignment.revoked_at is null
      and staff.account_status = 'active'
  )
$$;

create or replace function public.get_my_staff_context()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', staff.id,
    'display_name', staff.display_name,
    'account_status', staff.account_status,
    'must_enroll_mfa', staff.must_enroll_mfa,
    'roles', coalesce((
      select jsonb_agg(role.code order by role.code)
      from public.staff_roles as assignment
      join public.roles as role on role.id = assignment.role_id
      where assignment.staff_id = staff.id
        and assignment.revoked_at is null
    ), '[]'::jsonb),
    'permissions', coalesce((
      select jsonb_agg(distinct granted.permission_code order by granted.permission_code)
      from public.staff_roles as assignment
      join public.role_permissions as granted on granted.role_id = assignment.role_id
      where assignment.staff_id = staff.id
        and assignment.revoked_at is null
    ), '[]'::jsonb)
  )
  from public.staff_profiles as staff
  where staff.id = (select auth.uid())
$$;

create or replace function public.bootstrap_first_system_administrator(
  requested_display_name text,
  requested_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  system_role_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('bootstrap_first_system_administrator'));
  actor_id := (select auth.uid());

  if actor_id is null then
    raise exception 'Authentication is required';
  end if;

  if not private.has_mfa() then
    raise exception 'Multi-factor authentication is required';
  end if;

  if exists (select 1 from public.staff_profiles) then
    raise exception 'The first administrator has already been created';
  end if;

  if coalesce(char_length(trim(requested_display_name)), 0) not between 2 and 120 then
    raise exception 'Display name must contain between 2 and 120 characters';
  end if;

  if coalesce(char_length(trim(requested_reason)), 0) < 10 then
    raise exception 'A bootstrap reason of at least 10 characters is required';
  end if;

  select id into system_role_id from public.roles where code = 'system_admin';

  insert into public.staff_profiles (
    id,
    display_name,
    account_status,
    must_enroll_mfa
  ) values (
    actor_id,
    trim(requested_display_name),
    'active',
    false
  );

  insert into public.staff_roles (
    staff_id,
    role_id,
    assigned_by,
    assignment_reason
  ) values (
    actor_id,
    system_role_id,
    actor_id,
    trim(requested_reason)
  );

  insert into public.audit_logs (
    actor_staff_id,
    actor_type,
    action,
    resource_type,
    resource_id,
    sensitivity,
    metadata
  ) values (
    actor_id,
    'staff',
    'staff.bootstrap_completed',
    'staff_profile',
    actor_id,
    'security',
    jsonb_build_object('role', 'system_admin', 'reason', trim(requested_reason))
  );
end;
$$;

create or replace function public.register_invited_staff(
  requested_staff_id uuid,
  requested_display_name text,
  requested_phone text,
  requested_job_title text,
  requested_role_code text,
  requested_assigned_by uuid,
  requested_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role_id uuid;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'This operation is restricted to the trusted server';
  end if;

  if not exists (
    select 1
    from public.staff_profiles as actor
    where actor.id = requested_assigned_by
      and actor.account_status = 'active'
  ) then
    raise exception 'The inviting staff account is not active';
  end if;

  if not exists (
    select 1
    from public.staff_roles as assignment
    join public.role_permissions as granted on granted.role_id = assignment.role_id
    where assignment.staff_id = requested_assigned_by
      and assignment.revoked_at is null
      and granted.permission_code = 'staff.invite'
  ) or not exists (
    select 1
    from public.staff_roles as assignment
    join public.role_permissions as granted on granted.role_id = assignment.role_id
    where assignment.staff_id = requested_assigned_by
      and assignment.revoked_at is null
      and granted.permission_code = 'staff.roles.manage'
  ) then
    raise exception 'The inviting account lacks staff management permissions';
  end if;

  if coalesce(char_length(trim(requested_display_name)), 0) not between 2 and 120 then
    raise exception 'Display name must contain between 2 and 120 characters';
  end if;

  if requested_role_code = 'core_leader' then
    raise exception 'Core Leader access is assigned only after the Leader role is active';
  end if;

  if requested_role_code = 'system_admin'
     and coalesce(char_length(trim(requested_reason)), 0) < 10 then
    raise exception 'Inviting a System Administrator requires a reason';
  end if;

  select id into requested_role_id
  from public.roles
  where code = requested_role_code;

  if requested_role_id is null then
    raise exception 'Unknown role';
  end if;

  insert into public.staff_profiles (
    id,
    display_name,
    phone,
    job_title,
    account_status,
    must_enroll_mfa
  ) values (
    requested_staff_id,
    trim(requested_display_name),
    nullif(trim(requested_phone), ''),
    nullif(trim(requested_job_title), ''),
    'invited',
    true
  );

  insert into public.staff_roles (
    staff_id,
    role_id,
    assigned_by,
    assignment_reason
  ) values (
    requested_staff_id,
    requested_role_id,
    requested_assigned_by,
    nullif(trim(requested_reason), '')
  );

  insert into public.audit_logs (
    actor_staff_id,
    actor_type,
    action,
    resource_type,
    resource_id,
    sensitivity,
    metadata
  ) values (
    requested_assigned_by,
    'staff',
    'staff.invited',
    'staff_profile',
    requested_staff_id,
    'security',
    jsonb_build_object('role', requested_role_code)
  );
end;
$$;

create or replace function public.activate_invited_staff_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
begin
  actor_id := (select auth.uid());

  if actor_id is null then
    raise exception 'Authentication is required';
  end if;

  if not private.has_mfa() then
    raise exception 'Multi-factor authentication is required';
  end if;

  update public.staff_profiles
  set account_status = 'active',
      must_enroll_mfa = false,
      last_seen_at = now()
  where id = actor_id
    and account_status = 'invited';

  if not found then
    raise exception 'No invited staff account is available to activate';
  end if;

  insert into public.audit_logs (
    actor_staff_id,
    actor_type,
    action,
    resource_type,
    resource_id,
    sensitivity
  ) values (
    actor_id,
    'staff',
    'staff.invitation_accepted',
    'staff_profile',
    actor_id,
    'security'
  );
end;
$$;

create or replace function public.assign_staff_role(
  requested_staff_id uuid,
  requested_role_code text,
  requested_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  requested_role_id uuid;
begin
  actor_id := private.require_staff_action('staff.roles.manage');

  select id into requested_role_id from public.roles where code = requested_role_code;
  if requested_role_id is null then raise exception 'Unknown role'; end if;

  if not exists (
    select 1 from public.staff_profiles
    where id = requested_staff_id and account_status in ('invited', 'active')
  ) then
    raise exception 'The target staff account is not assignable';
  end if;

  if requested_role_code in ('system_admin', 'core_leader')
     and coalesce(char_length(trim(requested_reason)), 0) < 10 then
    raise exception 'Elevated role assignments require a reason';
  end if;

  if requested_role_code = 'core_leader' and not exists (
    select 1
    from public.staff_roles as assignment
    join public.roles as role on role.id = assignment.role_id
    where assignment.staff_id = requested_staff_id
      and role.code = 'leader'
      and assignment.revoked_at is null
  ) then
    raise exception 'Core Leader access can only be assigned to an active Leader';
  end if;

  insert into public.staff_roles (
    staff_id,
    role_id,
    assigned_by,
    assignment_reason
  ) values (
    requested_staff_id,
    requested_role_id,
    actor_id,
    nullif(trim(requested_reason), '')
  );

  insert into public.audit_logs (
    actor_staff_id,
    actor_type,
    action,
    resource_type,
    resource_id,
    sensitivity,
    metadata
  ) values (
    actor_id,
    'staff',
    'staff.role_assigned',
    'staff_profile',
    requested_staff_id,
    'security',
    jsonb_build_object('role', requested_role_code, 'reason', nullif(trim(requested_reason), ''))
  );
end;
$$;

create or replace function public.revoke_staff_role(
  requested_staff_id uuid,
  requested_role_code text,
  requested_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  target_assignment_id uuid;
begin
  actor_id := private.require_staff_action('staff.roles.manage');

  if coalesce(char_length(trim(requested_reason)), 0) < 10 then
    raise exception 'Role revocation requires a reason';
  end if;

  select assignment.id into target_assignment_id
  from public.staff_roles as assignment
  join public.roles as role on role.id = assignment.role_id
  where assignment.staff_id = requested_staff_id
    and role.code = requested_role_code
    and assignment.revoked_at is null
  for update of assignment;

  if target_assignment_id is null then raise exception 'Active role assignment not found'; end if;

  if requested_role_code = 'system_admin'
     and private.is_active_system_administrator(requested_staff_id)
     and private.active_system_administrator_count() <= 1 then
    raise exception 'The final active System Administrator role cannot be removed';
  end if;

  update public.staff_roles
  set revoked_by = actor_id,
      revoked_at = now(),
      revocation_reason = trim(requested_reason)
  where id = target_assignment_id;

  insert into public.audit_logs (
    actor_staff_id,
    actor_type,
    action,
    resource_type,
    resource_id,
    sensitivity,
    metadata
  ) values (
    actor_id,
    'staff',
    'staff.role_revoked',
    'staff_profile',
    requested_staff_id,
    'security',
    jsonb_build_object('role', requested_role_code, 'reason', trim(requested_reason))
  );
end;
$$;

create or replace function public.suspend_staff_account(
  requested_staff_id uuid,
  requested_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
begin
  actor_id := private.require_staff_action('staff.suspend');

  if actor_id = requested_staff_id then
    raise exception 'You cannot suspend your own account';
  end if;

  if coalesce(char_length(trim(requested_reason)), 0) < 10 then
    raise exception 'Account suspension requires a reason';
  end if;

  if private.is_active_system_administrator(requested_staff_id)
     and private.active_system_administrator_count() <= 1 then
    raise exception 'The final active System Administrator cannot be suspended';
  end if;

  update public.staff_profiles
  set account_status = 'suspended'
  where id = requested_staff_id
    and account_status in ('invited', 'active');

  if not found then raise exception 'The target account cannot be suspended'; end if;

  insert into public.audit_logs (
    actor_staff_id,
    actor_type,
    action,
    resource_type,
    resource_id,
    sensitivity,
    metadata
  ) values (
    actor_id,
    'staff',
    'staff.suspended',
    'staff_profile',
    requested_staff_id,
    'security',
    jsonb_build_object('reason', trim(requested_reason))
  );
end;
$$;

create policy staff_profiles_read_authenticated_self
on public.staff_profiles
for select
to authenticated
using (id = (select auth.uid()));

create policy staff_roles_read_authenticated_self
on public.staff_roles
for select
to authenticated
using (staff_id = (select auth.uid()));

revoke all on function private.require_staff_action(text) from public;
revoke all on function private.active_system_administrator_count() from public;
revoke all on function private.is_active_system_administrator(uuid) from public;

revoke all on function public.get_my_staff_context() from public;
revoke all on function public.bootstrap_first_system_administrator(text, text) from public;
revoke all on function public.register_invited_staff(uuid, text, text, text, text, uuid, text) from public;
revoke all on function public.activate_invited_staff_account() from public;
revoke all on function public.assign_staff_role(uuid, text, text) from public;
revoke all on function public.revoke_staff_role(uuid, text, text) from public;
revoke all on function public.suspend_staff_account(uuid, text) from public;

grant execute on function public.get_my_staff_context() to authenticated;
grant execute on function public.bootstrap_first_system_administrator(text, text) to authenticated;
grant execute on function public.register_invited_staff(uuid, text, text, text, text, uuid, text) to service_role;
grant execute on function public.activate_invited_staff_account() to authenticated;
grant execute on function public.assign_staff_role(uuid, text, text) to authenticated;
grant execute on function public.revoke_staff_role(uuid, text, text) to authenticated;
grant execute on function public.suspend_staff_account(uuid, text) to authenticated;

commit;
