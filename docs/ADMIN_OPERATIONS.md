# Admin Operations

## Purpose

This is the operating guide for the protected website dashboard. It covers
website content, prayer care, visitor inquiries and staff access only. It is
not the future Church Management System and contains no bookkeeping features.

Production currently uses Access-based login. The approved
[password-login and manual-recovery plan](decisions/0003-staff-password-authentication.md)
now includes password enrollment, a three-day temporary-password grace period,
resets, session revocation and security audit records. Password authentication
is enabled only in the preview environment. Do not change the production
Access application or distribute production credentials.

## Signing in

Preview staff use the private username and password given by a System
Administrator at `/admin/login`. Production staff continue to use Cloudflare
Access until a separately approved cutover. The website never uses shared
accounts or emails password-reset links.

## First System Administrator

This is a one-time deployment setup, not a normal dashboard task. The owner
creates the first System Administrator using the controlled, documented
bootstrap procedure. D1 records the role and audit event; a second bootstrap
attempt is denied by the database.

After bootstrap, use **Staff & access** for every additional staff account,
including another System Administrator. New System Administrator and Core
Leader assignments require a reason of at least ten characters and are audited.

## Adding staff

1. Open **Staff & access** and enter the person's contact email, name,
   username, temporary password and role. Add a reason when assigning System
   Administrator or Core Leader.
2. Privately give the username and temporary password to that person. The
   temporary password is stored only as a salted hash.
3. They sign in at `/admin/login` and see a centered reminder to choose a
   personal password. They may postpone it during the three-day grace period.
4. If they do not change it by the deadline, the website disables the account,
   revokes its sessions and records an audit event. A System Administrator must
   verify the person's identity and use **Reactivate password setup** to issue
   a fresh three-day temporary password.

Suspending a staff member blocks D1 access immediately. Disabled temporary
password accounts remain disabled until a System Administrator explicitly
reactivates them with a reason.

## Password-login operations after approved cutover

Only a System Administrator with `staff.credentials.manage` may create or
reset password accounts. They must re-enter their own password for every
account creation, reset, or forced session revocation.

1. Create a lowercase username and a temporary password of at least 15
   characters, then give the temporary password only through a verified private
   conversation.
2. The new staff member signs in at `/admin/login`. A centered reminder asks
   them to set a personal password in **My account**. They can postpone it, but
   the temporary password expires after three days.
3. A reset creates a new 30-minute temporary password and ends all existing
   website sessions for the target account. Record why identity was verified.
4. Staff change their own password from **My account**. Administrators cannot
   see personal passwords.

Never place a temporary password in email, group chat, screenshots, logs or
repository files. Keep two trusted System Administrators before cutover; a
single locked-out administrator requires the documented owner recovery path.

## Dashboard layout

- Desktop: a persistent, role-aware sidebar.
- Mobile: the same navigation in a compact menu.
- **My account**: verified identity, active status and assigned roles.
- Bell: in-dashboard operational notifications. It never displays prayer text,
  contact information, payment data, API errors or Cloudflare secrets.

The dashboard only shows each role the areas they may access. Hiding an item is
not the security control: every action and query is checked again on the server.
