# Phase 5C: PayMongo Hosted Giving

## Status

Implemented locally after checkpoint `0e4f428`. The public checkout route,
minimal D1 migration, rate limit, server validation, raw-body webhook handler,
safe return page and synthetic tests are in place. No real key, webhook
registration or live payment is active yet.

## Confirmed Direction

- Use PayMongo Checkout Session V2 and a PayMongo-hosted payment page.
- Enable one-time giving only.
- Pass supported provider fees to the sender with a clear disclosure.
- Let PayMongo email its payment receipt.
- Keep card and wallet credentials outside the website.
- Keep PayMongo as the website payment source of truth.
- Store only minimal checkout reference/status for idempotency and visitor
  recovery; do not create a website bookkeeping ledger.
- Accept ₱1.00–₱100,000.00 per checkout. A zero display value cannot be
  submitted because a provider checkout cannot process it.
- Use public labels Tithes & Offerings, Church Building Fund and Love Gift.
- Treat Love Gift as a church-managed fund without recipient names, selection
  or delivery instructions.

## Provider Configuration Still Required

- Enable card, GCash and QR Ph on the church PayMongo account.
- Review provider fees, sender-paid disclosure and settlement ownership.
- Create the PayMongo webhook endpoint and save its secret in the Worker.
- Configure Turnstile for the church-owned production hostname.

## Delivery Slices

1. Provider contract and HMAC verification (complete).
2. Minimal D1 checkout/idempotency/webhook-event schema (complete).
3. Server-side giving service with amount/purpose validation and rate limiting
   (complete).
4. Accessible public giving form and hosted-checkout redirect (complete).
5. Raw-body webhook route for `checkout_session.payment.paid` with signature,
   timestamp and duplicate-event checks (complete).
6. Safe success/cancel pages and tests (complete).
7. Test-mode account verification after credentials are available.
8. Live keys, webhook registration and hostname setup only after the domain is
   available and production approval is given.

## Security Rules

- API and webhook secrets are server-only environment secrets.
- The server validates the visitor-selected amount and purpose, generates the
  reference/redirect URLs, and constructs the provider request. Client values
  are never trusted directly.
- Webhooks are verified against the exact raw request body before JSON parsing.
- Test and live webhook signatures are not interchangeable.
- Duplicate events are acknowledged idempotently.
- Logs exclude payer details, full webhook payloads and secrets.
- A redirect/success page never proves payment; only a verified webhook does.
