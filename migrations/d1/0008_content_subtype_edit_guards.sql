-- Keep type-specific records immutable once content leaves the draft state.

CREATE TRIGGER ministries_require_draft_on_update
BEFORE UPDATE ON ministries
WHEN NOT EXISTS (
  SELECT 1 FROM content_entries
  WHERE id = NEW.content_id AND content_type = 'ministry' AND status = 'draft'
)
BEGIN
  SELECT RAISE(ABORT, 'Only draft ministry details can be edited');
END;

CREATE TRIGGER sermon_series_require_draft_on_update
BEFORE UPDATE ON sermon_series
WHEN NOT EXISTS (
  SELECT 1 FROM content_entries
  WHERE id = NEW.content_id AND content_type = 'series' AND status = 'draft'
)
BEGIN
  SELECT RAISE(ABORT, 'Only draft series details can be edited');
END;

CREATE TRIGGER speakers_require_draft_on_update
BEFORE UPDATE ON speakers
WHEN NOT EXISTS (
  SELECT 1 FROM content_entries
  WHERE id = NEW.content_id AND content_type = 'speaker' AND status = 'draft'
)
BEGIN
  SELECT RAISE(ABORT, 'Only draft speaker details can be edited');
END;

CREATE TRIGGER sermons_require_draft_on_update
BEFORE UPDATE ON sermons
WHEN NOT EXISTS (
  SELECT 1 FROM content_entries
  WHERE id = NEW.content_id AND content_type = 'sermon' AND status = 'draft'
)
BEGIN
  SELECT RAISE(ABORT, 'Only draft sermon details can be edited');
END;

CREATE TRIGGER announcements_require_draft_on_update
BEFORE UPDATE ON announcements
WHEN NOT EXISTS (
  SELECT 1 FROM content_entries
  WHERE id = NEW.content_id AND content_type = 'announcement' AND status = 'draft'
)
BEGIN
  SELECT RAISE(ABORT, 'Only draft announcement details can be edited');
END;

CREATE TRIGGER bulletins_require_draft_on_update
BEFORE UPDATE ON bulletins
WHEN NOT EXISTS (
  SELECT 1 FROM content_entries
  WHERE id = NEW.content_id AND content_type = 'bulletin' AND status = 'draft'
)
BEGIN
  SELECT RAISE(ABORT, 'Only draft bulletin details can be edited');
END;

CREATE TRIGGER schedule_items_require_draft_on_update
BEFORE UPDATE ON schedule_items
WHEN NOT EXISTS (
  SELECT 1 FROM content_entries
  WHERE id = NEW.content_id AND content_type = 'schedule' AND status = 'draft'
)
BEGIN
  SELECT RAISE(ABORT, 'Only draft schedule details can be edited');
END;

CREATE TRIGGER schedule_exceptions_reject_archived_schedule_insert
BEFORE INSERT ON schedule_exceptions
WHEN NOT EXISTS (
  SELECT 1 FROM schedule_items AS schedule
  JOIN content_entries AS content ON content.id = schedule.content_id
  WHERE schedule.content_id = NEW.schedule_content_id
    AND content.status <> 'archived'
)
BEGIN
  SELECT RAISE(ABORT, 'Archived schedules cannot receive exceptions');
END;

CREATE TRIGGER schedule_exceptions_reject_archived_schedule_update
BEFORE UPDATE ON schedule_exceptions
WHEN NOT EXISTS (
  SELECT 1 FROM schedule_items AS schedule
  JOIN content_entries AS content ON content.id = schedule.content_id
  WHERE schedule.content_id = NEW.schedule_content_id
    AND content.status <> 'archived'
)
BEGIN
  SELECT RAISE(ABORT, 'Archived schedules cannot receive exceptions');
END;
