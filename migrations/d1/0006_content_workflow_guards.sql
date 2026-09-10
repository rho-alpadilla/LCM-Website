-- Additional guards for content workflow consistency and safe R2 keys.

CREATE UNIQUE INDEX content_review_events_one_action_per_revision
  ON content_review_events (content_id, revision_id, action)
  WHERE revision_id IS NOT NULL;

CREATE TRIGGER media_assets_reject_backslash_key_insert
BEFORE INSERT ON media_assets
WHEN instr(NEW.object_key, '\') > 0
BEGIN
  SELECT RAISE(ABORT, 'R2 object keys must use forward slashes');
END;

CREATE TRIGGER media_assets_reject_backslash_key_update
BEFORE UPDATE OF object_key ON media_assets
WHEN instr(NEW.object_key, '\') > 0
BEGIN
  SELECT RAISE(ABORT, 'R2 object keys must use forward slashes');
END;

CREATE TRIGGER content_review_events_validate_submission
BEFORE INSERT ON content_review_events
WHEN NEW.action = 'submitted'
  AND NOT EXISTS (
    SELECT 1 FROM content_entries AS entry
    JOIN content_revisions AS revision ON revision.id = NEW.revision_id
    WHERE entry.id = NEW.content_id
      AND revision.content_id = entry.id
      AND revision.version = entry.version
      AND entry.status = 'pending_review'
      AND entry.submitted_by = NEW.actor_staff_id
  )
BEGIN
  SELECT RAISE(ABORT, 'Submission event does not match content state');
END;

CREATE TRIGGER content_review_events_validate_approval
BEFORE INSERT ON content_review_events
WHEN NEW.action = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM content_entries AS entry
    JOIN content_revisions AS revision ON revision.id = NEW.revision_id
    WHERE entry.id = NEW.content_id
      AND revision.content_id = entry.id
      AND revision.version = entry.version
      AND entry.status = 'approved'
      AND entry.approved_by = NEW.actor_staff_id
      AND NEW.is_self_approval = (entry.submitted_by = NEW.actor_staff_id)
  )
BEGIN
  SELECT RAISE(ABORT, 'Approval event does not match content state');
END;

CREATE TRIGGER content_review_events_validate_publication
BEFORE INSERT ON content_review_events
WHEN NEW.action = 'published'
  AND NOT EXISTS (
    SELECT 1 FROM content_entries AS entry
    JOIN content_revisions AS revision ON revision.id = NEW.revision_id
    WHERE entry.id = NEW.content_id
      AND revision.content_id = entry.id
      AND revision.version = entry.version
      AND entry.status = 'published'
      AND entry.published_by = NEW.actor_staff_id
  )
BEGIN
  SELECT RAISE(ABORT, 'Publication event does not match content state');
END;

CREATE TRIGGER content_review_events_validate_archive
BEFORE INSERT ON content_review_events
WHEN NEW.action = 'archived'
  AND NOT EXISTS (
    SELECT 1 FROM content_entries AS entry
    WHERE entry.id = NEW.content_id
      AND entry.status = 'archived'
      AND entry.archived_by = NEW.actor_staff_id
  )
BEGIN
  SELECT RAISE(ABORT, 'Archive event does not match content state');
END;
