begin;

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  alt_text text,
  uploaded_by uuid not null references public.staff_profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create table public.content_entries (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (
    content_type in ('page', 'ministry', 'sermon', 'series', 'speaker', 'schedule', 'announcement', 'bulletin')
  ),
  title text not null check (char_length(title) between 1 and 180),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text,
  body jsonb not null default '{}'::jsonb,
  cover_asset_id uuid references public.media_assets (id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'approved', 'published', 'archived')),
  created_by uuid not null references public.staff_profiles (id) on delete restrict,
  updated_by uuid not null references public.staff_profiles (id) on delete restrict,
  submitted_by uuid references public.staff_profiles (id) on delete restrict,
  submitted_at timestamptz,
  approved_by uuid references public.staff_profiles (id) on delete restrict,
  approved_at timestamptz,
  published_by uuid references public.staff_profiles (id) on delete restrict,
  published_at timestamptz,
  archived_by uuid references public.staff_profiles (id) on delete restrict,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_submission_complete check (
    (submitted_by is null and submitted_at is null)
    or (submitted_by is not null and submitted_at is not null)
  ),
  constraint content_approval_complete check (
    (approved_by is null and approved_at is null)
    or (approved_by is not null and approved_at is not null)
  ),
  constraint content_publication_complete check (
    (published_by is null and published_at is null)
    or (published_by is not null and published_at is not null)
  ),
  constraint content_archive_complete check (
    (archived_by is null and archived_at is null)
    or (archived_by is not null and archived_at is not null)
  ),
  unique (content_type, slug)
);

create index content_entries_public_listing_idx
  on public.content_entries (content_type, published_at desc)
  where status = 'published';
create index content_entries_admin_queue_idx
  on public.content_entries (status, updated_at desc);

create table public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_entries (id) on delete cascade,
  version integer not null check (version > 0),
  snapshot jsonb not null,
  change_summary text,
  created_by uuid not null references public.staff_profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (content_id, version)
);

create index content_revisions_content_idx
  on public.content_revisions (content_id, version desc);

create table public.content_review_events (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_entries (id) on delete cascade,
  revision_id uuid not null references public.content_revisions (id) on delete restrict,
  action text not null check (action in ('submitted', 'approved', 'published', 'archived')),
  actor_staff_id uuid not null references public.staff_profiles (id) on delete restrict,
  is_self_approval boolean not null default false,
  reason text,
  created_at timestamptz not null default now()
);

create index content_review_events_content_idx
  on public.content_review_events (content_id, created_at desc);

create trigger content_entries_set_updated_at
before update on public.content_entries
for each row execute function private.set_updated_at();

