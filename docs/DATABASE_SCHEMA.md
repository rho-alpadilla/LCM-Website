# Database Schema and Security Design

> **Migration status:** The access-control foundation has been converted to
> Cloudflare D1 in `migrations/d1`. The remaining sections describe the preserved
> Supabase/PostgreSQL prototype and approved logical requirements; provider-specific
> functions, `auth.users`, and Row Level Security policies are not the production
> implementation. See `CLOUDFLARE_MIGRATION_PLAN.md`.

## Status

The access-control and initial content-workflow portions of this design now have
version-controlled migrations. Prayer, engagement, giving, notifications, and
the remaining public read models are still planned and must not be treated as
implemented.

Related documents:

- `PROJECT_BRIEF.md`
- `ARCHITECTURE.md`
- `PERMISSION_MATRIX.md`

## Database Standards

- Cloudflare D1 is the approved production system of record. PostgreSQL remains
  only in the preserved prototype until each feature is replaced and verified.
- UUIDs are used for externally referenced primary keys.
- All timestamps use `timestamptz` and are stored in UTC.
- Philippine display times use the `Asia/Manila` time zone at the application boundary.
- Currency amounts use integer minor units. Philippine pesos are stored as centavos.
- Financial values never use floating-point types.
- Schema changes are made only through version-controlled SQL migrations.
- Every exposed table has Row Level Security enabled.
- Sensitive records use lifecycle states and retention rules instead of casual hard deletion.
- Foreign keys, checks, uniqueness constraints, and transactions enforce invariants in addition to application validation.
- Database secrets and service-role credentials never enter browser-delivered code.

## Schemas

| Schema    | Purpose                                                                 | API exposure                      |
| --------- | ----------------------------------------------------------------------- | --------------------------------- |
| `auth`    | Managed by Supabase Auth                                                | Managed by Supabase               |
| `public`  | Application tables, safe RPC entry points and approved public views     | Selectively exposed with RLS      |
| `private` | Authorization helpers, privileged functions and internal implementation | Not exposed to public API clients |

## Shared Conventions

Most editable tables include:

```text
id uuid primary key default gen_random_uuid()
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
created_by uuid null references public.staff_profiles(id)
updated_by uuid null references public.staff_profiles(id)
```

`updated_at` is maintained by a database trigger. Actor fields are assigned from the authenticated staff identity on trusted writes rather than accepted blindly from form input.

## Identity and Authorization

### `staff_profiles`

Church-specific staff profile linked one-to-one with Supabase Auth.

| Column            | Type          | Rules                                                           |
| ----------------- | ------------- | --------------------------------------------------------------- |
| `id`              | `uuid`        | Primary key; references `auth.users(id)` with delete restricted |
| `display_name`    | `text`        | Required; 1-120 characters                                      |
| `phone`           | `text`        | Optional; restricted visibility                                 |
| `job_title`       | `text`        | Optional                                                        |
| `account_status`  | `text`        | `invited`, `active`, `suspended`, or `disabled`                 |
| `must_enroll_mfa` | `boolean`     | Required; defaults to `true`                                    |
| `last_seen_at`    | `timestamptz` | Optional operational timestamp                                  |
| `created_at`      | `timestamptz` | Required                                                        |
| `updated_at`      | `timestamptz` | Required                                                        |

Email ownership remains in Supabase Auth and is not unnecessarily duplicated here.

### `roles`

| Column        | Type          | Rules                                        |
| ------------- | ------------- | -------------------------------------------- |
| `id`          | `uuid`        | Primary key                                  |
| `code`        | `text`        | Unique immutable code                        |
| `name`        | `text`        | Unique display name                          |
| `description` | `text`        | Required                                     |
| `is_system`   | `boolean`     | Prevents accidental deletion of seeded roles |
| `created_at`  | `timestamptz` | Required                                     |

Seeded role codes:

- `system_admin`
- `senior_pastor`
- `associate_pastor`
- `leader`
- `core_leader`
- `multimedia_head`
- `multimedia_team`
- `bulletin_head`
- `bulletin_team`
- `treasurer`
- `prayer_warrior`

### `permissions`

