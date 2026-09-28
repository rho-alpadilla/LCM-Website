# Phase 6.5 Release Candidate Checklist

## Purpose

Use this checklist to verify the current preview release before treating it as
the church website's stable testing baseline. It covers the public experience,
six staff roles and password lifecycle. It does not authorize a domain,
Turnstile, PayMongo, production deployment or real visitor data.

**Testing rule:** use synthetic accounts and synthetic content only. Do not
enter real prayer requests, visitor contact details, payment details or staff
passwords in test records.

## Automated Release Gate

- [ ] `pnpm format:check` passes.
- [ ] `pnpm lint` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes.
- [ ] `pnpm test:e2e` passes, including accessibility coverage.
- [ ] The preview Worker is deployed only after the matching migrations are
      applied to its isolated preview D1 database.

## Public Website Check

- [ ] Visit the preview home page in light and dark themes. Text, controls,
      images and focus states remain readable.
- [ ] Confirm the header grouping is clear: Our Church, Get Connected, Sermons,
      Prayer, Resources and Give. Check keyboard navigation and a narrow mobile
      screen.
- [ ] Open About, Sermons, Ministries, Calendar, Announcements, Bulletins,
      Resources, Contact, Join a Ministry, Prayer and Give.
- [ ] Published content appears publicly; drafts, archived items and private
      schedule locations do not.
- [ ] Contact and Join a Ministry clearly show that submission is unavailable
      until Turnstile is configured for the final church domain.
- [ ] Give does not accept real payments. It must show the provider-launch
      state unless a separately approved PayMongo test setup is active.

## Password and Session Check

- [ ] A System Administrator signs in using a password account with no
      Cloudflare Access prompt.
- [ ] A new synthetic account can sign in with its temporary password and sees
      the three-day personal-password reminder. Dismissing the reminder does
      not remove the deadline.
- [ ] The staff member can set a personal password, then must sign in again.
- [ ] Incorrect usernames, incorrect passwords and suspended accounts receive
      the same generic denial message.
- [ ] Logging out invalidates the session. A password reset, role change or
      suspension invalidates existing sessions.
- [ ] A System Administrator can issue a new temporary password only after
      confirming their own password and recording the required reason.
- [ ] Letting a temporary-password account pass its deadline disables it until
      an administrator verifies the person and reactivates password setup.

## Role Check

Create one disposable account for each role. Use the
[permission matrix](PERMISSION_MATRIX.md) as the source of truth.

| Role                 | Confirm allowed                                                                                    | Confirm denied                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| System Administrator | Create/suspend staff, assign roles, reset passwords, revoke sessions and review security metadata. | Prayer text, prayer contacts and visitor inquiry content.               |
| Pastor               | Manage/approve allowed content; handle all prayer scopes and visitor inquiries.                    | Staff credentials, role changes and system administration.              |
| Core Leader          | Same approved website operations as Pastor.                                                        | Staff credentials and role changes.                                     |
| Content Publisher    | Create, review, self-approve, publish and archive permitted content.                               | Prayer, inquiry, staff-security and system settings access.             |
| Content Editor       | Create and submit allowed content.                                                                 | Approval, publishing and archival controls.                             |
| Prayer Warrior       | Work only on assigned team prayer requests.                                                        | Pastoral-only prayers, visitor inquiries, staff and content management. |

For every denial, try the direct URL after signing in. A hidden menu is not a
security test; the server must deny the request.

## Recovery and Audit Check

- [ ] Reset a synthetic staff password after a verified handover; confirm the
      reset creates an audit event without storing the password.
- [ ] Suspend and reactivate a synthetic account; confirm its old session no
      longer works.
- [ ] Confirm no audit, notification, browser console or server error contains
      a password, session token, prayer text, visitor message or provider secret.
- [ ] Confirm at least two trusted System Administrators exist before any
      production authentication decision.

## Sign-off Template

This template deliberately has no pre-filled people, passwords or dates.

- Preview URL/version reviewed:
- Automated checks reviewed by:
- Manual role checks reviewed by:
- Recovery rehearsal reviewed by:
- Issues to resolve before the next phase:

## Deferred Launch Decisions

- Church-owned domain and registrar.
- Production authentication decision: retain Cloudflare Access or approve a
  separate password-authentication cutover.
- Turnstile hostname/secret and real Contact/Join submissions.
- PayMongo test/live account, webhook and real giving activation.
- Leadership confirmation of the 90-day Contact/Ministry Interest retention
  period.
