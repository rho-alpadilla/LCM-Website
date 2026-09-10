begin;

select plan(6);

insert into auth.users (
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '00000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'first-admin@example.test',
  now(),
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);

select lives_ok(
  $$select public.bootstrap_first_system_administrator('First Administrator', 'Initial approved test bootstrap')$$,
  'first administrator can complete the one-time MFA bootstrap'
);

select is(
  (
    select account_status
    from public.staff_profiles
    where id = '00000000-0000-4000-8000-000000000001'
  ),
  'active',
  'bootstrap activates the first administrator profile'
);

select ok(
  private.is_active_system_administrator('00000000-0000-4000-8000-000000000001'),
  'bootstrap assigns the System Administrator role'
);

select throws_ok(
  $$select public.suspend_staff_account('00000000-0000-4000-8000-000000000001', 'Attempted self suspension')$$,
  'P0001',
  'You cannot suspend your own account',
  'a System Administrator cannot suspend their own account'
);

select throws_ok(
  $$select public.revoke_staff_role('00000000-0000-4000-8000-000000000001', 'system_admin', 'Attempted final administrator removal')$$,
  'P0001',
  'The final active System Administrator role cannot be removed',
  'the final active System Administrator role cannot be revoked'
);

insert into auth.users (
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '00000000-0000-4000-8000-000000000002',
  'authenticated',
  'authenticated',
  'leader@example.test',
  now(),
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

insert into public.staff_profiles (
  id,
  display_name,
  account_status,
  must_enroll_mfa
) values (
  '00000000-0000-4000-8000-000000000002',
  'Trusted Leader',
  'active',
  false
);

insert into public.staff_roles (
  staff_id,
  role_id,
  assigned_by,
  assignment_reason
)
select
  '00000000-0000-4000-8000-000000000002',
  role.id,
  '00000000-0000-4000-8000-000000000001',
  'Initial Leader test assignment'
from public.roles as role
where role.code = 'leader';

select public.assign_staff_role(
  '00000000-0000-4000-8000-000000000002',
  'core_leader',
  'Approved elevated access for trusted leader'
);

select ok(
  exists (
    select 1
    from public.staff_roles as assignment
    join public.roles as role on role.id = assignment.role_id
    where assignment.staff_id = '00000000-0000-4000-8000-000000000002'
      and assignment.revoked_at is null
      and role.code = 'core_leader'
  ),
  'a System Administrator can elevate an existing Leader to Core Leader with a reason'
);

select * from finish();
rollback;