| Column        | Type   | Rules                                                        |
| ------------- | ------ | ------------------------------------------------------------ |
| `code`        | `text` | Primary key; namespaced capability code                      |
| `description` | `text` | Required                                                     |
| `sensitivity` | `text` | `standard`, `personal`, `prayer`, `financial`, or `security` |

### `role_permissions`

| Column            | Type          | Rules                          |
| ----------------- | ------------- | ------------------------------ |
| `role_id`         | `uuid`        | References `roles(id)`         |
| `permission_code` | `text`        | References `permissions(code)` |
| `created_at`      | `timestamptz` | Required                       |

Primary key: (`role_id`, `permission_code`).

### `staff_roles`

| Column              | Type          | Rules                                                   |
| ------------------- | ------------- | ------------------------------------------------------- |
| `id`                | `uuid`        | Primary key                                             |
| `staff_id`          | `uuid`        | References `staff_profiles(id)`                         |
| `role_id`           | `uuid`        | References `roles(id)`                                  |
| `assigned_by`       | `uuid`        | References `staff_profiles(id)`                         |
| `assignment_reason` | `text`        | Required for Core Leader and other elevated assignments |
| `assigned_at`       | `timestamptz` | Required                                                |
| `revoked_by`        | `uuid`        | Optional staff reference                                |
| `revoked_at`        | `timestamptz` | Optional                                                |
| `revocation_reason` | `text`        | Required when revoked                                   |

A partial unique index prevents duplicate active assignments for the same staff member and role.

## Media

### `media_assets`

Stores metadata only. File bytes remain in Supabase Storage.

| Column            | Type          | Rules                                           |
| ----------------- | ------------- | ----------------------------------------------- |
| `id`              | `uuid`        | Primary key                                     |
| `bucket`          | `text`        | Approved bucket only                            |
| `object_path`     | `text`        | Unique within bucket                            |
| `original_name`   | `text`        | Sanitized display value                         |
| `mime_type`       | `text`        | Approved MIME type                              |
| `size_bytes`      | `bigint`      | Greater than zero and within configured maximum |
| `checksum_sha256` | `text`        | Optional verification value                     |
| `alt_text`        | `text`        | Required for meaningful public images           |
| `visibility`      | `text`        | `public` or `private`                           |
| `uploaded_by`     | `uuid`        | Required staff reference                        |
| `created_at`      | `timestamptz` | Required                                        |

Unique constraint: (`bucket`, `object_path`).

## Publishable Content

### `content_entries`

Shared publishing identity and workflow fields.

| Column           | Type          | Rules                                                                                                                   |
| ---------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `id`             | `uuid`        | Primary key                                                                                                             |
| `content_type`   | `text`        | `page`, `ministry`, `sermon`, `series`, `announcement`, `bulletin`, or `schedule`                                       |
| `slug`           | `text`        | Required for public entries; lowercase URL-safe value                                                                   |
| `title`          | `text`        | Required; 1-180 characters                                                                                              |
| `summary`        | `text`        | Optional                                                                                                                |
| `body`           | `jsonb`       | Structured editor content; defaults to `{}`                                                                             |
| `cover_media_id` | `uuid`        | Optional reference to `media_assets(id)`                                                                                |
| `status`         | `text`        | `draft`, `pending_review`, `approved`, `published`, or `archived`                                                       |
| `version`        | `integer`     | Required; begins at 1 and increases on update                                                                           |
| `submitted_by`   | `uuid`        | Optional staff reference                                                                                                |
| `submitted_at`   | `timestamptz` | Optional                                                                                                                |
| `approved_by`    | `uuid`        | Optional staff reference; may equal the submitting author only when scoped `content.self_approve` permission is present |
| `approved_at`    | `timestamptz` | Optional                                                                                                                |
| `published_by`   | `uuid`        | Optional staff reference                                                                                                |
| `published_at`   | `timestamptz` | Optional; may be scheduled in the future                                                                                |
| `archived_at`    | `timestamptz` | Optional                                                                                                                |
| `created_by`     | `uuid`        | Required staff reference                                                                                                |
| `updated_by`     | `uuid`        | Required staff reference                                                                                                |
| `created_at`     | `timestamptz` | Required                                                                                                                |
| `updated_at`     | `timestamptz` | Required                                                                                                                |

Constraints and indexes:

