-- In-dashboard notifications intentionally contain only operational summaries.
-- Do not store prayer text, contact details, payment data, or Cloudflare errors.

CREATE TABLE admin_notifications (
  id TEXT PRIMARY KEY,
  recipient_staff_id TEXT NOT NULL
    REFERENCES staff_profiles (id) ON DELETE RESTRICT,
  category TEXT NOT NULL
    CHECK (category IN ('staff', 'content', 'media', 'prayer', 'inquiry', 'system')),
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
  body TEXT CHECK (body IS NULL OR length(trim(body)) BETWEEN 1 AND 280),
  href TEXT NOT NULL CHECK (href GLOB '/*' AND href NOT GLOB '*://*'),
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX admin_notifications_recipient_unread
  ON admin_notifications (recipient_staff_id, read_at, created_at DESC);

CREATE INDEX admin_notifications_recipient_created
  ON admin_notifications (recipient_staff_id, created_at DESC);

CREATE TRIGGER admin_notifications_prevent_rewrite
BEFORE UPDATE ON admin_notifications
WHEN NEW.id <> OLD.id
  OR NEW.recipient_staff_id <> OLD.recipient_staff_id
  OR NEW.category <> OLD.category
  OR NEW.title <> OLD.title
  OR NEW.body IS NOT OLD.body
  OR NEW.href <> OLD.href
  OR (OLD.read_at IS NOT NULL AND NEW.read_at IS NOT OLD.read_at)
BEGIN
  SELECT RAISE(ABORT, 'Notifications are immutable except for their first read timestamp');
END;
