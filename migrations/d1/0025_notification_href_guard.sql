-- Prevent notification links from becoming protocol-relative external URLs.

CREATE TRIGGER admin_notifications_require_internal_href
BEFORE INSERT ON admin_notifications
WHEN NEW.href NOT GLOB '/*' OR NEW.href GLOB '//*' OR NEW.href GLOB '*://*'
BEGIN
  SELECT RAISE(ABORT, 'Notification links must use an internal absolute path');
END;