create or replace function private.content_manage_permission(requested_type text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select case requested_type
    when 'page' then 'content.pages.manage'
    when 'ministry' then 'content.ministries.manage'
    when 'sermon' then 'content.sermons.manage'
    when 'series' then 'content.series.manage'
    when 'speaker' then 'content.speakers.manage'
    when 'schedule' then 'content.schedule.manage'
    when 'announcement' then 'content.announcements.manage'
    when 'bulletin' then 'content.bulletins.manage'
  end
$$;

create or replace function private.can_manage_content_type(requested_type text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    private.has_permission(private.content_manage_permission(requested_type)),
    false
  )
$$;

create or replace function private.require_content_action(
  requested_type text,
  requested_permission text
)
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
  if not private.has_permission(requested_permission)
     or not private.can_manage_content_type(requested_type) then
    raise exception 'You do not have permission for this content action';
  end if;

  return actor_id;
end;
$$;

create or replace function public.submit_content_for_review(
  requested_content_id uuid,
  requested_change_summary text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.content_entries%rowtype;
  actor_id uuid;
  next_version integer;
  new_revision_id uuid;
begin
  select * into target
  from public.content_entries
  where id = requested_content_id
  for update;

  if not found then raise exception 'Content entry not found'; end if;
  actor_id := private.require_content_action(target.content_type, 'content.submit');
  if target.status not in ('draft', 'approved') then
    raise exception 'Only draft or approved content can be submitted';
  end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.content_revisions where content_id = target.id;

  insert into public.content_revisions (
    content_id, version, snapshot, change_summary, created_by
  ) values (
    target.id,
    next_version,
    jsonb_build_object(
      'content_type', target.content_type,
      'title', target.title,
      'slug', target.slug,
      'summary', target.summary,
      'body', target.body,
      'cover_asset_id', target.cover_asset_id
    ),
    nullif(trim(requested_change_summary), ''),
    actor_id
  ) returning id into new_revision_id;

  update public.content_entries
  set status = 'pending_review', submitted_by = actor_id, submitted_at = now(),
      approved_by = null, approved_at = null, updated_by = actor_id
  where id = target.id;

  insert into public.content_review_events (
    content_id, revision_id, action, actor_staff_id
  ) values (target.id, new_revision_id, 'submitted', actor_id);

  insert into public.audit_logs (
    actor_staff_id, actor_type, action, resource_type, resource_id, metadata
  ) values (
    actor_id, 'staff', 'content.submitted', 'content_entry', target.id,
    jsonb_build_object('content_type', target.content_type, 'revision', next_version)
  );

  return new_revision_id;
end;
$$;

create or replace function public.approve_content(
  requested_content_id uuid,
  requested_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.content_entries%rowtype;
  actor_id uuid;
  revision_id uuid;
  is_self_approval boolean;
begin
  select * into target
  from public.content_entries
  where id = requested_content_id
  for update;

  if not found then raise exception 'Content entry not found'; end if;
  actor_id := private.require_content_action(target.content_type, 'content.approve');
  if target.status <> 'pending_review' then
    raise exception 'Only pending content can be approved';
  end if;

  is_self_approval := target.submitted_by = actor_id;
  if is_self_approval and not private.has_permission('content.self_approve') then
    raise exception 'Self-approval is not allowed for this account';
  end if;

  select revision.id into revision_id
  from public.content_revisions as revision
  where revision.content_id = target.id
  order by revision.version desc limit 1;
  if revision_id is null then raise exception 'A submitted revision is required'; end if;

  update public.content_entries
  set status = 'approved', approved_by = actor_id, approved_at = now(), updated_by = actor_id
  where id = target.id;

  insert into public.content_review_events (
    content_id, revision_id, action, actor_staff_id, is_self_approval, reason
  ) values (
    target.id, revision_id, 'approved', actor_id, is_self_approval,
    nullif(trim(requested_reason), '')
  );

  insert into public.audit_logs (
    actor_staff_id, actor_type, action, resource_type, resource_id, metadata
  ) values (
    actor_id, 'staff', 'content.approved', 'content_entry', target.id,
    jsonb_build_object('content_type', target.content_type, 'self_approval', is_self_approval)
  );
end;
$$;

create or replace function public.publish_content(requested_content_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.content_entries%rowtype;
  actor_id uuid;
  revision_id uuid;
begin
  select * into target
  from public.content_entries
  where id = requested_content_id
  for update;

  if not found then raise exception 'Content entry not found'; end if;
  actor_id := private.require_content_action(target.content_type, 'content.publish');
  if target.status <> 'approved' then
    raise exception 'Only approved content can be published';
  end if;

  select revision.id into revision_id
  from public.content_revisions as revision
  where revision.content_id = target.id
  order by revision.version desc limit 1;

  update public.content_entries
  set status = 'published', published_by = actor_id, published_at = now(), updated_by = actor_id
  where id = target.id;

  insert into public.content_review_events (
    content_id, revision_id, action, actor_staff_id
  ) values (target.id, revision_id, 'published', actor_id);

  insert into public.audit_logs (
    actor_staff_id, actor_type, action, resource_type, resource_id, metadata
  ) values (
    actor_id, 'staff', 'content.published', 'content_entry', target.id,
    jsonb_build_object('content_type', target.content_type)
  );
end;
$$;

alter table public.media_assets enable row level security;
alter table public.content_entries enable row level security;
alter table public.content_revisions enable row level security;
alter table public.content_review_events enable row level security;

create policy media_assets_read_by_content_staff
on public.media_assets for select to authenticated
using ((select private.has_permission('content.media.manage')));

create policy published_content_is_public
on public.content_entries for select to anon, authenticated
using (status = 'published' and published_at is not null and published_at <= now());

create policy scoped_content_is_readable_by_staff
on public.content_entries for select to authenticated
using ((select private.can_manage_content_type(content_type)));

create policy revisions_are_readable_by_scoped_staff
on public.content_revisions for select to authenticated
using (
  exists (
    select 1 from public.content_entries as entry
    where entry.id = content_revisions.content_id
      and (select private.can_manage_content_type(entry.content_type))
  )
);

create policy review_events_are_readable_by_scoped_staff
on public.content_review_events for select to authenticated
using (
  exists (
    select 1 from public.content_entries as entry
    where entry.id = content_review_events.content_id
      and (select private.can_manage_content_type(entry.content_type))
  )
);

grant select on public.media_assets to authenticated;
grant select on public.content_entries to anon, authenticated;
grant select on public.content_revisions to authenticated;
grant select on public.content_review_events to authenticated;

revoke all on function public.submit_content_for_review(uuid, text) from public;
revoke all on function public.approve_content(uuid, text) from public;
revoke all on function public.publish_content(uuid) from public;
grant execute on function public.submit_content_for_review(uuid, text) to authenticated;
grant execute on function public.approve_content(uuid, text) to authenticated;
grant execute on function public.publish_content(uuid) to authenticated;

grant execute on function private.content_manage_permission(text) to authenticated;
grant execute on function private.can_manage_content_type(text) to authenticated;
revoke all on function private.require_content_action(text, text) from public;

commit;
