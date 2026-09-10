# D1 Migrations

This directory contains ordered, SQLite-compatible Cloudflare D1 migrations.

The Phase 1 platform health probe uses `SELECT 1`. Phase 2 begins with the
access-control schema and approved role/permission seed data. Phase 3 adds the
staff invitation and first-login activation workflow, followed by cross-table
guards that prevent bypassing the approved invitation path. Phase 4 begins with
publishable content, immutable revision history, subtype records, schedules, and
R2 object metadata, with workflow and subtype consistency guards.

Use the database binding name rather than a production resource identifier:

```text
pnpm d1:migrations:list
pnpm d1:migrations:apply
```

Both scripts target local D1 storage. Remote migrations require a separately
reviewed command, a verified backup, and an explicit environment selection.
