# Staff Role and Permission Matrix

> **Platform note:** This permission model remains approved. During the Cloudflare
> migration, Cloudflare Access will authenticate staff and trusted Worker code will
> enforce these permissions before every D1 operation. References to Supabase MFA
> or PostgreSQL enforcement describe the preserved prototype until replaced and
> verified.

## Status

Updated initial permission model for review. It follows least privilege, content-scope boundaries, and separation of duties. Entries marked **Proposed** require church-policy confirmation before implementation.

## Role Interpretation

- **Senior Pastor:** broad leadership access plus authority reserved for the senior leader.
- **Core Leader:** an optional System-Administrator-assigned role for selected trusted Leaders; it mirrors every permission in the Senior Pastor column, including sensitive financial approvals.
- **Associate Pastor:** broad day-to-day pastoral and operational access.
- **Leader:** the same day-to-day operational access as the Associate Pastor.
- **Multimedia Head:** Multimedia Team access plus approval, publishing and archival authority inside the Multimedia content scope.
- **Bulletin Head:** Bulletin Team access plus approval, publishing and archival authority inside the Bulletin content scope.
- **Team roles:** create, edit and submit content but do not approve or publish it.
- **System Administrator:** manages the system but does not automatically see prayer or donor information.

Every person receives an individual account. Roles are never implemented as shared passwords or shared access keys.

To keep the tables readable, Core Leader is not repeated as a separate column. Its permission value is always identical to the **Senior** column. Assignment or removal of Core Leader access requires `staff.roles.manage`, MFA, a reason, and a security audit event.

## Legend

- **Yes:** granted by the initial role.
- **Scoped:** limited to the role's permitted content or data domain.
- **Summary:** aggregate information only; no individual records or identities.
- **Assigned:** limited to records actively assigned to that staff member.
- **No:** not granted.
- **Proposed:** safe initial recommendation awaiting confirmation.

## Administrative Permissions

| Permission                 | Sys Admin | Senior | Associate | Leader | Media Head | Media Team | Bulletin Head | Bulletin Team | Treasurer | Prayer Warrior |
| -------------------------- | --------: | -----: | --------: | -----: | ---------: | ---------: | ------------: | ------------: | --------: | -------------: |
| `admin.access`             |       Yes |    Yes |       Yes |    Yes |        Yes |        Yes |           Yes |           Yes |       Yes |            Yes |
| `staff.read`               |       Yes |    Yes |       Yes |    Yes |         No |         No |            No |            No |        No |             No |
| `staff.invite`             |       Yes |     No |        No |     No |         No |         No |            No |            No |        No |             No |
| `staff.suspend`            |       Yes |     No |        No |     No |         No |         No |            No |            No |        No |             No |
| `staff.roles.manage`       |       Yes |     No |        No |     No |         No |         No |            No |            No |        No |             No |
| `roles.permissions.manage` |       Yes |     No |        No |     No |         No |         No |            No |            No |        No |             No |
| `settings.read`            |       Yes |    Yes |       Yes |    Yes |         No |         No |            No |            No |        No |             No |
| `settings.manage`          |       Yes |     No |        No |     No |         No |         No |            No |            No |        No |             No |
| `audit.activity.read`      |  Redacted | Scoped |    Scoped | Scoped |         No |         No |            No |            No |        No |             No |
| `audit.security.read`      |       Yes |     No |        No |     No |         No |         No |            No |            No |        No |             No |

Activity logs available to System Administrators identify actors and actions while redacting prayer text, donor identity and protected financial detail.

## Content Management Permissions