- Unique index on (`content_type`, `lower(slug)`) when `slug` is not null.
- Check that workflow timestamps and actors match the selected status.
- Check that `published_at` is present for published content.
- Index on (`content_type`, `status`, `published_at desc`).
- Index on (`status`, `updated_at desc`) for review queues.

### `content_revisions`

Immutable revision snapshots for review and recovery.

| Column           | Type          | Rules                                |
| ---------------- | ------------- | ------------------------------------ |
| `id`             | `uuid`        | Primary key                          |
| `content_id`     | `uuid`        | References `content_entries(id)`     |
| `version`        | `integer`     | Required                             |
| `snapshot`       | `jsonb`       | Sanitized content and subtype fields |
| `change_summary` | `text`        | Required for submitted changes       |
| `created_by`     | `uuid`        | Required staff reference             |
| `created_at`     | `timestamptz` | Required                             |

Unique constraint: (`content_id`, `version`). Revisions are append-only.

### `content_review_events`

Append-only publishing history.

| Column             | Type          | Rules                                                                    |
| ------------------ | ------------- | ------------------------------------------------------------------------ |
| `id`               | `uuid`        | Primary key                                                              |
| `content_id`       | `uuid`        | References `content_entries(id)`                                         |
| `revision_id`      | `uuid`        | References `content_revisions(id)`                                       |
| `action`           | `text`        | `submitted`, `changes_requested`, `approved`, `published`, or `archived` |
| `reason`           | `text`        | Required for requested changes and exceptional actions                   |
| `actor_id`         | `uuid`        | Required staff reference                                                 |
| `is_self_approval` | `boolean`     | Required; true only for an authorized scoped self-approval               |
| `created_at`       | `timestamptz` | Required                                                                 |

### `ministries`

| Column          | Type      | Rules                                         |
| --------------- | --------- | --------------------------------------------- |
| `content_id`    | `uuid`    | Primary key; references `content_entries(id)` |
| `short_name`    | `text`    | Optional                                      |
| `contact_email` | `text`    | Optional public contact                       |
| `contact_phone` | `text`    | Optional public contact                       |
| `sort_order`    | `integer` | Defaults to zero                              |

### `speakers`

| Column           | Type      | Rules                          |
| ---------------- | --------- | ------------------------------ |
| `id`             | `uuid`    | Primary key                    |
| `display_name`   | `text`    | Required                       |
| `slug`           | `text`    | Unique lowercase slug          |
| `biography`      | `text`    | Optional                       |
| `photo_media_id` | `uuid`    | Optional media reference       |
| `is_active`      | `boolean` | Required                       |
| audit columns    |           | Standard editable-table fields |

### `sermon_series`

| Column       | Type   | Rules                                         |
| ------------ | ------ | --------------------------------------------- |
| `content_id` | `uuid` | Primary key; references `content_entries(id)` |
| `starts_on`  | `date` | Optional                                      |
| `ends_on`    | `date` | Optional; must not precede start              |

### `sermons`

| Column                | Type          | Rules                                             |
| --------------------- | ------------- | ------------------------------------------------- |
| `content_id`          | `uuid`        | Primary key; references `content_entries(id)`     |
| `series_content_id`   | `uuid`        | Optional reference to `sermon_series(content_id)` |
| `speaker_id`          | `uuid`        | Optional reference to `speakers(id)`              |
| `preached_at`         | `timestamptz` | Required                                          |
| `scripture_reference` | `text`        | Optional                                          |
| `video_provider`      | `text`        | `facebook` or `youtube` initially                 |
| `video_url`           | `text`        | Required approved HTTPS URL                       |
| `duration_seconds`    | `integer`     | Optional positive value                           |

Indexes: `preached_at desc`, `series_content_id`, and `speaker_id`.

### `announcements`

| Column          | Type          | Rules                                         |
| --------------- | ------------- | --------------------------------------------- |
| `content_id`    | `uuid`        | Primary key; references `content_entries(id)` |
| `visible_from`  | `timestamptz` | Optional                                      |
| `visible_until` | `timestamptz` | Optional; must follow start                   |
| `priority`      | `smallint`    | Bounded value used for ordering               |

### `bulletins`

