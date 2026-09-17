# ADR 0002: Separate the Public Website from the Future Church Management System

- Status: Accepted
- Date: 2026-09-17
- Decision owners: Lifechangers Ministry Incorporated project team

## Context

The church website needs public outreach, content publishing, prayer care, staff
access, and a simple hosted giving flow. Member management, attendance,
bookkeeping, expenses, official receipts, and private church records have
different privacy, accounting, operational, and recovery requirements.

Combining both systems would give website roles unnecessary access to sensitive
records and would make a public-site incident capable of affecting bookkeeping
or member data.

## Decision

This repository is the **public website and protected website-operations
dashboard**. Its responsibilities are:

- public pages, sermons, ministries, announcements, bulletins and schedules;
- staff accounts and the six approved website roles;
- protected prayer intake and prayer-care operations;
- contact and ministry-interest workflows; and
- creating a provider-hosted PayMongo checkout and storing only the minimum
  payment reference/status required for a safe visitor experience.

A future **Church Management System (ChMS)** will be a separate application. It
will own member records, attendance, pastoral/member records beyond website
prayer care, full bookkeeping, offline giving, expenses, reconciliation,
official receipts, finance reporting, and private documents.

The ChMS must have its own deployment, database, object storage, secrets,
permissions, Cloudflare Access application, backups, repository, and release
process. No direct cross-database access is allowed. A future integration must
use a deliberately approved, authenticated API or export/import contract.

## Security Boundaries

- Website compromise must not grant access to ChMS data or secrets.
- ChMS compromise must not expose website deployment credentials.
- Website roles do not include Treasurer or bookkeeping permissions.
- The payment provider remains the financial source of truth for the website.
- Real prayer text, payment secrets, and private church records must never be
  committed to Git.

## Consequences

The public website stays smaller, safer, cheaper, and easier to operate. The
future ChMS can adopt stricter accounting and retention controls without
changing the outreach site. Some future information exchange may require a
small integration rather than a shared database; that is an intentional trust
boundary.

Conceptual hostnames after a domain is purchased are `church.org` for the public
site, `admin.church.org` for website operations, and `office.church.org` for the
future ChMS. Final hostnames are not yet configured.
