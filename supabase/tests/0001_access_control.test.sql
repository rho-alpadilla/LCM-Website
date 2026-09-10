begin;

select plan(12);

select is((select count(*)::integer from public.roles), 11, 'all confirmed staff roles are seeded');

select set_eq(
  $$select permission_code from public.role_permissions where role_id = (select id from public.roles where code = 'leader')$$,
  $$select permission_code from public.role_permissions where role_id = (select id from public.roles where code = 'associate_pastor')$$,
  'Leader permissions mirror Associate Pastor permissions'
);

select set_eq(
  $$select permission_code from public.role_permissions where role_id = (select id from public.roles where code = 'core_leader')$$,
  $$select permission_code from public.role_permissions where role_id = (select id from public.roles where code = 'senior_pastor')$$,
  'Core Leader permissions mirror Senior Pastor permissions'
);

select ok(
  exists (
    select 1 from public.role_permissions as grant_row
    join public.roles as role on role.id = grant_row.role_id
    where role.code = 'multimedia_head' and grant_row.permission_code = 'content.self_approve'
  ),
  'Multimedia Head may self-approve inside its scope'
);

select ok(
  exists (
    select 1 from public.role_permissions as grant_row
    join public.roles as role on role.id = grant_row.role_id
    where role.code = 'bulletin_head' and grant_row.permission_code = 'content.self_approve'
  ),
  'Bulletin Head may self-approve inside its scope'
);

select is(
  (
    select count(*)::integer from public.role_permissions as grant_row
    join public.roles as role on role.id = grant_row.role_id
    where role.code in ('multimedia_team', 'bulletin_team')
      and grant_row.permission_code = 'content.self_approve'
  ),
  0,
  'Team roles cannot self-approve'
);

select is(
  (
    select count(*)::integer from public.role_permissions as grant_row
    join public.roles as role on role.id = grant_row.role_id
    where role.code = 'system_admin'
      and grant_row.permission_code in (
        'prayer.read_team', 'prayer.read_pastoral', 'giving.details.read', 'giving.contributors.read'
      )
  ),
  0,
  'System Administrator does not automatically receive pastoral or donor details'
);

select is(
  (select count(*)::integer from public.role_permissions where permission_code = 'content.emergency_publish'),
  0,
  'unconfirmed emergency publishing is not assigned to any role'
);

select has_function(
  'public',
  'get_my_staff_context',
  array[]::text[],
  'authenticated staff context function exists'
);

select has_function(
  'public',
  'bootstrap_first_system_administrator',
  array['text', 'text'],
  'one-time administrator bootstrap function exists'
);

select has_function(
  'public',
  'assign_staff_role',
  array['uuid', 'text', 'text'],
  'audited role-assignment function exists'
);

select has_function(
  'public',
  'suspend_staff_account',
  array['uuid', 'text'],
  'protected account-suspension function exists'
);

select * from finish();
rollback;