| Permission                     | Sys Admin |            Senior | Associate | Leader |  Media Head | Media Team | Bulletin Head | Bulletin Team | Treasurer | Prayer Warrior |
| ------------------------------ | --------: | ----------------: | --------: | -----: | ----------: | ---------: | ------------: | ------------: | --------: | -------------: |
| `content.pages.manage`         |        No |               Yes |       Yes |    Yes |          No |         No |            No |            No |        No |             No |
| `content.ministries.manage`    |        No |               Yes |       Yes |    Yes |          No |         No |            No |            No |        No |             No |
| `content.sermons.manage`       |        No |               Yes |       Yes |    Yes |         Yes |        Yes |            No |            No |        No |             No |
| `content.series.manage`        |        No |               Yes |       Yes |    Yes |         Yes |        Yes |            No |            No |        No |             No |
| `content.speakers.manage`      |        No |               Yes |       Yes |    Yes |         Yes |        Yes |            No |            No |        No |             No |
| `content.schedule.manage`      |        No |               Yes |       Yes |    Yes |         Yes |        Yes |           Yes |           Yes |        No |             No |
| `content.announcements.manage` |        No |               Yes |       Yes |    Yes |         Yes |        Yes |           Yes |           Yes |        No |             No |
| `content.bulletins.manage`     |        No |               Yes |       Yes |    Yes |          No |         No |           Yes |           Yes |        No |             No |
| `content.media.manage`         |        No |               Yes |       Yes |    Yes |         Yes |        Yes |           Yes |           Yes |        No |             No |
| `content.submit`               |        No |               Yes |       Yes |    Yes |         Yes |        Yes |           Yes |           Yes |        No |             No |
| `content.approve`              |        No |               Yes |       Yes |    Yes | Yes, scoped |         No |   Yes, scoped |            No |        No |             No |
| `content.publish`              |        No |               Yes |       Yes |    Yes | Yes, scoped |         No |   Yes, scoped |            No |        No |             No |
| `content.archive`              |        No |               Yes |       Yes |    Yes | Yes, scoped |         No |   Yes, scoped |            No |        No |             No |
| `content.self_approve`         |        No |                No |        No |     No | Yes, scoped |         No |   Yes, scoped |            No |        No |             No |
| `content.emergency_publish`    |        No | **Proposed: Yes** |        No |     No |          No |         No |            No |            No |        No |             No |

### Content-Scope Rule

Approval, publishing and archiving require two permissions:

1. The generic workflow permission, such as `content.approve`.
2. The matching content management permission, such as `content.sermons.manage`.
3. For approval of one's own submission, the scoped `content.self_approve` permission.

This means:

- A Multimedia Head can approve sermons, series, speakers, schedule items and announcements within the Multimedia scope.
- A Bulletin Head can approve bulletins, schedule items and announcements within the Bulletin scope.
- Media assets are managed by the Heads but become public only through approved published content; media files are not independently self-published.
- Neither Head can approve pages or ministries unless another permission is explicitly granted later.
- Multimedia and Bulletin Heads may approve their own submitted revisions inside their assigned scopes.
- Self-approval is visibly marked in review history and creates a dedicated audit event.
- Leaders, Associate Pastors and Senior Pastors do not receive self-approval merely from their leadership role.

## Engagement Permissions

| Permission                  | Sys Admin |            Senior | Associate | Leader | Media Head | Media Team | Bulletin Head | Bulletin Team | Treasurer | Prayer Warrior |
| --------------------------- | --------: | ----------------: | --------: | -----: | ---------: | ---------: | ------------: | ------------: | --------: | -------------: |
| `contact.read`              |        No |               Yes |       Yes |    Yes |         No |         No |            No |            No |        No |             No |
| `contact.respond`           |        No |               Yes |       Yes |    Yes |         No |         No |            No |            No |        No |             No |
| `contact.assign`            |        No |               Yes |       Yes |    Yes |         No |         No |            No |            No |        No |             No |
| `contact.export`            |        No | **Proposed: Yes** |        No |     No |         No |         No |            No |            No |        No |             No |
| `ministry_interest.read`    |        No |               Yes |       Yes |    Yes |         No |         No |            No |            No |        No |             No |
| `ministry_interest.respond` |        No |               Yes |       Yes |    Yes |         No |         No |            No |            No |        No |             No |
| `ministry_interest.assign`  |        No |               Yes |       Yes |    Yes |         No |         No |            No |            No |        No |             No |
| `ministry_interest.export`  |        No | **Proposed: Yes** |        No |     No |         No |         No |            No |            No |        No |             No |

## Prayer Permissions

