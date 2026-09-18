# Lifechangers Ministry Incorporated Website

## Project Status

Development is in progress on the approved free-first Cloudflare stack. The
website/ChMS boundary and six-role website permission model are approved.
PayMongo Hosted Checkout is implemented for local/test configuration. Domain
and production-provider configuration remain pending.

The initial system architecture is documented in `docs/ARCHITECTURE.md`.

The initial database design and role-permission matrix are documented in `docs/DATABASE_SCHEMA.md` and `docs/PERMISSION_MATRIX.md`.

## Confirmed Purpose

Build an online outreach platform for Lifechangers Ministry Incorporated serving new visitors, existing members, and the local community.

## Confirmed Public Actions

- Watch a sermon
- View daily church activities
- Request prayer
- Contact the church
- Join a ministry
- Support the ministry through online giving

`Plan a Visit` is not currently included.

## Confirmed Public Information

- Church name: Lifechangers Ministry Incorporated
- Address: #3 Johnbee Village, Bokawkan Road, Baguio City, Philippines
- Phone: 0916 665 2531
- Email: agentofchangelcm@gmail.com
- Facebook: https://www.facebook.com/LCMAGENTSofCHANGE
- Tagline shown on Facebook: Your Home church in the City.
- Hashtag shown on Facebook: #ChurchWithoutWalls
- Official service schedules: To be confirmed by the church

## Confirmed Administration Requirements

- The public website does not require member accounts.
- The administration area requires individual staff accounts with role-based access control.
- Shared access keys or shared credentials must not be used.
- Estimated staffing is approximately 2-3 accounts per role, subject to confirmation.
- Public content requires an approval workflow before publication.
- Significant actions must be recorded in an audit log.

### Planned Roles

- System Administrator
- Pastor
- Core Leader
- Content Publisher
- Content Editor
- Prayer Warrior

Senior Pastor and Associate Pastor are job titles using the same Pastor role.
Content Publishers may approve and publish their own work. A System
Administrator may assign Core Leader only to selected highly trusted people,
with a recorded reason. Core Leader has Pastor-equivalent website operations
access. The website has no Treasurer or bookkeeping role.

### Prayer Request Access

- Pastors and Core Leaders may access team and pastoral-only prayer requests.
- Prayer Warriors may access prayer requests that are permitted for the prayer team.
- A pastoral-only privacy option is confirmed for launch and is not visible to Prayer Warriors.
- Assigned Prayer Warriors may close only their assigned prayer-team requests.
- Closed-request contact details are erased after 30 days and closed prayer text after 90 days, except under an approved legal hold.

## Confirmed Content Requirements

- Sermons
- Sermon series and speakers
- Events
- Announcements
- Ministries
- Bulletins
- Daily and recurring church activities
- Church pages and media

Daily activities and special events should use a shared schedule system with activity types to avoid duplicate implementations.

## Confirmed Giving Requirements

- Provide a simple `Give Tithes & Offerings` public action.
- Use PayMongo Hosted Checkout for one-time payments; recurring giving is not
  required for the first launch.
- Never collect card or wallet credentials in this website.
- Validate allowed purpose and amount on the server and trust payment status
  only from a verified provider webhook.
- Public labels are Tithes & Offerings, Church Building Fund and Love Gift.
  Love Gift is a church-managed fund at launch. It does not collect a recipient
  name, member data or delivery instruction; those responsibilities belong to
  the future ChMS and church office process.
- Use the payment gateway's normal transaction fee with PayMongo's clearly
  disclosed sender-paid fee option where the church account supports it.
- Allow ₱1.00 to ₱100,000.00 per checkout. Zero can be the empty starting
  value in the form but cannot be submitted because PayMongo does not process
  zero-value payments.
- Request card, GCash and QR Ph in PayMongo Checkout, subject to account
  activation and actual provider availability.
- Use the PayMongo dashboard as the website's payment source of truth.
- Do not store offline gifts, a donor ledger, bookkeeping records, adjustments,
  refunds, official receipts or finance reports in this website.

Full bookkeeping and member management belong to a future separate ChMS with
its own deployment, database, storage, secrets, permissions, Access application,
backups and repository.

## Existing Website and Domain

- The previous website was created and managed by IOL Inc. Baguio.
- The church stopped paying the previous provider because of cost.
- The church does not currently control a domain, hosting account, previous source code, or previous website database.
- The new project must be independent of the old website and infrastructure.
- A new church-owned domain and church-controlled service accounts are required.

## Cost Strategy

### Approved Decision

Operate with no recurring platform subscription during development and the initial release. The only expected unavoidable costs are the annually renewed domain and any approved legal/IP filings. Payment-provider transaction fees are separate from platform operating costs.

