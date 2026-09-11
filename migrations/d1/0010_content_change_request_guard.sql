-- Validate review history when pending content is returned to draft.

CREATE TRIGGER content_review_events_validate_change_request
BEFORE INSERT ON content_review_events
WHEN NEW.action = 'changes_requested'
  AND NOT EXISTS (
    SELECT 1 FROM content_entries AS entry
    JOIN content_revisions AS revision ON revision.id = NEW.revision_id
    WHERE entry.id = NEW.content_id
      AND revision.content_id = entry.id
      AND revision.version = entry.version - 1
      AND entry.status = 'draft'
      AND length(trim(coalesce(NEW.reason, ''))) >= 10
  )
BEGIN
  SELECT RAISE(ABORT, 'Change request does not match content state');
END;
