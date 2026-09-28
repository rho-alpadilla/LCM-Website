# ADR 0003: Staff Password Authentication and Recovery

- Status: Preview password deployment, Access bypass and initial administrator enrollment complete; Phase 6.5 role/recovery verification pending
- Date: 2026-09-22
- Supersedes: ADR 0001's Access-only authentication requirement for the target design
- Current runtime: Production remains Cloudflare Access-based. Preview uses website-managed password authentication behind a reversible Access bypass.

## Decision and Scope

Move toward individual staff usernames and passwords, administrator-created
accounts, and manual administrator-assisted recovery. Normal website login
must not depend on Google, an emailed code, or a paid email/SMS service.
Public visitors still need no account. Staff select no role at login: the
server uses their existing D1 role assignments.

Keep Next.js, Workers, D1, R2, all six roles, prayer confidentiality, retention,
public-content workflows, and the separate future ChMS boundary. This is not
authorization to delete staff records, weaken permissions, enable billing,
or remove the live Access protection before the replacement is verified.

The website will take responsibility for credentials, sessions, attack
protection and recovery previously delegated to Access. No implementation can
be guaranteed immune to hacking. Patching, account review, protected backups,
and secure administrator devices remain necessary after launch.

## Cost and Runtime Gate: Check Before Building the Full Workflow

Update, 2026-09-22: the [feasibility experiment](../STAFF_AUTH_FEASIBILITY.md)
rejected direct Worker hashing but found a viable free-tier candidate using an
internal SQLite-backed Durable Object and native scrypt. The deployed preview
contains that internal coordinator, D1 credential/session tables, a guarded
password-login endpoint and server-side session validation. Preview runs
`STAFF_AUTH_MODE=password` with isolated storage and synthetic release-test
accounts. Production remains `STAFF_AUTH_MODE=access`.

There is no required password-login licence or reset-email subscription in
this design. That does not prove the workload fits free hosting.

Cloudflare currently documents a **10 ms CPU limit per HTTP request on Workers
Free**. Password hashing is deliberately expensive. A local Node.js benchmark
or successful development login does not establish hosted Free compatibility.
The current account's actual plan and available limits must also be verified.
See [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).

Before choosing a dependency or changing authentication:

1. Test a maintained password-hashing implementation in the deployed Workers
   runtime using synthetic credentials and an isolated preview. Prefer
   Argon2id at least 19 MiB, two iterations and parallelism one. A justified
   PBKDF2-HMAC-SHA-256 alternative must support at least 600,000 iterations;
   verify the runtime's actual support rather than assuming Web Crypto parity.
2. Record library/runtime versions, parameters, Worker CPU, memory, errors,
   and end-to-end latency for creation, successful verification, incorrect
   passwords and bounded concurrent attempts. Include the complete handler,
   not just the hashing operation. Use a supported free configuration with
   headroom; occasional CPU-limit tolerance is not a capacity guarantee.
3. Check D1 request/storage usage and cleanup costs for sessions, rate limits
   and audit events. Verify what happens when any free quota is exhausted.
4. Record a pass/fail result. If secure settings cannot fit the zero-budget
   requirement, stop this migration and present a verified alternative for
   approval. Do not reduce the security settings, silently purchase capacity,
   or switch database/authentication providers.

