# Cloudflare Access Runbook

## Purpose and Current State

This document is the Access runbook for the eventual production login and for
a password-preview rollback. It is **not** the normal preview staff onboarding
guide.

The current preview Worker uses website-managed username/password sessions at
`/admin`. Its former preview Access application is deliberately set to a
reversible bypass so the password screen is reachable. Production still uses
`STAFF_AUTH_MODE=access` and must not be changed without explicit leadership
approval and a tested production cutover.

Use [ADMIN_OPERATIONS.md](ADMIN_OPERATIONS.md) for current staff account,
password, recovery and suspension procedures. Use
[ADR 0003](decisions/0003-staff-password-authentication.md) for the security
decision and rollback conditions.

## If Production Uses Cloudflare Access

Protect only the production `/admin*` destination. The public website and
public API routes must remain outside the Access application.

Create one dedicated **Allow** policy containing only exact, approved staff
email addresses. Never use a broad `Everyone` rule or an unrestricted login
method rule. Access proves identity only; the website's D1 roles and server-side
permissions still decide what the person can do after sign-in.

Use a production-only Access application, audience value and API token. Keep
all secrets in Cloudflare Worker secrets, not in `wrangler.jsonc`, source files,
screenshots or messages. The preview and production values must never be shared.

## Required Verification

- Missing, invalid or expired Access assertions fail closed with `401`.
- Unknown, suspended or disabled staff fail with `403`.
- A valid staff identity still receives only its D1-assigned role permissions.
- Protected responses use private, no-store caching.
- The final active System Administrator cannot be suspended or lose that role.
- No actual prayer, contact, payment or credential data is used while testing.

## Password-Preview Rollback

If a password-preview release must be rolled back, restore the scoped preview
Access rule first, then roll back only to a previously verified Access-auth
Worker version. Do not replace a scoped policy with a broad allow rule and do
not restore an older database merely to undo authentication code: that could
erase newer suspensions or audit history.

Password-only staff cannot use an Access rollback unless they were separately
provisioned in that Access policy. Keep two trusted System Administrators and a
tested recovery path before altering authentication.
