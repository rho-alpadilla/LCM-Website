# Cloudflare Access Setup

## Status

The application-side Access verifier, D1 invitations, first-login activation,
role administration, suspension, and audit writes are implemented and tested.
Preview Access is active on the temporary `workers.dev` hostname. Production
Access remains intentionally unconfigured until the church owns its final
domain and completes production cutover.

## What Access Protects

The active preview self-hosted application protects the staff route and its
descendants:

- `https://lcm-website.dabsco-needlepoint-studio.workers.dev/admin*`

This includes the `/admin` landing page and all admin pages and Server Actions.
The public website remains outside this Access application. Existing
`/api/admin/*` handlers independently require a valid Access assertion and
therefore fail closed when used outside an Access-protected request; they are
not public browser entry points.

## Initial Policy

Use an Allow policy containing only the exact email address of the approved
first System Administrator. Do not use either of these broad Include rules:

- `Everyone`
- `Login Methods: One-time PIN` without an exact email restriction

After the first administrator is bootstrapped, add each approved staff email
individually. A matching Access login proves identity only; D1 roles and
permissions still decide what that person may do inside the administration area.

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

Keep preview and production application audience values separate. The
production values remain blank until a distinct production Access application
exists. Regenerate types and run the complete verification suite after changing
Wrangler config.

## Bootstrap Procedure

1. The preview Allow policy contains only the approved first administrator's
   exact email. Do not version staff email addresses in this repository.
2. Open the deployed preview `/admin` URL, enter that email address, and use
   the one-time code sent by Cloudflare Access.
3. Submit the administrator display name and documented setup reason to the
   protected bootstrap operation.
4. Confirm the new D1 profile has the `system_admin` role and an audit record.
5. Confirm a second bootstrap attempt is denied.
6. Begin adding additional approved staff emails individually.

## Staff Invitation Procedure

1. A permitted administrator records the person's exact email, display name,
   initial role, and any required assignment reason in **Staff and roles**.
2. The website stores a pending D1 invitation. It does not claim to send an
   email because outbound email is not part of the no-cost launch scope.
3. A System Administrator adds that same exact email to the Access Allow policy
   and tells the person to open the protected admin address.
4. Access verifies the person. The website then shows the pending role before
   the person confirms activation.
5. Activation creates the staff profile, assigns the approved role, closes the
   invitation, and appends an audit event in one D1 transaction.

Removing a person from D1 blocks application authorization immediately. Remove
their email from the Access policy as a second provider-side revocation step.

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
- A pending invitation activates only for the exact verified email.
- Duplicate invitations and direct Core Leader invitations are rejected.
- Core Leader assignment requires an existing Leader role and a documented
  reason.
- The final active System Administrator cannot be suspended or lose that role.

## Rollback

If Access configuration fails during first deployment, roll back the Worker to
the previous verified version or remove the incorrect Access application paths.
Do not replace the policy with a broad allow rule as a troubleshooting shortcut.