Hashing parameters follow the
[OWASP password-storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

## Simple Staff Experience

| Task                  | Target behavior                                                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add staff             | System Administrator enters name, username, current required contact details and a role. Elevated-role reasons remain required.                                                             |
| First sign-in         | Administrator privately hands over a chosen temporary password. Staff may reach their role-specific dashboard for three days, with a centered personal-password reminder they can postpone. |
| Normal sign-in        | Username and password on `/admin/login`, followed by the existing role-specific dashboard.                                                                                                  |
| Forgot password       | Page explains how to contact the church's System Administrator; it does not pretend to send email.                                                                                          |
| Reset another account | Administrator verifies the person through a known channel, reauthenticates, records a reason and chooses a replacement temporary password.                                                  |
| Change own password   | Staff proves their current password, chooses a new one, and signs in again.                                                                                                                 |
| Suspend staff         | Access and sessions are invalidated immediately; suspension does not depend on another provider update.                                                                                     |

Temporary passwords are random, displayed once and never recoverable from
storage. Generate a new one if the handover fails. Do not distribute them in
group chats, screenshots, repository files or support logs. The administrator
cannot see the staff member's eventual personal password.

Keep the existing email field as contact data during migration. It is not
proof of ownership and must never automatically claim or merge an account.

## Proposed Engineering Defaults

These are implementation defaults, not claims about existing functionality:

- Usernames: unique canonical lowercase ASCII, 3–64 characters, with a narrow
  allowed character set. Display names remain separate. No shared accounts.
- Personal passwords: 15–128 Unicode characters, spaces permitted, no silent
  trimming or truncation, and a common-password blocklist. Support password
  managers and paste. Do not require arbitrary periodic password changes.
- Temporary setup password: expires after three days. It grants the normal
  role-specific dashboard session and a persistent, dismissible password-change
  reminder. At expiry, the account is disabled, all sessions are revoked and a
  System Administrator must verify identity before reactivation. Recovery
  passwords remain limited to 30 minutes. Password replacement is atomic and
  invalidates other sessions.
- Sessions: expire after 30 minutes idle or eight hours total, whichever comes
  first. Sensitive account/security changes require authentication within the
  preceding five minutes. No persistent “remember me” in the first version.
- Recovery: maintain two named, trusted System Administrators before cutover.
  Existing last-administrator protections remain. A locked-out administrator
  must be recovered by another administrator, not through an unauthenticated
  self-reset form.

Password defaults are informed by
[OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

## Security Requirements

### Credentials, Sessions and Authorization

Use a reviewed, maintained implementation of standard cryptography; no custom
password algorithm. Store only salted, versioned password hashes. Passwords,
temporary credentials and session tokens must not enter logs, analytics,
notifications or Git. Bound request sizes before expensive work.

Use cryptographically random opaque session tokens (at least 32 random bytes),
store only their digests in D1, and send them only in HTTPS `Secure`, `HttpOnly`,
`SameSite` cookies. Production cookies use a `__Host-` name, `Path=/` and no
`Domain`. Local loopback development uses a separate non-`__Host-` cookie name
because browsers correctly require `Secure` for the production prefix. Do not store
bearer credentials in browser local storage or URLs. See
[OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

Check live staff status, session expiry/revocation and D1 permissions at every
protected server boundary, including actions, API routes and private media.
Login creates a fresh session; changing/resetting passwords, suspending an
account or changing roles invalidates existing sessions. Prevent concurrent
login/reset races from restoring access using an old credential version.

All mutations, including login and recovery, need CSRF protection and strict
origin checks against configured trusted origins. Allow only safe local return
paths. Private responses must not enter shared caches. Preserve parameterized
SQL, input validation, XSS defenses and existing file-delivery restrictions.

### Guessing, Abuse and Recovery

Apply atomic server-side limits per username, per source and across the login
service before hashing. Counters must work across Worker instances, expire,
and have bounded storage. Do not rely on process memory or permanent account
lockouts that attackers can trigger. Configure and test concrete thresholds
using shared-church-network scenarios during the feasibility stage.

Unknown usernames, wrong passwords and suspended accounts receive generic
responses with comparable processing paths after rate limiting. Authentication
or limiter failures deny access. CAPTCHA, if added, supplements these controls;
it must not introduce an undeclared domain dependency or paid requirement.

Manual reset is a high-trust operation: someone able to reset a Pastor's
password can potentially impersonate that Pastor even though System
Administrators cannot normally read prayers. Require verified handover,
recent authentication, a reason, audit events and a non-sensitive security
notification to the affected user. A reset never changes roles or suspension.
Unauthenticated “forgot password” visits must not invalidate anyone's account.
See [OWASP recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

For total administrator lockout, document an owner-operated recovery command
requiring authenticated infrastructure access and a recorded recovery reason.
It must produce a short-lived setup credential and audit record, not expose a
public bootstrap endpoint, a master password or a permanent bypass secret.

**Additional recommendation, not yet an approved requirement:** phishing-resistant
passkeys or authenticator-app MFA for privileged accounts. Password-only login
and manual recovery remain vulnerable to phishing, device compromise and
social engineering. Decide this before accepting real sensitive data under
the new login; MFA also needs a tested recovery process.

### Threat Review and Acceptance Evidence

| Threat                                          | Required evidence before cutover                                                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Guessed/reused passwords and compute exhaustion | Generic errors, bounded requests, cross-instance rate limits, quota-failure tests and deployed hashing measurements.                             |
| Stolen session or forged request                | Secure cookies, CSRF rejection, session rotation, expiry, logout and reset/revocation race tests.                                                |
| Role escalation or private-data exposure        | Direct API/action/media allow/deny tests for every role, including pastoral-only prayers and contact reveal.                                     |
| Stolen temporary password or replay             | Three-day expiry, server-side expiry enforcement, immediate session revocation on disable, reactivation audit records and password-change tests. |
| Recovery impersonation                          | Administrator-only reset, recent authentication, verified handover, audit and second-administrator recovery rehearsal.                           |
| Account takeover during migration               | Existing staff IDs/roles retained; no email-only claim, public first-admin creation or automatic fallback to Access.                             |
| Secret leaks or database compromise             | Password hashes only; token digests only; log redaction, ignored secret files, dependency review and restricted backups.                         |

## Code and Database Boundaries

Reuse the current structure rather than adding another app or reorganizing it:

- `src/app/admin/`: thin login/setup/profile routes; the existing
  `/admin/set-password` and `/admin/mfa` pages currently only redirect.
- `src/frontend/`: forms, clear account states and staff recovery controls.
- `src/backend/auth/`: one canonical authenticated-principal/session resolver,
  used by both `staff-context.ts` and `staff-authentication.ts` callers.
- `src/backend/security/`: hashing, token and rate-limit primitives.
- `src/backend/services/`: enrollment, login, reset and revocation transactions.
- `src/backend/repositories/`: parameterized D1 access only.
- `src/backend/actions/` and `http/`: validation, CSRF and permission boundaries.
- `migrations/d1/` and existing test locations: forward migrations and regression tests.

Add credential, session, restricted setup/recovery and expiring abuse-counter
records keyed to existing staff IDs. Define uniqueness, expiry, consumed/revoked
state and foreign-key constraints. Reuse the append-only audit trail for
security mutations without storing secret values; bound high-volume failure
telemetry separately so attacks cannot fill the permanent audit store.

Migration blockers found in the current schema must be handled explicitly:

1. `staff_profiles.access_subject` is mandatory and unique. Password-only
   accounts use the explicitly namespaced internal value `password:<staff-id>`;
   it is never treated as or accepted as a Cloudflare subject. This preserves
   every existing staff ID, Access mapping and referencing foreign key without
   rebuilding the table.
2. Staff-creation and invitation-acceptance triggers currently depend on pending
   email invitations and Access provisioning readiness. Replace only the
   provider-specific conditions with explicit password-enrollment guards;
   never mark every pending invitation “ready” to bypass them.
3. Bootstrap, last-administrator, elevated-role-reason and immutable audit
   guards must survive schema changes. The completed bootstrap stays completed.
4. A new administrator-only credential-reset permission must be seeded without
   widening other roles. Ordinary staff can change only their own password.

## Implementation Order and Release Gates

1. **Feasibility:** complete the cost/runtime gate and choose the supported
   hashing library. No live authentication changes during this test.
2. **Foundation:** migrations, credential/session repositories, services and
   transaction tests using synthetic data. Verify schema integrity and all
   historical guards on both fresh and existing databases.
3. **Workflow:** login, restricted first setup, manual resets, profile password
   change and staff creation. Test real password authentication locally and in
   the isolated preview. The local synthetic administrator helper does not
   substitute for testing a password session.
4. **Preview verification:** dedicated preview data/storage and explicit auth mode.
   Password mode must reject missing sessions and ignore spoofed Access headers.
   Never silently try a second authentication method after failure. Exercise
   direct routes without an upstream Access session, including all six roles.

The password-authentication preview is the normal `preview` Worker environment.
It uses `lcm-website`, `lifechangers-ministry-preview`, and
`lifechangers-ministry-preview-files`; it has no Cloudflare Access enforcement
on `/admin*` and uses website-managed password sessions instead. It must receive
a unique `STAFF_AUTH_RATE_LIMIT_SECRET` as a Worker secret before deployment.
The earlier isolated authentication experiment was retired after this workflow
was verified.

5. **Recovery and migration rehearsal:** preserve staff IDs and audit history;
   verify the administrator identities and enroll them through the existing
   authenticated setup or controlled owner recovery. No email-only account
   claiming. Test backup restoration and both administrator-recovery cases.
6. **Preview cutover:** verify the exact preview environment, back up securely,
   apply tested remote migrations before deploying dependent code, enroll two
   trusted administrators, and use a reversible bypass only on the target
   preview Access application. Require fresh sign-in after the switch.
7. **Production decision:** separately approve either continued Access login or
   a password-authentication cutover before changing production. Do not change
   unrelated Access applications.
8. **Cleanup:** after validation, remove obsolete Access provisioning UI,
   integration calls and website-only secrets/configuration. Preserve historical
   migrations and audit records; update current-operation documentation.

Run formatting, lint, typecheck, unit/transaction tests, E2E/accessibility tests,
Next production build and OpenNext build before release. Regress public content,
prayer retention, private media, inquiries and giving; auth changes do not
authorize changes to those workflows. Test mobile keyboards, password-manager
autofill, paste, focus/errors and session-expiry behavior.

Rollback must restore the scoped Access gate before reverting to a tested
Access-authentication build. Keep database changes forward-compatible through
the rollout; never restore an old database merely to undo login code, as that
could undo suspensions or lose new records. Password-only staff will be unable
to use an Access rollback until explicitly provisioned there; document this
limitation and preserve a verified administrator recovery path.

## Completion Record

Planning, the isolated hashing experiment, the password foundation and the
local workflow are complete. See the
[measurements and limitations](../STAFF_AUTH_FEASIBILITY.md). The direct Worker
approach failed; the Durable Object/native-scrypt approach passed its limited
synthetic tests. The foundation uses 16 deterministic internal coordinator
shards, bounded expiring rate keys, generic denied responses and no public
hashing route. The workflow provides role-safe staff creation,
restricted first-password setup, administrator-assisted resets, self-service
password changes, session revocation and append-only audit records. Isolated
remote preview security tests, a private D1 backup, the forward password
migrations, initial preview administrator enrollments and the preview Worker
deployment are complete. The preview Access policy is now a reversible bypass,
so password sign-in is reachable and operational. Phase 6.5 still requires
documented synthetic role checks and a recovery rehearsal before the preview
release candidate is signed off. Production is unchanged; do not label password
authentication production-live yet.
