# Phase 5C: PayMongo Hosted Giving

## Status

Started after checkpoint `0e4f428`. The provider adapter and webhook-signature
verification boundary are implemented with synthetic tests. No public checkout
route, database migration, real key, webhook registration or live payment is
active yet.

## Confirmed Direction

- Use PayMongo Checkout Session V2 and a PayMongo-hosted payment page.
- Enable one-time giving only.
- Pass supported provider fees to the sender with a clear disclosure.
- Let PayMongo email its payment receipt.
- Keep card and wallet credentials outside the website.
- Keep PayMongo as the website payment source of truth.
- Store only minimal checkout reference/status for idempotency and visitor
  recovery; do not create a website bookkeeping ledger.

## Provisional Values Requiring Confirmation

- Display labels: Tithes and offerings, Church building, Love gift.
- Enabled methods: card, GCash and QR Ph, subject to the church PayMongo account.
- Minimum and maximum amount.
- Whether Love gift can name an individual or must use a staff-managed generic
  campaign label. No member identity will be accepted until policy is approved.
- Success/cancel wording and contact path for payment questions.

## Delivery Slices

1. Provider contract and HMAC verification (started).
2. Minimal D1 checkout/idempotency/webhook-event schema.
3. Server-side giving service with amount/purpose validation and rate limiting.
4. Accessible public giving form and hosted-checkout redirect.
5. Raw-body webhook route for `checkout_session.payment.paid` with signature,
   timestamp and duplicate-event checks.
6. Safe success/cancel/status pages and tests.
7. Test-mode account verification after credentials are available.
8. Live keys, webhook registration and hostname setup only after the domain is
   available and production approval is given.

## Security Rules

- API and webhook secrets are server-only environment secrets.
- The server creates amount, purpose, reference and redirect URLs; client values
  are never trusted directly.
- Webhooks are verified against the exact raw request body before JSON parsing.
- Test and live webhook signatures are not interchangeable.
- Duplicate events are acknowledged idempotently.
- Logs exclude payer details, full webhook payloads and secrets.
- A redirect/success page never proves payment; only a verified webhook does.
