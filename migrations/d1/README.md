# D1 Migrations

This directory contains ordered, SQLite-compatible Cloudflare D1 migrations.

The Phase 1 platform health probe uses `SELECT 1`. Phase 2 begins with the
access-control schema and approved role/permission seed data.

Use the database binding name rather than a production resource identifier:

```text
pnpm d1:migrations:list
pnpm d1:migrations:apply
```

Both scripts target local D1 storage. Remote migrations require a separately
reviewed command, a verified backup, and an explicit environment selection.
