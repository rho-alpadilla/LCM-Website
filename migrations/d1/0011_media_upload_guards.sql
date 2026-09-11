-- Restrict media metadata changes to safe upload lifecycle transitions.

CREATE TRIGGER media_assets_core_fields_immutable
BEFORE UPDATE ON media_assets
WHEN NEW.id <> OLD.id
  OR NEW.storage_scope <> OLD.storage_scope
  OR NEW.object_key <> OLD.object_key
  OR NEW.original_name <> OLD.original_name
  OR NEW.mime_type <> OLD.mime_type
  OR NEW.size_bytes <> OLD.size_bytes
  OR NEW.uploaded_by <> OLD.uploaded_by
  OR NEW.created_at <> OLD.created_at
BEGIN
  SELECT RAISE(ABORT, 'Core media metadata is immutable');
END;

CREATE TRIGGER media_assets_validate_status_transition
BEFORE UPDATE OF upload_status ON media_assets
WHEN NOT (
  (OLD.upload_status = 'pending' AND NEW.upload_status IN ('ready', 'quarantined', 'deleted'))
  OR (OLD.upload_status = 'ready' AND NEW.upload_status = 'deleted')
  OR (OLD.upload_status = 'quarantined' AND NEW.upload_status = 'deleted')
  OR NEW.upload_status = OLD.upload_status
)
BEGIN
  SELECT RAISE(ABORT, 'Invalid media upload status transition');
END;

CREATE TRIGGER media_assets_require_checksum_when_ready
BEFORE UPDATE OF upload_status ON media_assets
WHEN NEW.upload_status = 'ready' AND NEW.checksum_sha256 IS NULL
BEGIN
  SELECT RAISE(ABORT, 'Ready media requires a SHA-256 checksum');
END;

CREATE TRIGGER media_assets_require_ready_before_public
BEFORE UPDATE OF visibility ON media_assets
WHEN NEW.visibility = 'public' AND NEW.upload_status <> 'ready'
BEGIN
  SELECT RAISE(ABORT, 'Only ready media can become public');
END;
