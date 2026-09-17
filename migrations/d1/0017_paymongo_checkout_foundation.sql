PRAGMA foreign_keys = ON;

-- Website payment records are deliberately minimal. PayMongo remains the
-- source of truth; bookkeeping and donor records belong to the future ChMS.
CREATE TABLE giving_checkout_sessions (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE CHECK (length(idempotency_key) BETWEEN 36 AND 64),
  reference_number TEXT NOT NULL UNIQUE CHECK (length(reference_number) BETWEEN 12 AND 80),
  purpose TEXT NOT NULL CHECK (purpose IN ('general_church', 'church_building', 'love_gift')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor BETWEEN 100 AND 10000000),
  currency TEXT NOT NULL DEFAULT 'PHP' CHECK (currency = 'PHP'),
  status TEXT NOT NULL CHECK (status IN ('initiated', 'ready', 'paid', 'failed')),
  provider_checkout_session_id TEXT UNIQUE,
  provider_checkout_url TEXT,
  provider_payment_id TEXT UNIQUE,
  failure_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  paid_at TEXT,
  CHECK (
    (status = 'initiated' AND provider_checkout_session_id IS NULL
      AND provider_checkout_url IS NULL AND provider_payment_id IS NULL)
    OR (status = 'ready' AND provider_checkout_session_id IS NOT NULL
      AND provider_checkout_url IS NOT NULL AND provider_payment_id IS NULL)
    OR (status = 'paid' AND provider_checkout_session_id IS NOT NULL
      AND provider_checkout_url IS NOT NULL AND provider_payment_id IS NOT NULL
      AND paid_at IS NOT NULL)
    OR status = 'failed'
  )
);

CREATE TABLE paymongo_webhook_events (
  id TEXT PRIMARY KEY,
  provider_event_key TEXT NOT NULL UNIQUE CHECK (length(provider_event_key) BETWEEN 16 AND 160),
  event_type TEXT NOT NULL CHECK (event_type = 'checkout_session.payment.paid'),
  checkout_session_id TEXT NOT NULL REFERENCES giving_checkout_sessions(id) ON DELETE RESTRICT,
  provider_checkout_session_id TEXT NOT NULL,
  received_at TEXT NOT NULL,
  processed_at TEXT NOT NULL
);

CREATE INDEX giving_checkout_sessions_status_created_idx
ON giving_checkout_sessions(status, created_at DESC);

CREATE TRIGGER giving_checkout_sessions_no_delete
BEFORE DELETE ON giving_checkout_sessions
BEGIN SELECT RAISE(ABORT, 'Checkout records cannot be deleted'); END;

CREATE TRIGGER giving_checkout_sessions_facts_immutable
BEFORE UPDATE OF idempotency_key, reference_number, purpose, amount_minor, currency, created_at
ON giving_checkout_sessions
BEGIN SELECT RAISE(ABORT, 'Checkout facts are immutable'); END;

CREATE TRIGGER giving_checkout_sessions_provider_identity_immutable
BEFORE UPDATE OF provider_checkout_session_id ON giving_checkout_sessions
WHEN OLD.provider_checkout_session_id IS NOT NULL
  AND NEW.provider_checkout_session_id != OLD.provider_checkout_session_id
BEGIN SELECT RAISE(ABORT, 'Provider checkout identity is immutable'); END;

CREATE TRIGGER giving_checkout_sessions_valid_status_transition
BEFORE UPDATE OF status ON giving_checkout_sessions
WHEN NOT (
  (OLD.status = 'initiated' AND NEW.status IN ('ready', 'failed'))
  OR (OLD.status = 'ready' AND NEW.status IN ('paid', 'failed'))
  OR (OLD.status = 'failed' AND NEW.status IN ('initiated', 'paid'))
  OR (OLD.status = 'paid' AND NEW.status = 'paid')
)
BEGIN SELECT RAISE(ABORT, 'Invalid checkout status transition'); END;

CREATE TRIGGER paymongo_webhook_events_no_delete
BEFORE DELETE ON paymongo_webhook_events
BEGIN SELECT RAISE(ABORT, 'Payment webhook events cannot be deleted'); END;

CREATE TRIGGER paymongo_webhook_events_identity_immutable
BEFORE UPDATE OF provider_event_key, event_type, checkout_session_id, provider_checkout_session_id, received_at
ON paymongo_webhook_events
BEGIN SELECT RAISE(ABORT, 'Payment webhook identities are immutable'); END;
