# ADR 0001: Cloudflare Zero-Subscription Platform

- Status: Accepted
- Date: 2026-09-10

## Context

Lifechangers Ministry Incorporated requires the website to operate without a
recurring platform subscription during its initial stage. The church accepts
the annual domain renewal, approved legal/IP costs, and unavoidable transaction
fees charged by a future online-giving provider.

The repository already contains a Next.js foundation and a Supabase-based staff
authentication and authorization prototype. Supabase Free is capable, but its
inactive-project pausing does not fit the desired operating model.

## Decision

Use the following production target:

- Next.js, React, and TypeScript for the application.
- Tailwind CSS for the reusable visual system.
- Cloudflare Workers with OpenNext for hosting and trusted server execution.
- Cloudflare D1 for relational data using version-controlled migrations.
- Cloudflare Access for staff authentication and protection of `/admin`.
- D1-backed roles and permissions, enforced by trusted server services before
  every protected database operation.
- Cloudflare R2 Standard for approved files, subject to strict application
  quotas, file validation, and usage monitoring.
- Cloudflare Turnstile on public submission forms.
- Facebook or YouTube embeds for sermon videos.
- Dashboard-based notifications at launch; outbound email is deferred until a
  suitable no-cost integration is approved.

Public visitors will never need an account. Staff access will use individual,
allowlisted email identities. Shared keys and application-managed passwords are
not permitted.

## Cost Guardrails

- Keep the Workers account on the Free plan until church leadership explicitly
  approves an upgrade.
- Do not enable a paid usage path merely to avoid a free-tier failure.
- Cache public pages and media metadata to minimize Worker and D1 operations.
- Enforce file-size, storage-total, and upload-frequency limits before enabling
  staff uploads to R2.
- Host no sermon video files in R2.
- Monitor Worker, D1, Access, and R2 usage and document their current limits at
  deployment time.
- Treat a limit-exceeded response as an operational incident with a friendly
  user-facing fallback, not as permission to incur charges.

## Consequences

### Benefits

- No planned monthly platform subscription within the approved free limits.
- No database inactivity pause.
- One provider supplies hosting, database, access control, bot protection, and
  file storage.
- The existing frontend language and framework are preserved.
- A later Cloudflare paid-plan upgrade does not require a frontend rewrite.

### Trade-offs

- D1 uses SQLite rather than PostgreSQL.
- D1 does not provide Supabase Row Level Security or Supabase Auth; permission
  enforcement moves into trusted server services and must be tested thoroughly.
- The current Supabase authentication UI, migrations, and server helpers cannot
  be used unchanged.
- R2 usage above its free allowance can be billable if billing is enabled, so
  application quotas are mandatory.
- Provider free plans and limits may change, so they must be reviewed before
  production launch and during periodic maintenance.

## Migration Rule

The Supabase prototype remains in place until equivalent Cloudflare behavior is
implemented and verified. Removal of the old implementation is a separate,
explicitly reviewed step after all migration exit criteria pass.

## References

- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare Access email PIN: https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/
- Cloudflare Access plans: https://www.cloudflare.com/sase/products/access/
- Supabase Free project pausing: https://supabase.com/docs/guides/platform/free-project-pausing
