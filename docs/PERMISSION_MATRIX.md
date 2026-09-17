# Website Permission Matrix

## Status

Approved on 2026-09-17 for the public website and its protected operations
dashboard. Job titles do not create permissions: Senior Pastor and Associate
Pastor both receive the `pastor` role. The future ChMS has a separate role
model.

## Roles

| Role | Purpose | Sensitive limits |
| --- | --- | --- |
| System Administrator | Accounts, role assignment, security, settings and integrations | No prayer text or contact access by default |
| Pastor | Pastoral care, public-content oversight, contacts and ministry inquiries | Cannot manage system roles; cannot self-approve authored content |
| Core Leader | Pastor-equivalent website operations for a highly trusted leader | Assigned only by a System Administrator with a recorded reason |
| Content Publisher | Creates, reviews, self-approves, publishes and archives allowed public content | No prayer, contact, staff-security or finance access |
| Content Editor | Creates and submits allowed public content | Cannot approve, publish or archive |
| Prayer Warrior | Works on permitted team prayer requests | No pastoral-only requests; no general staff or content access |

## Capability Summary

| Capability | System Admin | Pastor | Core Leader | Content Publisher | Content Editor | Prayer Warrior |
| --- | :---: | :---: | :---: | :---: | :---: | :---: |
| Enter admin dashboard | Yes | Yes | Yes | Yes | Yes | Yes |
| Read staff directory | Yes | Yes | Yes | No | No | No |
| Invite/suspend staff and manage roles | Yes | No | No | No | No | No |
| Manage system settings/integrations | Yes | Read only | Read only | No | No | No |
| Manage pages and ministries | No | Yes | Yes | No | No | No |
| Manage sermons, schedules, announcements, bulletins and media | No | Yes | Yes | Yes | Yes | No |
| Submit content | No | Yes | Yes | Yes | Yes | No |
| Approve/publish/archive content | No | Yes | Yes | Yes | No | No |
| Approve own content | No | No | No | Yes | No | No |
| Read/respond/assign contact and ministry inquiries | No | Yes | Yes | No | No | No |
| Read/update team prayer requests | No | Yes | Yes | No | No | Assigned scope |
| Read/update pastoral-only prayer requests | No | Yes | Yes | No | No | No |
| Assign prayer requests | No | Yes | Yes | No | No | No |
| Reveal consented prayer contact details | No | Yes | Yes | No | No | Allowed assigned team scope |
| Escalate prayer request | No | Yes | Yes | No | No | Allowed team scope |
| Close prayer request | No | Yes | Yes | No | No | Assigned team request only |
| Read prayer audit metadata | No | Yes | Yes | No | No | No |

`Assigned scope` is enforced by the prayer service and database guards, not only
by hiding controls in the interface.

## Assignment Rules

- Every staff member has an individual Cloudflare Access identity and D1 staff
  profile. Shared keys and shared credentials are prohibited.
- Core Leader and System Administrator assignments require a reason of at least
  ten characters and an audit event.
- Core Leader cannot be an invitation's initial role; it is an explicit later
  elevation by a System Administrator.
- At least one active System Administrator must remain.
- Permission checks occur on the trusted server for every protected operation.
- Content Publisher may approve their own content as explicitly approved by the
  church. Pastor and Core Leader do not receive `content.self_approve`.

## Removed Website Permissions

The website has no Treasurer role and no contribution ledger, offline-entry,
verification, adjustment, refund, receipt, reconciliation, finance-export, or
finance-report permissions. Those belong to the future ChMS. The planned
PayMongo integration uses a public giving flow and provider-hosted checkout,
not a bookkeeping role.
