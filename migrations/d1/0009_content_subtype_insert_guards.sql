-- Prevent new type-specific records from bypassing the draft workflow.

CREATE TRIGGER ministries_require_draft_on_insert
BEFORE INSERT ON ministries
WHEN NOT EXISTS (
  SELECT 1 FROM content_entries
  WHERE id = NEW.content_id AND content_type = 'ministry' AND status = 'draft'
)
BEGIN
  SELECT RAISE(ABORT, 'Only draft ministry details can be created');
END;

CREATE TRIGGER sermon_series_require_draft_on_insert
BEFORE INSERT ON sermon_series
WHEN NOT EXISTS (
  SELECT 1 FROM content_entries
  WHERE id = NEW.content_id AND content_type = 'series' AND status = 'draft'
)
BEGIN
  SELECT RAISE(ABORT, 'Only draft series details can be created');
END;

CREATE TRIGGER speakers_require_draft_on_insert
BEFORE INSERT ON speakers
WHEN NOT EXISTS (
  SELECT 1 FROM content_entries
  WHERE id = NEW.content_id AND content_type = 'speaker' AND status = 'draft'
)
BEGIN
  SELECT RAISE(ABORT, 'Only draft speaker details can be created');
END;

CREATE TRIGGER sermons_require_draft_on_insert
BEFORE INSERT ON sermons
WHEN NOT EXISTS (
  SELECT 1 FROM content_entries
  WHERE id = NEW.content_id AND content_type = 'sermon' AND status = 'draft'
)
BEGIN
  SELECT RAISE(ABORT, 'Only draft sermon details can be created');
END;

CREATE TRIGGER announcements_require_draft_on_insert
BEFORE INSERT ON announcements
WHEN NOT EXISTS (
  SELECT 1 FROM content_entries
  WHERE id = NEW.content_id AND content_type = 'announcement' AND status = 'draft'
)
BEGIN
  SELECT RAISE(ABORT, 'Only draft announcement details can be created');
END;

CREATE TRIGGER bulletins_require_draft_on_insert
BEFORE INSERT ON bulletins
WHEN NOT EXISTS (
  SELECT 1 FROM content_entries
  WHERE id = NEW.content_id AND content_type = 'bulletin' AND status = 'draft'
)
BEGIN
  SELECT RAISE(ABORT, 'Only draft bulletin details can be created');
END;

CREATE TRIGGER schedule_items_require_draft_on_insert
BEFORE INSERT ON schedule_items
WHEN NOT EXISTS (
  SELECT 1 FROM content_entries
  WHERE id = NEW.content_id AND content_type = 'schedule' AND status = 'draft'
)
BEGIN
  SELECT RAISE(ABORT, 'Only draft schedule details can be created');
END;