| Permission               | Sys Admin |           Senior | Associate | Leader | Media Head | Media Team | Bulletin Head | Bulletin Team | Treasurer |         Prayer Warrior |
| ------------------------ | --------: | ---------------: | --------: | -----: | ---------: | ---------: | ------------: | ------------: | --------: | ---------------------: |
| `prayer.read_team`       |        No |              Yes |       Yes |    Yes |         No |         No |            No |            No |        No |                    Yes |
| `prayer.read_pastoral`   |        No |              Yes |       Yes |    Yes |         No |         No |            No |            No |        No |                     No |
| `prayer.update_team`     |        No |              Yes |       Yes |    Yes |         No |         No |            No |            No |        No |                    Yes |
| `prayer.update_pastoral` |        No |              Yes |       Yes |    Yes |         No |         No |            No |            No |        No |                     No |
| `prayer.assign`          |        No |              Yes |       Yes |    Yes |         No |         No |            No |            No |        No |                     No |
| `prayer.contact.read`    |        No |              Yes |       Yes |    Yes |         No |         No |            No |            No |        No |     Assigned + consent |
| `prayer.escalate`        |        No |              Yes |       Yes |    Yes |         No |         No |            No |            No |        No |                    Yes |
| `prayer.close`           |        No |              Yes |       Yes |    Yes |         No |         No |            No |            No |        No | **Proposed: Assigned** |
| `prayer.export`          |        No | **Proposed: No** |        No |     No |         No |         No |            No |            No |        No |                     No |
| `audit.prayer.read`      |        No |              Yes |       Yes |    Yes |         No |         No |            No |            No |        No |                     No |

Leaders have pastor-equivalent operational access, including pastoral-only prayer requests. Core Leaders mirror the Senior Pastor column. Both roles should be limited to trusted church leaders.

Bulk prayer export remains disabled for every role unless a future legitimate need is formally approved.

## Giving Permissions

| Permission                  | Sys Admin |                Senior | Associate | Leader | Media Head | Media Team | Bulletin Head | Bulletin Team |             Treasurer | Prayer Warrior |
| --------------------------- | --------: | --------------------: | --------: | -----: | ---------: | ---------: | ------------: | ------------: | --------------------: | -------------: |
| `giving.summary.read`       |        No |                   Yes |       Yes |    Yes |         No |         No |            No |            No |                   Yes |             No |
| `giving.details.read`       |        No |                    No |        No |     No |         No |         No |            No |            No |                   Yes |             No |
| `giving.contributors.read`  |        No |                    No |        No |     No |         No |         No |            No |            No |                   Yes |             No |
| `giving.online.reconcile`   |        No |                    No |        No |     No |         No |         No |            No |            No |                   Yes |             No |
| `giving.offline.create`     |        No |                    No |        No |     No |         No |         No |            No |            No |                   Yes |             No |
| `giving.offline.verify`     |        No |                    No |        No |     No |         No |         No |            No |            No |          Yes, not own |             No |
| `giving.adjustment.request` |        No |                    No |        No |     No |         No |         No |            No |            No |                   Yes |             No |
| `giving.adjustment.approve` |        No |                   Yes |        No |     No |         No |         No |            No |            No |                    No |             No |
| `giving.refund.request`     |        No |                    No |        No |     No |         No |         No |            No |            No |                   Yes |             No |
| `giving.refund.approve`     |        No |                   Yes |        No |     No |         No |         No |            No |            No |                    No |             No |
| `giving.receipt.manage`     |        No |                    No |        No |     No |         No |         No |            No |            No |                   Yes |             No |
| `giving.categories.manage`  |        No | **Proposed: Approve** |        No |     No |         No |         No |            No |            No | **Proposed: Prepare** |             No |
| `giving.export`             |        No |                    No |        No |     No |         No |         No |            No |            No |                   Yes |             No |
| `audit.finance.read`        |        No |         Approval only |        No |     No |         No |         No |            No |            No |                   Yes |             No |

Leaders and both pastoral roles see giving totals. Only Treasurers see transaction-level and contributor information. Senior-Pastor financial approval is excluded from ordinary Leaders but included for System-Administrator-assigned Core Leaders.

## Operational Permissions