| Column          | Type   | Rules                                            |
| --------------- | ------ | ------------------------------------------------ |
| `content_id`    | `uuid` | Primary key; references `content_entries(id)`    |
| `issue_date`    | `date` | Required                                         |
| `file_media_id` | `uuid` | Required reference to an approved bulletin asset |
| `edition_label` | `text` | Optional                                         |

Index: `issue_date desc`.

## Schedule

### `schedule_items`

| Column                | Type          | Rules                                                              |
| --------------------- | ------------- | ------------------------------------------------------------------ |
| `content_id`          | `uuid`        | Primary key; references `content_entries(id)`                      |
| `activity_type`       | `text`        | Approved activity type                                             |
| `ministry_content_id` | `uuid`        | Optional ministry reference                                        |
| `starts_at`           | `timestamptz` | Required                                                           |
| `ends_at`             | `timestamptz` | Required; must follow start                                        |
| `timezone`            | `text`        | Defaults to `Asia/Manila`                                          |
| `recurrence_rule`     | `text`        | Optional RFC 5545 recurrence rule                                  |
| `recurrence_until`    | `timestamptz` | Optional                                                           |
| `location_name`       | `text`        | Optional                                                           |
| `location_address`    | `text`        | Optional                                                           |
| `location_visibility` | `text`        | `public_exact`, `public_area`, `contact_required`, or `staff_only` |
| `contact_email`       | `text`        | Optional public contact                                            |
| `contact_phone`       | `text`        | Optional public contact                                            |
| `registration_url`    | `text`        | Optional approved HTTPS URL                                        |

Indexes: `starts_at`, `activity_type`, `ministry_content_id`, and publication status through `content_entries`.

### `schedule_exceptions`

| Column                  | Type          | Rules                                   |
| ----------------------- | ------------- | --------------------------------------- |
| `id`                    | `uuid`        | Primary key                             |
| `schedule_content_id`   | `uuid`        | References `schedule_items(content_id)` |
| `occurrence_date`       | `date`        | Required                                |
| `action`                | `text`        | `cancelled` or `rescheduled`            |
| `replacement_starts_at` | `timestamptz` | Required only for reschedule            |
| `replacement_ends_at`   | `timestamptz` | Required only for reschedule            |
| `public_note`           | `text`        | Optional                                |
| audit columns           |               | Standard editable-table fields          |

Unique constraint: (`schedule_content_id`, `occurrence_date`).

## Prayer Requests

### `prayer_requests`

Prayer content is separated from requester contact information.

| Column                | Type          | Rules                                                                          |
| --------------------- | ------------- | ------------------------------------------------------------------------------ |
| `id`                  | `uuid`        | Primary key                                                                    |
| `request_text`        | `text`        | Required; bounded length                                                       |
| `privacy_scope`       | `text`        | `prayer_team` or `pastoral_only`                                               |
| `status`              | `text`        | `open`, `in_prayer`, `follow_up`, `escalated`, `closed`, or `retention_review` |
| `source`              | `text`        | Initially `website`; extensible                                                |
| `submitted_at`        | `timestamptz` | Required                                                                       |
| `closed_at`           | `timestamptz` | Optional                                                                       |
| `retention_review_at` | `timestamptz` | Required based on approved policy                                              |

Indexes: (`privacy_scope`, `status`, `submitted_at desc`) and `retention_review_at`.

### `prayer_request_contacts`

| Column              | Type      | Rules                                         |
| ------------------- | --------- | --------------------------------------------- |
| `prayer_request_id` | `uuid`    | Primary key; references `prayer_requests(id)` |
| `name`              | `text`    | Optional                                      |
| `email`             | `text`    | Optional                                      |
| `phone`             | `text`    | Optional                                      |
| `preferred_contact` | `text`    | `email`, `phone`, or `none`                   |
| `follow_up_consent` | `boolean` | Required                                      |

Contact information is accessible only when follow-up is permitted and the staff member has the required permission. Anonymous requests may have no contact row.

### `prayer_assignments`

| Column              | Type          | Rules                            |
| ------------------- | ------------- | -------------------------------- |
| `id`                | `uuid`        | Primary key                      |
| `prayer_request_id` | `uuid`        | References `prayer_requests(id)` |
| `assigned_staff_id` | `uuid`        | References `staff_profiles(id)`  |
| `assigned_by`       | `uuid`        | Required staff reference         |
| `assigned_at`       | `timestamptz` | Required                         |
| `ended_at`          | `timestamptz` | Optional                         |

