PRAGMA foreign_keys = ON;

CREATE TRIGGER prayer_requests_content_redaction_guard
BEFORE UPDATE OF request_text, content_deleted_at ON prayer_requests
WHEN NOT (
  OLD.content_deleted_at IS NULL
  AND NEW.request_text IS NULL
  AND NEW.content_deleted_at IS NOT NULL
  AND OLD.legal_hold = 0
  AND OLD.content_retention_due_at IS NOT NULL
  AND OLD.content_retention_due_at <= NEW.content_deleted_at
)
BEGIN SELECT RAISE(ABORT, 'Prayer content may only be redacted after retention expires'); END;

CREATE TRIGGER prayer_contacts_redaction_guard
BEFORE UPDATE OF name, email, phone, preferred_contact, follow_up_consent, deleted_at
ON prayer_request_contacts
WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM prayer_requests
  WHERE prayer_requests.id = OLD.prayer_request_id
    AND prayer_requests.legal_hold = 0
    AND prayer_requests.contact_retention_due_at IS NOT NULL
    AND prayer_requests.contact_retention_due_at <= NEW.deleted_at
)
BEGIN SELECT RAISE(ABORT, 'Prayer contact data may only be redacted after retention expires'); END;
