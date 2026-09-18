# Phase 6 Public Outreach Completion

## Status

Implemented in the codebase on 2026-09-19. The pages, workflows, local D1
migration and automated coverage are ready. Public Contact and Join a Ministry
submissions remain deliberately disabled on the deployed preview until
Turnstile is configured for a church-controlled domain.

## Delivered Public Experience

- `/about` presents the approved vision, mission, goal, passion, LIFETEAM core
  values and Acts 2:46–47 ministry verse.
- `/contact` publishes the confirmed address, phone, email and Facebook link,
  then provides a protected contact form.
- `/join` provides a Ministry Interest form that can select a published
  ministry or ask for help choosing one. Ministry cards and details link to it.
- `/activities` now includes a responsive, keyboard-operable monthly planner
  based on the existing published recurring-schedule expansion. Its detailed
  list remains available below the planner.
- Public navigation, footer, home calls to action and page-introduction design
  were made consistent and responsive. The header uses the church-provided
  `public/brand/lcm-mark.png` asset.

## Inquiry Workflow and Privacy Boundary

One reusable form component and one `visitor_inquiries` D1 workflow support
both Contact and Ministry Interest requests. This avoids separate copies of
the same personal-data handling code while retaining type-specific permissions.

1. A visitor supplies a name, one preferred follow-up channel and explicit
   follow-up consent. A Contact message is required; a ministry note is
   optional.
2. A same-origin handler limits request size, applies a dedicated rate limit,
   verifies Turnstile with action `visitor_inquiry`, and returns a generic
   response.
3. Only Pastors and Core Leaders with the matching `contact.*` or
   `ministry_interest.*` permissions can open, assign, update or close an
   inquiry. System Administrators, Content roles and Prayer Warriors have no
   inquiry access.
4. Detail views and mutations are audited without copying visitor messages or
   contact values into audit metadata.
5. Recording follow-up does **not** send email or SMS. Staff contact visitors
   using the approved church channels, then record the result in the dashboard.

## Provisional Retention Assumption

The code redacts visitor name, email, phone, original message and staff notes
90 days after an authorized staff member closes an inquiry. D1 guards prevent
direct deletion, restoring redacted data, or early redaction. The daily Worker
cron performs bounded retention batches alongside prayer retention.

This is a deliberately explicit privacy assumption, not a confirmed church
policy. Leadership must confirm or revise this period before Turnstile is
enabled and the public forms begin accepting real submissions.

## Verification

- local D1 applied `0018_public_inquiries.sql` successfully;
- unit and component tests cover permission allow/deny behavior, assignment,
  90-day closure retention, bounded cleanup and accessible form controls; and
- the full existing test suite remains green using synthetic data only.

## Remaining Launch Work

1. Confirm the public-inquiry retention period.
2. Configure a church-owned domain in Cloudflare.
3. Create a production Turnstile widget with the final hostname, store its
   secret as a Worker secret, and enable form submission.
4. Test Contact and Ministry Interest submissions on the final preview/domain
   with synthetic data, then perform the production readiness review.