A partial unique index prevents duplicate active assignments.

### `prayer_updates`

| Column              | Type          | Rules                                                   |
| ------------------- | ------------- | ------------------------------------------------------- |
| `id`                | `uuid`        | Primary key                                             |
| `prayer_request_id` | `uuid`        | References `prayer_requests(id)`                        |
| `update_type`       | `text`        | `prayed`, `note`, `follow_up`, `escalated`, or `closed` |
| `note`              | `text`        | Optional; bounded length                                |
| `visibility_scope`  | `text`        | `prayer_team` or `pastoral_only`                        |
| `created_by`        | `uuid`        | Required staff reference                                |
| `created_at`        | `timestamptz` | Required                                                |

Index: (`prayer_request_id`, `created_at`). Updates are append-only.

## Engagement

### `contact_submissions`

Stores public contact messages with status, permitted assignee, contact information, consent fields, timestamps, and retention-review date.

### `ministry_interest_submissions`

Stores the selected ministry, contact information, message, consent, workflow status, assignee, timestamps, and retention-review date.

Both tables prohibit public reads and use safe public submission functions rather than unrestricted anonymous table writes.

## Giving

### `giving_categories`

| Column        | Type      | Rules                          |
| ------------- | --------- | ------------------------------ |
| `id`          | `uuid`    | Primary key                    |
| `code`        | `text`    | Unique immutable code          |
| `name`        | `text`    | Unique display name            |
| `description` | `text`    | Optional                       |
| `is_active`   | `boolean` | Required                       |
| `sort_order`  | `integer` | Required                       |
| audit columns |           | Standard editable-table fields |

Exact initial categories remain to be confirmed.

### `contributors`

| Column            | Type          | Rules                                  |
| ----------------- | ------------- | -------------------------------------- |
| `id`              | `uuid`        | Primary key                            |
| `full_name`       | `text`        | Optional unless required for a receipt |
| `email`           | `text`        | Optional                               |
| `phone`           | `text`        | Optional                               |
| `receipt_address` | `jsonb`       | Optional; only approved fields         |
| `created_at`      | `timestamptz` | Required                               |
| `updated_at`      | `timestamptz` | Required                               |

Contributor identity is optional. Anonymous giving does not create an identifiable contributor unless a receipt or legally required process needs it.

### `contributions`

Canonical giving record.

| Column                  | Type          | Rules                                                                           |
| ----------------------- | ------------- | ------------------------------------------------------------------------------- |
| `id`                    | `uuid`        | Primary key                                                                     |
| `source`                | `text`        | `online` or `offline`                                                           |
| `category_id`           | `uuid`        | References `giving_categories(id)`                                              |
| `contributor_id`        | `uuid`        | Optional reference to `contributors(id)`                                        |
| `is_anonymous`          | `boolean`     | Required                                                                        |
| `original_amount_minor` | `bigint`      | Required; greater than zero; immutable after confirmation                       |
| `currency`              | `char(3)`     | Required; initially `PHP`                                                       |
| `status`                | `text`        | `pending`, `confirmed`, `partially_refunded`, `refunded`, `voided`, or `failed` |
| `received_at`           | `timestamptz` | Required when confirmed                                                         |
| `created_by`            | `uuid`        | Null for unauthenticated online initiation; staff for offline entry             |
| `created_at`            | `timestamptz` | Required                                                                        |
| `updated_at`            | `timestamptz` | Required                                                                        |

Indexes:

- (`received_at desc`, `status`)
- (`category_id`, `received_at desc`)
- (`source`, `status`, `created_at desc`)

Effective contribution value is calculated from the original amount plus approved adjustments minus completed refunds. It is not stored as a manually editable total.

### `online_payment_transactions`

