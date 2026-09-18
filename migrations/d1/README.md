# D1 Migrations

These ordered, SQLite-compatible migrations build the website database.

- `0001`-`0004`: access control, six-role seeds, invitations and account guards.
- `0005`-`0012`: content, revisions, schedules, recurrence exceptions, media,
  workflow guards and public-read support.
- `0013`: prayer requests, separate contacts, assignments, updates and indexes.
- `0014`: prayer immutability, privacy and redaction guards.
- `0015`: retention deadline guards.
- `0016`: active-assignee, open-request and closure/update workflow guards.
- `0017`: minimal PayMongo checkout sessions and immutable verified webhook
  records; no donor or bookkeeping ledger.
- `0018`: protected Contact and Ministry Interest inquiry workflow, assignment
  and follow-up history, D1 guards, and provisional 90-day redaction support.

No migration creates a Treasurer role or website finance ledger. PayMongo data
is limited to checkout/idempotency/webhook status, not bookkeeping data.

Run local migrations with:

```text
pnpm d1:migrations:list
pnpm d1:migrations:apply
```

Remote migrations require a separately reviewed command, an explicit target
environment, a verified backup/recovery plan and deployment approval.
