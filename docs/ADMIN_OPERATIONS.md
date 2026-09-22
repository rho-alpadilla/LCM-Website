# Admin Operations

## Purpose

This is the operating guide for the protected website dashboard. It covers
website content, prayer care, visitor inquiries and staff access only. It is
not the future Church Management System and contains no bookkeeping features.

## Signing in

Every staff member uses their own email address and Cloudflare Access One-time
PIN. They open the protected `/admin` address, enter their email, then enter
the short code delivered by Cloudflare. The website does not store passwords,
recovery answers or shared credentials.

## First System Administrator

This is a one-time deployment setup, not a normal dashboard task:

1. In Cloudflare Access, put the trusted administrator's exact email in the
   dedicated LCM staff Allow policy.
2. That person opens `/admin`, completes the email code, and completes the
   one-time bootstrap form with their name and documented reason.
3. D1 records the System Administrator role and audit event. A second bootstrap
   attempt is denied by the database.

After bootstrap, use **Staff & access** for every additional staff account,
including another System Administrator. New System Administrator and Core
Leader assignments require a reason of at least ten characters and are audited.

## Adding staff

1. Open **Staff & access** and enter the person's email, name, access role and
   a reason if assigning System Administrator or Core Leader.
2. The dashboard saves a pending staff record first, then safely adds the
   exact email to the dedicated Cloudflare Access policy.
3. If Access needs attention, the saved record clearly shows that state. Use
   **Retry secure sign-in setup** after the connection is corrected; do not
   make a duplicate account or switch the Access policy to a broad rule.
4. When the status reads **awaiting first email sign-in**, share the `/admin`
   address. The person completes their Cloudflare email code and is activated
   automatically on first verified sign-in.

Suspending a staff member blocks D1 access immediately and asks Cloudflare to
remove that email from the managed policy. Pending invitations can be cancelled
with a recorded reason.

## Dashboard layout

- Desktop: a persistent, role-aware sidebar.
- Mobile: the same navigation in a compact menu.
- **My account**: verified identity, active status and assigned roles.
- Bell: in-dashboard operational notifications. It never displays prayer text,
  contact information, payment data, API errors or Cloudflare secrets.

The dashboard only shows each role the areas they may access. Hiding an item is
not the security control: every action and query is checked again on the server.