| Permission                 | Sys Admin |            Senior | Associate |  Leader | Media Head | Media Team | Bulletin Head | Bulletin Team | Treasurer | Prayer Warrior |
| -------------------------- | --------: | ----------------: | --------: | ------: | ---------: | ---------: | ------------: | ------------: | --------: | -------------: |
| `reports.content.read`     |        No |               Yes |       Yes |     Yes |  Own scope |  Own scope |     Own scope |     Own scope |        No |             No |
| `reports.engagement.read`  |        No |               Yes |       Yes |     Yes |         No |         No |            No |            No |        No |             No |
| `reports.system.read`      |       Yes |           Summary |   Summary | Summary |         No |         No |            No |            No |        No |             No |
| `integrations.status.read` |       Yes |               Yes |        No |      No |         No |         No |            No |            No |        No |             No |
| `integrations.manage`      |       Yes |                No |        No |      No |         No |         No |            No |            No |        No |             No |
| `backups.status.read`      |       Yes |               Yes |        No |      No |         No |         No |            No |            No |        No |             No |
| `data.retention.manage`    |        No | **Proposed: Yes** |        No |      No |         No |         No |            No |            No |        No |             No |

## Dashboard Visibility

| Dashboard area            | Sys Admin |  Senior | Associate |  Leader | Media Head |      Media Team |  Bulletin Head |   Bulletin Team | Treasurer |  Prayer Warrior |
| ------------------------- | --------: | ------: | --------: | ------: | ---------: | --------------: | -------------: | --------------: | --------: | --------------: |
| System/account activity   |       Yes | Summary |   Summary | Summary |         No |              No |             No |              No |        No |              No |
| Content awaiting review   |        No |     Yes |       Yes |     Yes |  Own scope | Own submissions |      Own scope | Own submissions |        No |              No |
| Sermon/content statistics |        No |     Yes |       Yes |     Yes |  Own scope |       Own scope | Bulletin scope |  Bulletin scope |        No |              No |
| Engagement counts         |        No |     Yes |       Yes |     Yes |         No |              No |             No |              No |        No |              No |
| Prayer-request counts     |        No |     Yes |       Yes |     Yes |         No |              No |             No |              No |        No | Permitted scope |
| Giving totals             |        No |     Yes |       Yes |     Yes |         No |              No |             No |              No |       Yes |              No |
| Individual giving records |        No |      No |        No |      No |         No |              No |             No |              No |       Yes |              No |
| Integration/health status |       Yes | Summary |        No |      No |         No |              No |             No |              No |        No |              No |

Counts follow the same underlying permission rules as detail pages. A dashboard does not reveal records a user cannot otherwise access.

## Mandatory Rules

1. Suspended or disabled accounts have no administrative access.
2. MFA is required for protected administration and sensitive writes.
3. Content self-approval is allowed only with `content.self_approve` and matching content-scope permission; every such action is marked and audited.
4. Users cannot approve their own offline contribution, financial adjustment or refund.
5. Content approval, publication and archival require both workflow permission and matching content-scope permission.
6. System Administrators cannot read prayer text or donor details merely because they manage the system.
7. Online payment amounts and provider identifiers cannot be manually overwritten.
8. Exports require a specific export permission and generate an audit event.
9. Prayer and finance audit details require their matching sensitive-domain permission.
10. Role changes, account suspension, approval, publication, self-approval, exports and financial decisions are audited.
11. The last active System Administrator cannot remove or suspend their own final administrative access.

## Confirmed Workflow Changes

1. Multimedia Heads may approve and publish content inside the Multimedia scope.
2. Bulletin Heads may approve and publish content inside the Bulletin scope.
3. Multimedia and Bulletin Heads may approve their own work inside their assigned scopes.
4. Leaders receive the same day-to-day operational access as the Associate Pastor, including pastoral-only prayer access.
5. System Administrators may give selected Leaders the separate Core Leader role, which mirrors Senior Pastor permissions.
6. Senior Pastors and Core Leaders may approve financial adjustments and refunds, while ordinary Leaders may not.
7. Pastors retain their leadership access even if they rarely use the dashboard.

## Proposed Rules Still Requiring Confirmation

1. The Senior Pastor and Core Leaders may emergency-publish unreviewed content.
2. Another Treasurer verifies an offline entry; the person who entered it cannot verify it.
3. Prayer Warriors may close only requests assigned to them.
4. Bulk prayer export remains disabled.
5. Senior Pastor and Core Leaders may export contact/ministry-interest data for a legitimate ministry need.