### Architecture Requirement

- Stay on hard-limited free plans where practical so exceeding a limit fails safely instead of creating an unexpected bill.
- Keep deployment configuration environment-based.
- Avoid provider-specific shortcuts that would make upgrading or migrating unnecessarily difficult.
- Keep database migrations, seed data, and deployment steps reproducible.
- Implement storage, authentication, email, monitoring, and payment integrations behind clear application boundaries.
- Configure usage alerts, upload quotas, request throttling, and limits where providers support them.
- Document the steps and expected effect of moving to paid production services.
- The upgrade to paid Cloudflare capacity should primarily be an account billing or configuration change, not an application rewrite.

## Selected Technology Stack

### Application

- Next.js using the App Router
- React
- TypeScript with strict type checking
- Tailwind CSS with reusable design tokens
- Accessible reusable UI primitives; add component dependencies only as needed
- Zod for trusted-boundary validation
- React Hook Form for complex accessible forms when needed

### Data and Backend Services

- Cloudflare D1 as the relational system of record using SQLite-compatible SQL
- Cloudflare Access for staff identity and protection of the administration area
- Application roles and granular permissions stored in D1
- Authorization enforced inside trusted Worker/server code for every protected operation
- Cloudflare R2 Standard storage for approved files, with application quotas that remain below the free allowance
- SQL migrations stored in version control and tested against a local D1 database
- Cloudflare Workers or protected Next.js Route Handlers for payment webhooks and privileged operations

### Hosting and Domain Infrastructure

- Cloudflare Workers using the supported OpenNext adapter for the Next.js application
- Cloudflare DNS and security controls
- A church-owned registrar account; Cloudflare Registrar is the initial preference subject to domain availability, extension support, and final pricing

### Supporting Services

- Cloudflare Turnstile for privacy-conscious bot protection on public forms
- Cloudflare Web Analytics if analytics is enabled
- Dashboard-based notifications at first; outbound transactional email remains optional until a no-cost provider and its limits are approved
- Facebook and/or YouTube embeds for sermon video delivery
- PayMongo Hosted Checkout, subject to church-account eligibility, fee,
  settlement and giving-purpose confirmation

### Development and Quality

- pnpm for dependency management
- ESLint and consistent formatting
- Vitest and React Testing Library for unit and component tests
- Playwright for end-to-end and responsive-flow testing
- GitHub Actions for automated checks when the repository is connected to GitHub

### Application Structure

- Public routes and admin routes remain clearly separated.
- Reusable UI stays separate from feature-specific components.
- Business rules stay in feature/service modules rather than page components.
- Database access stays behind dedicated repositories or server-side data modules.
- Payment, email, storage, and analytics providers stay behind integration boundaries.
- Database access stays server-only. Authorization must be enforced before each D1 operation and covered by permission tests.

### Free-to-Paid Upgrade Path

- Start with Cloudflare Workers Free, D1 Free, Cloudflare Access Free, Turnstile, and carefully limited R2 Standard usage.
- Keep public pages cache-friendly and minimize dynamic server execution.
- Configure alerts and document free-tier limits.
- Upgrade Cloudflare Workers without changing the application architecture when runtime limits require it.
- Upgrade Cloudflare capacity only after church approval when traffic or storage justifies it.
- Keep repository and service boundaries portable enough to support a future managed PostgreSQL migration if D1 no longer fits.

### Technology Decisions Explicitly Avoided

- Do not use shared WordPress hosting as the default architecture for this project.
- Do not use a document database as the primary store for financial, permission, and audit data.
- Do not use a hosting free tier whose terms do not clearly fit an incorporated church.
- Do not build custom password storage or expose D1 directly to browsers.
- Do not introduce a separate custom backend server until the selected services cannot meet a confirmed requirement.

### Upgrade Triggers

Review the move to paid production services before or when any of the following occurs:

- Payment traffic or confidential prayer volume exceeds free-tier capacity.
- Confidential prayer requests are stored regularly.
- Free-tier capacity or availability affects staff or visitors.
- Reliable automatic backups and recovery become necessary.
- Storage, email, bandwidth, or database quotas approach their limits.
- The church requires provider support or stronger operational guarantees.

## Outstanding Decisions

- Official service schedule and weekly recurring activities
- Confirm or revise the provisional 90-day retention period for closed Contact
  and Ministry Interest submissions before their Turnstile-protected public
  forms are enabled.
- Domain name and registrar
- PayMongo test/live account configuration, enabled methods, fee disclosure
  and settlement process
- Content approval authorities and emergency publishing permissions
- Number of accounts per approved website role
- Existing content and media inventory
