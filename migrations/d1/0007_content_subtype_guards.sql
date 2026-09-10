-- Keep shared content records and their type-specific records consistent.

CREATE TRIGGER content_entries_prevent_type_change
BEFORE UPDATE OF content_type ON content_entries
WHEN NEW.content_type <> OLD.content_type
BEGIN
  SELECT RAISE(ABORT, 'Content type is immutable');
END;

CREATE TRIGGER ministries_require_matching_type
BEFORE INSERT ON ministries
WHEN NOT EXISTS (
  SELECT 1 FROM content_entries WHERE id = NEW.content_id AND content_type = 'ministry'
)
BEGIN
  SELECT RAISE(ABORT, 'Ministry details require ministry content');
END;

CREATE TRIGGER sermon_series_require_matching_type
BEFORE INSERT ON sermon_series
WHEN NOT EXISTS (
  SELECT 1 FROM content_entries WHERE id = NEW.content_id AND content_type = 'series'
)
BEGIN
  SELECT RAISE(ABORT, 'Series details require series content');
END;

CREATE TRIGGER speakers_require_matching_type
BEFORE INSERT ON speakers
WHEN NOT EXISTS (
  SELECT 1 FROM content_entries WHERE id = NEW.content_id AND content_type = 'speaker'
)
BEGIN
  SELECT RAISE(ABORT, 'Speaker details require speaker content');
END;

CREATE TRIGGER sermons_require_matching_type
BEFORE INSERT ON sermons
WHEN NOT EXISTS (
  SELECT 1 FROM content_entries WHERE id = NEW.content_id AND content_type = 'sermon'
)
BEGIN
  SELECT RAISE(ABORT, 'Sermon details require sermon content');
END;

CREATE TRIGGER announcements_require_matching_type
BEFORE INSERT ON announcements
WHEN NOT EXISTS (
  SELECT 1 FROM content_entries WHERE id = NEW.content_id AND content_type = 'announcement'
)
BEGIN
  SELECT RAISE(ABORT, 'Announcement details require announcement content');
END;

CREATE TRIGGER bulletins_require_matching_type
BEFORE INSERT ON bulletins
WHEN NOT EXISTS (
  SELECT 1 FROM content_entries WHERE id = NEW.content_id AND content_type = 'bulletin'
)
BEGIN
  SELECT RAISE(ABORT, 'Bulletin details require bulletin content');
END;

CREATE TRIGGER schedule_items_require_matching_type
BEFORE INSERT ON schedule_items
WHEN NOT EXISTS (
  SELECT 1 FROM content_entries WHERE id = NEW.content_id AND content_type = 'schedule'
)
BEGIN
  SELECT RAISE(ABORT, 'Schedule details require schedule content');
END;

CREATE TRIGGER content_entries_require_subtype_before_review
BEFORE UPDATE OF status ON content_entries
WHEN NEW.status = 'pending_review'
  AND (
    (NEW.content_type = 'ministry' AND NOT EXISTS (SELECT 1 FROM ministries WHERE content_id = NEW.id))
    OR (NEW.content_type = 'series' AND NOT EXISTS (SELECT 1 FROM sermon_series WHERE content_id = NEW.id))
    OR (NEW.content_type = 'speaker' AND NOT EXISTS (SELECT 1 FROM speakers WHERE content_id = NEW.id))
    OR (NEW.content_type = 'sermon' AND NOT EXISTS (SELECT 1 FROM sermons WHERE content_id = NEW.id))
    OR (NEW.content_type = 'announcement' AND NOT EXISTS (SELECT 1 FROM announcements WHERE content_id = NEW.id))
    OR (NEW.content_type = 'bulletin' AND NOT EXISTS (SELECT 1 FROM bulletins WHERE content_id = NEW.id))
    OR (NEW.content_type = 'schedule' AND NOT EXISTS (SELECT 1 FROM schedule_items WHERE content_id = NEW.id))
  )
BEGIN
  SELECT RAISE(ABORT, 'Type-specific content details are required before review');
END;

CREATE TRIGGER content_entries_require_ready_media_before_publish
BEFORE UPDATE OF status ON content_entries
WHEN NEW.status = 'published'
  AND (
    (NEW.cover_media_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM media_assets
      WHERE id = NEW.cover_media_id AND upload_status = 'ready'
    ))
    OR (NEW.content_type = 'bulletin' AND NOT EXISTS (
      SELECT 1 FROM bulletins AS bulletin
      JOIN media_assets AS media ON media.id = bulletin.file_media_id
      WHERE bulletin.content_id = NEW.id
        AND media.storage_scope = 'bulletins'
        AND media.mime_type = 'application/pdf'
        AND media.upload_status = 'ready'
    ))
  )
BEGIN
  SELECT RAISE(ABORT, 'Published content requires ready approved media');
END;