| Column                   | Type          | Rules                              |
| ------------------------ | ------------- | ---------------------------------- |
| `id`                     | `uuid`        | Primary key                        |
| `contribution_id`        | `uuid`        | References `contributions(id)`     |
| `provider`               | `text`        | Approved provider code             |
| `provider_checkout_id`   | `text`        | Optional unique provider reference |
| `provider_payment_id`    | `text`        | Optional unique provider reference |
| `provider_status`        | `text`        | Normalized provider state          |
| `gross_amount_minor`     | `bigint`      | Required when known                |
| `fee_amount_minor`       | `bigint`      | Optional non-negative value        |
| `net_amount_minor`       | `bigint`      | Optional                           |
| `settled_at`             | `timestamptz` | Optional                           |
| `last_provider_event_at` | `timestamptz` | Optional                           |
| `created_at`             | `timestamptz` | Required                           |
| `updated_at`             | `timestamptz` | Required                           |

Unique indexes apply to non-null provider checkout and payment identifiers scoped by provider.

### `offline_contribution_details`

| Column                | Type          | Rules                                                                      |
| --------------------- | ------------- | -------------------------------------------------------------------------- |
| `contribution_id`     | `uuid`        | Primary key; references `contributions(id)`                                |
| `method`              | `text`        | `cash`, `bank_transfer`, `bank_deposit`, `check`, or approved other method |
| `reference_number`    | `text`        | Optional                                                                   |
| `evidence_media_id`   | `uuid`        | Optional private media reference                                           |
| `entry_note`          | `text`        | Optional; excludes unnecessary sensitive data                              |
| `verification_status` | `text`        | `pending`, `verified`, or `rejected`                                       |
| `entered_by`          | `uuid`        | Required staff reference                                                   |
| `verified_by`         | `uuid`        | Optional staff reference; cannot equal `entered_by` by recommended default |
| `verified_at`         | `timestamptz` | Optional                                                                   |
| `rejection_reason`    | `text`        | Required when rejected                                                     |

### `contribution_adjustments`

| Column            | Type          | Rules                                |
| ----------------- | ------------- | ------------------------------------ |
| `id`              | `uuid`        | Primary key                          |
| `contribution_id` | `uuid`        | References `contributions(id)`       |
| `amount_minor`    | `bigint`      | Required signed, non-zero adjustment |
| `reason_code`     | `text`        | Approved reason code                 |
| `reason_detail`   | `text`        | Required                             |
| `status`          | `text`        | `pending`, `approved`, or `rejected` |
| `requested_by`    | `uuid`        | Required staff reference             |
| `requested_at`    | `timestamptz` | Required                             |
| `decided_by`      | `uuid`        | Optional; cannot equal requester     |
| `decided_at`      | `timestamptz` | Optional                             |
| `decision_note`   | `text`        | Required for rejection               |

Records are append-only after a decision.

### `refunds`

| Column               | Type     | Rules                                                                      |
| -------------------- | -------- | -------------------------------------------------------------------------- |
| `id`                 | `uuid`   | Primary key                                                                |
| `contribution_id`    | `uuid`   | References `contributions(id)`                                             |
| `amount_minor`       | `bigint` | Positive and no greater than refundable balance                            |
| `reason`             | `text`   | Required                                                                   |
| `status`             | `text`   | `requested`, `approved`, `rejected`, `submitted`, `completed`, or `failed` |
| `requested_by`       | `uuid`   | Required staff reference                                                   |
| `approved_by`        | `uuid`   | Optional; cannot equal requester                                           |
| `provider_refund_id` | `text`   | Optional unique reference                                                  |
| timestamp columns    |          | Request, decision, submission and completion times                         |

### `receipt_requests`

| Column              | Type          | Rules                                                         |
| ------------------- | ------------- | ------------------------------------------------------------- |
| `id`                | `uuid`        | Primary key                                                   |
| `contribution_id`   | `uuid`        | References `contributions(id)`                                |
| `status`            | `text`        | `requested`, `processing`, `issued`, `cancelled`, or `failed` |
| `requested_at`      | `timestamptz` | Required                                                      |
| `processed_by`      | `uuid`        | Optional staff reference                                      |
| `issued_at`         | `timestamptz` | Optional                                                      |
| `receipt_reference` | `text`        | Optional unique reference                                     |
| `delivery_email`    | `text`        | Optional and access-restricted                                |

Exact receipt fields remain subject to church accounting and legal confirmation.

### `payment_webhook_events`

