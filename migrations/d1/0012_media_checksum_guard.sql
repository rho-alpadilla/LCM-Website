-- A stored checksum may be written only once while completing a pending upload.

CREATE TRIGGER media_assets_checksum_write_once
BEFORE UPDATE OF checksum_sha256 ON media_assets
WHEN NOT (
  OLD.upload_status = 'pending'
  AND NEW.upload_status = 'ready'
  AND OLD.checksum_sha256 IS NULL
  AND NEW.checksum_sha256 IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'Media checksum is write-once during upload completion');
END;
