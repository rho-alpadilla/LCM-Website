# Phase 5 Prayer Privacy and Security Plan

## Status

Prayer Phase 5A/5B is implemented locally. The former website finance-ledger
plan is superseded by ADR 0002 and has been removed. Giving will use a separate,
minimal PayMongo hosted-checkout phase; bookkeeping belongs to a future ChMS.

## Approved Prayer Policies

1. Public visitors may choose `team` or `pastoral_only`.
2. Pastor and Core Leader can access both scopes.
3. Prayer Warriors can access only assigned team requests.
4. Assigned Prayer Warriors may add updates, escalate and close their assigned
   team requests.
5. Contact details require consent and are revealed only through an audited,
   authorized action.
6. Closed-request contact fields are redacted after 30 days.
7. Closed prayer text and update notes are redacted after 90 days.
8. A legal hold pauses retention and requires a recorded reason.
9. Prayer text and contact information never appear in logs or audit details.

## Threat Model and Controls

| Threat                      | Control                                               |
| --------------------------- | ----------------------------------------------------- |
| Automated spam              | Turnstile, per-source rate limiting and bounded input |
| Forged client validation    | Server-side Zod validation and normalized values      |
| Unauthorized pastoral read  | Permission-filtered repository/service query          |
| Prayer Warrior overreach    | Active assignment plus team-scope checks              |
| Accidental contact exposure | Separate contact table and audited reveal route       |
| Sensitive logs              | Structured metadata only; no request/contact text     |
| Stale sensitive data        | Scheduled 30/90-day redaction with legal-hold guard   |
| Destructive history edits   | Append-oriented updates/assignments and D1 triggers   |
| Silent failure              | Generic public message plus server diagnostic code    |

## Workflow

```text
public submission -> server validation -> Turnstile -> rate limit
  -> D1 prayer request/contact + audit batch -> generic response

authorized queue -> scoped read -> assignment -> prayer updates
  -> optional audited contact reveal -> escalation/closure
  -> scheduled retention redaction
```

## Production Preconditions

- church-owned domain and Turnstile widget;
- Worker secret for Turnstile and exact production hostname allowlist;
- Cloudflare Access policy for individual staff emails;
- staff privacy training and named retention/legal-hold owner;
- preview migration, authorization and recovery test; and
- approved public privacy notice.

All automated tests use synthetic prayer data only.
