# Cloudflare Access Setup

## Status

The application-side Access verifier, recoverable D1 staff provisioning,
automatic first-login activation, role administration, suspension, and audit
writes are implemented and tested. Preview Access is active on the temporary
`workers.dev` hostname. Production Access remains intentionally unconfigured
until the church owns its final domain and completes production cutover.

## What Access Protects

The active preview self-hosted application protects the staff route and its
descendants:

- `https://lcm-website.dabsco-needlepoint-studio.workers.dev/admin*`

This includes the `/admin` landing page and all admin pages and Server Actions.
The public website remains outside this Access application. Existing
`/api/admin/*` handlers independently require a valid Access assertion and
therefore fail closed when used outside an Access-protected request; they are
not public browser entry points.

## Managed Staff Policy

Create one dedicated reusable Allow policy for the website staff directory. It
must contain only exact email Include rules, starting with the first System
Administrator. Do not add other Include rule types and do not use either of
these broad Include rules:

- `Everyone`
- `Login Methods: One-time PIN` without an exact email restriction

Attach this policy only to the LCM staff Access application. The Worker updates
its exact-email list when a System Administrator creates or suspends a staff
account. A matching Access login proves identity only; D1 roles and permissions
still decide what that person may do inside the administration area.

## Preview Sign-in Method

The preview application accepts only Cloudflare Access **One-time PIN** login
and redirects directly to its email-code form. It does not offer Cloudflare
account login. This lets approved church staff authenticate with their existing
email address without being added to the Cloudflare account.

The exact-email Allow policy remains the access boundary: enabling One-time PIN
must never be paired with a broad `Everyone` or unrestricted `Login Methods`
Include rule.

## Configuration Values

The preview app's non-secret values are recorded in the preview `vars` block
of `wrangler.jsonc`:

- `ACCESS_TEAM_DOMAIN`: `https://muddy-queen-9afb.cloudflareaccess.com`
- `ACCESS_AUD`: the preview application's Audience tag
- `CLOUDFLARE_ACCESS_ACCOUNT_ID`: the Cloudflare account ID for the Access API
- `CLOUDFLARE_ACCESS_POLICY_ID`: the dedicated reusable staff policy ID

Keep preview and production application audience values separate. The
production values remain blank until a distinct production Access application
exists. Set `CLOUDFLARE_ACCESS_API_TOKEN` as a Worker secret, never as a
`wrangler.jsonc` value or local source file. The token needs the Cloudflare
`Access: Apps and Policies Write` permission for this account. Configure
separate IDs and secrets for preview and production. Regenerate types and run
the complete verification suite after changing Wrangler config.

## Bootstrap Procedure

1. The preview Allow policy contains only the approved first administrator's
   exact email. Do not version staff email addresses in this repository.
2. Open the deployed preview `/admin` URL, enter that email address, and use
   the one-time code sent by Cloudflare Access.
3. Submit the administrator display name and documented setup reason to the
   protected bootstrap operation.
4. Confirm the new D1 profile has the `system_admin` role and an audit record.
5. Confirm a second bootstrap attempt is denied.
6. Connect the dedicated reusable staff policy before creating additional staff
   accounts from the LCM dashboard.

## Staff Account Procedure

1. A permitted administrator enters the person's exact email, display name,
   role, and any required assignment reason in **Staff & access**.
2. The website first records a pending account with a visible sign-in setup
   state, then adds the email to its dedicated Access policy. It does not claim
   to send email because outbound email is not part of the no-cost launch scope.
3. If Cloudflare rejects or cannot reach the policy, the pending account stays
   visible as **secure sign-in needs attention**. Correct the connection and use
   **Retry secure sign-in setup**; do not create a duplicate account.
4. When the state is ready, the administrator shares the protected admin
   address with the staff member.
5. The staff member signs in with the One-time PIN sent to that email address.
6. The verified first sign-in activates the D1 staff profile, assigns the
   approved role, and appends an audit event in one transaction. There is no
   separate activation button.

Suspending a person removes their email from the managed Access policy and
blocks D1 authorization. Do not manually edit that policy for ordinary staff
changes; use the website dashboard instead.

The D1 transaction and database trigger protect against two people completing
bootstrap simultaneously.

## Verification Checklist

- Missing assertion header returns `401`.
- Invalid signature, issuer, audience, algorithm, expiry, or required identity
  claim returns `401` without exposing verification internals.
- Unknown, suspended, or disabled staff returns `403`.
- A valid active staff member without the required permission returns `403`.
- Valid active staff with `admin.access` may read the protected session endpoint.
- Protected responses use `private, no-store` caching.
- Bootstrap rejects cross-origin requests and oversized or invalid JSON.
- A pending account activates only for the exact verified email.
- Duplicate staff accounts are rejected.
- System Administrator and Core Leader creation require a documented reason.
- The final active System Administrator cannot be suspended or lose that role.

## Rollback

If Access configuration fails during first deployment, roll back the Worker to
the previous verified version or remove the incorrect Access application paths.
Do not replace the policy with a broad allow rule as a troubleshooting shortcut.