| Column              | Type          | Rules                                           |
| ------------------- | ------------- | ----------------------------------------------- |
| `id`                | `uuid`        | Primary key                                     |
| `provider`          | `text`        | Required                                        |
| `provider_event_id` | `text`        | Required                                        |
| `event_type`        | `text`        | Required                                        |
| `payload_hash`      | `text`        | Required for integrity/debugging                |
| `processing_status` | `text`        | `received`, `processed`, `ignored`, or `failed` |
| `attempt_count`     | `integer`     | Required; non-negative                          |
| `received_at`       | `timestamptz` | Required                                        |
| `processed_at`      | `timestamptz` | Optional                                        |
| `error_code`        | `text`        | Optional non-sensitive code                     |

Unique constraint: (`provider`, `provider_event_id`). This provides webhook idempotency without retaining unnecessary raw payment payloads indefinitely.

## Audit and Operations

### `audit_logs`

Append-only business and security audit history.

| Column           | Type          | Rules                                                        |
| ---------------- | ------------- | ------------------------------------------------------------ |
| `id`             | `uuid`        | Primary key                                                  |
| `actor_staff_id` | `uuid`        | Optional for system/provider actions                         |
| `actor_type`     | `text`        | `staff`, `system`, or `provider`                             |
| `action`         | `text`        | Namespaced action code                                       |
| `resource_type`  | `text`        | Required                                                     |
| `resource_id`    | `uuid`        | Optional                                                     |
| `sensitivity`    | `text`        | `standard`, `personal`, `prayer`, `financial`, or `security` |
| `metadata`       | `jsonb`       | Redacted structured context only                             |
| `correlation_id` | `uuid`        | Groups related operations                                    |
| `created_at`     | `timestamptz` | Required                                                     |

Indexes:

- `created_at desc`
- (`actor_staff_id`, `created_at desc`)
- (`resource_type`, `resource_id`, `created_at desc`)
- (`sensitivity`, `created_at desc`)

No ordinary application role can update or delete audit rows.

### `notification_deliveries`

Tracks non-sensitive delivery state for transactional email notifications. It stores template code, recipient reference or masked destination, provider message ID, status, attempts and timestamps. Prayer text and financial details are prohibited from payload/log fields.

### `site_settings`

Stores validated non-secret site configuration such as church contact information and social links. Secrets remain in provider environment configuration, never in this table.

## Public Read Models

Public pages query restricted views rather than broad admin tables where practical:

- `published_pages`
- `published_ministries`
- `published_sermons`
- `published_announcements`
- `published_bulletins`
- `published_schedule_occurrences`

Views expose only approved fields and rows whose status is `published` and whose publication time has arrived. Staff identities, workflow notes, private locations and internal metadata are omitted.

Giving summaries use dedicated finance views:

- `giving_monthly_summary`
- `giving_yearly_summary`
- `giving_category_summary`

Pastoral summary permissions may read aggregates without gaining access to contributor identities or individual transactions.

## Authorization Helpers

Planned private functions:

- `private.current_staff_id()`
- `private.is_active_staff()`
- `private.has_permission(permission_code text)`
- `private.has_mfa_level(required_level text default 'aal2')`
- `private.can_read_prayer_request(request_id uuid)`
- `private.can_read_prayer_contact(request_id uuid)`
- `private.can_read_audit_sensitivity(level text)`

Security-definer functions must set a fixed `search_path`, validate the caller, expose the smallest necessary result, and have execute permissions explicitly restricted.

Role assignments are checked from database tables rather than trusting user-editable JWT metadata. This allows suspensions and permission changes to take effect reliably.

## Row Level Security Policy Plan

### Public Content

- Anonymous and authenticated visitors may select only currently published rows through approved public views/policies.
- No anonymous insert, update or delete is allowed on content tables.
- Staff draft access requires the relevant `content.*.manage` permission.
- Submit, approve and publish transitions use protected functions that check workflow rules.
- Approval and publication require both the generic workflow permission and the matching content-type management permission.
- Multimedia and Bulletin Heads therefore approve and publish only inside their teams' permitted content scopes.
- Self-approval additionally requires `content.self_approve`; it is granted to Multimedia and Bulletin Heads only within their matching content scope.
- Core Leader assignment is restricted to System Administrators, requires MFA, and creates a security audit event with actor and reason.

