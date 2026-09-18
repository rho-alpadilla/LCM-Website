# Lifechangers Ministry Incorporated Website Architecture

## Status

Cloudflare-first architecture approved. The website/ChMS separation was
accepted on 2026-09-17 in
`docs/decisions/0002-separate-website-and-chms-boundaries.md`.

This repository is the public outreach website plus its protected content,
prayer, contact, and staff-operations dashboard. It is not the church's member
management or bookkeeping system.

## System Context

```mermaid
flowchart LR
  Visitor[Public visitor] --> Website[Next.js website on Cloudflare Workers]
  Staff[Website staff] --> Access[Cloudflare Access]
  Access --> Website
  Website --> D1[(Website D1)]
  Website --> R2[(Private R2)]
  Website --> Turnstile[Cloudflare Turnstile]
  Website --> Media[Facebook / YouTube]
  Website --> PayMongo[PayMongo Hosted Checkout]
  Office[Future office staff] --> ChMS[Separate future ChMS]
  ChMS --> ChMSData[(Separate ChMS data)]
```

There is no shared database, secret set, storage bucket, or Access application
between the website and future ChMS. Any later exchange requires an approved,
authenticated API or controlled export/import contract.

## Technology

- Next.js App Router, React, strict TypeScript and Tailwind CSS
- Cloudflare Workers through OpenNext
- D1 for website relational data and R2 for approved private files
- Cloudflare Access for staff identity; D1 roles for application authorization
- Turnstile plus rate limits for public prayer submissions
- Vitest/Testing Library for unit and component tests; Playwright for E2E
- PayMongo Hosted Checkout for one-time giving, with secrets stored as Worker
  secrets and verified webhooks as the only trusted payment status

The initial target is Cloudflare's free tiers. The domain and payment-provider
transaction fees are expected external costs. Paid Cloudflare capacity should
be a configuration upgrade, not an application rewrite.

## Application Boundaries

```text
src/app                  Thin route entries, metadata and layout/error boundaries
src/frontend/screens     Public and admin screen presentation
src/frontend/components  Reusable UI, including explicit client components
src/frontend/lib         Display formatting
src/backend/actions      Next.js server actions
src/backend/queries      Server-only screen loaders and public content caching
src/backend/http         HTTP handlers, response and request-security helpers
src/backend/auth         Verified staff identity and session authorization
src/backend/services     Authorization and business rules
src/backend/repositories Parameterized D1 access
src/backend/integrations Provider clients and webhook verification
src/backend/security     Turnstile and trusted-boundary helpers
src/backend/cloudflare   Runtime binding access
src/shared               Runtime-neutral schemas, types, labels and public config
migrations/d1            Ordered schema and policy migrations
```

Pages and components do not query D1 directly. Public inputs are validated on
the server. Protected actions require a verified Access identity, active staff
profile, and explicit permission.

Frontend/backend separation is a source-code boundary, not a second website
deployment. Server-rendered screens call backend queries; browser components
use HTTP endpoints or explicit server actions. Shared modules cannot depend on
the backend. ESLint enforces these import directions, including relative
imports. See `CODE_STRUCTURE.md` for file ownership and examples.

## Public Website

Public routes expose only published sermons, ministries, announcements,
bulletins and schedule occurrences. Private locations are removed by the
repository/read layer. Published content uses targeted cache invalidation.
Private and administrative responses use `no-store` behavior.

R2 buckets are not publicly listed. File delivery validates the requested
object, publication state, permitted type, and safe response headers.

## Protected Dashboard and Roles

The six roles are System Administrator, Pastor, Core Leader, Content Publisher,
Content Editor and Prayer Warrior. Senior/Associate Pastor are job titles, not
different permission bundles. Detailed grants are in `PERMISSION_MATRIX.md`.

Core principles:

- individual accounts only; no shared keys or passwords;
- authorization is server-enforced for every protected operation;
- System Administrator manages security but has no prayer content access by
  default;
- Core Leader is a highly trusted, reasoned elevation with Pastor-equivalent
  website operations;
- Content Publisher may approve their own work as explicitly approved;
- Prayer Warrior access is restricted to assigned team requests; and
- the final System Administrator cannot be removed or suspended.

## Local Development Administrator

`pnpm dev` applies pending migrations to local D1 before Next.js starts. On a
loopback hostname, the normal `/admin` route then uses one fixed synthetic
System Administrator identity from local D1. There is no local login, role
switcher, `/admin/sandbox` route, shared password, or secret configuration.

The helper requires both the Worker binding `APP_ENVIRONMENT=local` and the
Next.js `development` runtime. It rejects network, preview, and production
requests even if a loopback Host header is supplied. A permanent banner marks
the local state, and PayMongo is blocked until its separate, deliberate
test-mode configuration. Cloudflare Access remains the only authentication
path in preview and production.

## Prayer Privacy

Public prayer submission supports `team` and `pastoral_only`. Turnstile is
bypassed only by an explicit local-development flag and must be configured for
the real hostname before production. Public responses are generic, requests are
rate-limited, and logs do not contain prayer text or contact data.

Pastor/Core Leader can handle both scopes. Prayer Warriors can view/update/
close only permitted assigned team requests and may escalate them. Contact data
is revealed only when consent and permission are both present, and the reveal
is audited.

Closed-request contact fields are redacted after 30 days and prayer text after
90 days. Legal hold prevents deletion. A daily Worker cron executes bounded
retention batches.

## Giving Boundary

The website offers a simple `Give Tithes & Offerings` visitor action using
PayMongo Hosted Checkout. The approved public labels are **Tithes & Offerings**,
**Church Building Fund** and **Love Gift**. Love Gift is a general,
church-managed fund at launch: the form does not accept or select a recipient.
Questions concerning a specific person go through the church contact path.

The interface explains that an amount starts at zero, but PayMongo cannot
process a zero-value payment. Server validation therefore accepts ₱1.00 through
₱100,000.00 per checkout. Card, GCash and QR Ph are requested from PayMongo;
the final availability remains subject to the church account. PayMongo's
`pass_on_fees` setting shows method-specific fees before the giver confirms.

The website will not maintain offline gifts, donor ledgers, bookkeeping,
adjustments, refunds, official receipts or finance reports. PayMongo's dashboard
is the website finance source of truth. Refunds and reconciliation remain
provider/office processes until the separate ChMS is designed.

## Deployment and Secrets

- Local, preview and production have separate D1 databases, R2 buckets,
  bindings and Access configuration.
- Secrets use `.dev.vars` locally and Cloudflare Worker secrets remotely; they
  are never committed or returned to clients.
- Production deployment waits for a church-owned domain/account, real Access
  policy, Turnstile hostnames, tested backup/restore and leadership approval.
- Observability logs identifiers and error codes, not prayer text, contact
  details, tokens, payer details or payment payloads.
