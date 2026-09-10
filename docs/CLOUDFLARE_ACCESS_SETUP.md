# Cloudflare Access Setup

## Status

The application-side Access verifier, D1 invitations, first-login activation,
role administration, suspension, and audit writes are implemented and tested
locally. Provider activation is intentionally pending because the church does
not yet own its domain. The blank values in `wrangler.jsonc` are labeled
configuration slots, not working credentials.

## What Access Protects

Create a self-hosted Access application that covers both the parent routes and
their descendants:

- `<church-domain>/admin`
- `<church-domain>/admin/*`
- `<church-domain>/api/admin`
- `<church-domain>/api/admin/*`

The public website must remain outside this Access application.

## Initial Policy

Use an Allow policy containing only the exact email address of the approved
first System Administrator. Do not use either of these broad Include rules:

- `Everyone`
- `Login Methods: One-time PIN` without an exact email restriction

After the first administrator is bootstrapped, add each approved staff email
individually. A matching Access login proves identity only; D1 roles and
permissions still decide what that person may do inside the administration area.

## Configuration Values

After the Access application exists, copy these non-secret values into the
matching preview or production `vars` block in `wrangler.jsonc`:

- `ACCESS_TEAM_DOMAIN`: the complete HTTPS team origin, such as
  `https://your-team.cloudflareaccess.com`
- `ACCESS_AUD`: the Application Audience tag for this Access application

Keep preview and production application audience values separate. Regenerate
types and run the complete verification suite after changing Wrangler config.

## Bootstrap Procedure

1. Add only the approved first administrator's exact email to the Access policy.
2. Sign in through Cloudflare Access.
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