### Staff and Roles

- Staff may read their own basic profile.
- `staff.read` permits directory reads.
- Invitations, suspension and role changes require their exact management permissions plus MFA.
- A user cannot grant a permission they are not authorized to administer.
- The last active System Administrator cannot suspend themselves or remove their own final administrator role.

### Prayer

- Anonymous users cannot select prayer tables.
- Public submission occurs through a validated `submit_prayer_request` function.
- `prayer.read_team` permits `prayer_team` requests.
- `prayer.read_pastoral` permits both team and pastoral-only requests.
- Contact information additionally requires `prayer.contact.read`, follow-up consent and either pastoral access or an active assignment under the recommended policy.
- Updates cannot reduce privacy scope or rewrite earlier notes.
- Prayer exports are disabled unless `prayer.export` is explicitly granted.

### Giving

- Anonymous users cannot select giving tables.
- Checkout creation and payment confirmation use trusted server operations.
- `giving.summary.read` accesses aggregate views only.
- `giving.details.read` accesses transaction-level records.
- Contributor identity requires `giving.contributors.read` in addition to detail access.
- Offline verification, adjustments and refunds use protected transactional functions.
- Requesters cannot approve their own adjustment, refund or offline entry. Content self-approval does not weaken financial separation of duties.
- Confirmed original amounts and provider identifiers are immutable to ordinary updates.

### Audit

- Audit insertion occurs through trusted triggers/functions.
- Staff cannot directly update or delete audit records.
- Read access is filtered by sensitivity-specific permission.
- Prayer text, credentials and payment secrets are never audit metadata.

### Storage

- Public assets are readable only after their associated content is published.
- Uploads require the matching content or finance permission.
- Finance evidence is accessible only to explicitly authorized finance roles.
- Private submission files are not public even if someone knows the object path.

## Transaction Boundaries

The following operations must complete atomically:

- Creating content plus its initial revision.
- Submitting or approving a revision plus its review event and audit entry.
- Creating an offline contribution plus its offline detail.
- Verifying an offline contribution plus status update and audit entry.
- Approving an adjustment plus recalculating/reporting the effective balance.
- Completing a refund plus contribution-state update.
- Processing a payment webhook plus its idempotency record and contribution update.
- Assigning or closing a prayer request plus its update and audit event.

## Deletion and Retention

- Roles, permissions, confirmed contributions, adjustments, refunds, webhook idempotency records and audit logs are not casually hard-deleted.
- Staff accounts are suspended/disabled rather than deleting historical identity.
- Published content is archived; drafts may be deleted only under an approved policy.
- Prayer, contact and ministry-interest records receive a retention-review date.
- Personal data no longer needed for a legitimate purpose should be removed or anonymized under an approved process.
- Retention periods remain **To confirm** with church leadership and appropriate privacy/accounting advice.

## Migration Progress

Implemented in the preserved Supabase prototype:

1. Access control, seeded roles and permissions, audit foundation, and RLS helpers
2. Media metadata, core content records, revisions, reviewed publishing functions, and scoped read policies
3. MFA-protected administrator bootstrap, staff invitation registration, account activation, role changes, suspension, and final-administrator safeguards

Implemented for Cloudflare D1:

1. Staff profiles and exact Cloudflare Access subject mapping
2. Eleven approved roles, 64 permissions, and the approved role grants
3. Role assignments, append-only audit records, first-administrator bootstrap,
   Core Leader eligibility, and final-System-Administrator safeguards
4. Bound-query repository methods and a validated access-control service

Planned next:

1. Content-specific metadata for sermons, ministries, bulletins, and schedule occurrences
2. Prayer and engagement workflows
3. Giving and payment integration records
4. Notifications and operational audit additions
5. Public and financial summary views
6. Storage policies
7. Expanded constraint and RLS verification tests

## Open Database Decisions

- Exact giving-category seed data
- Receipt-required contributor fields
- Approved offline-giving methods
- Offline verifier and financial approver roles
- Refund thresholds and approval rules
- Prayer retention duration
- Contact and ministry-interest retention duration
- Pastoral-only prayer option confirmation
- Whether private prayer attachments will ever be required
- Bulletin archival and search requirements
