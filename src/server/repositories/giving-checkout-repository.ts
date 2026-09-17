import type { GivingPurpose } from "@/server/integrations/paymongo";

export type CheckoutStatus = "initiated" | "ready" | "paid" | "failed";

export type GivingCheckoutRecord = {
  id: string;
  idempotencyKey: string;
  referenceNumber: string;
  purpose: GivingPurpose;
  amountMinor: number;
  status: CheckoutStatus;
  providerCheckoutSessionId: string | null;
  providerCheckoutUrl: string | null;
  providerPaymentId: string | null;
};

export type CreateCheckoutRecord = Omit<
  GivingCheckoutRecord,
  | "status"
  | "providerCheckoutSessionId"
  | "providerCheckoutUrl"
  | "providerPaymentId"
> & { createdAt: string };

export type PaidWebhookRecord = {
  eventId: string;
  providerEventKey: string;
  checkoutSessionId: string;
  providerCheckoutSessionId: string;
  providerPaymentId: string;
  eventType: "checkout_session.payment.paid";
  processedAt: string;
};

export interface GivingCheckoutRepositoryPort {
  findByIdempotencyKey(idempotencyKey: string): Promise<GivingCheckoutRecord | null>;
  findByProviderCheckoutSessionId(
    providerCheckoutSessionId: string,
  ): Promise<GivingCheckoutRecord | null>;
  createInitiated(record: CreateCheckoutRecord): Promise<boolean>;
  restartFailed(id: string, updatedAt: string): Promise<boolean>;
  markReady(input: {
    id: string;
    providerCheckoutSessionId: string;
    providerCheckoutUrl: string;
    updatedAt: string;
  }): Promise<void>;
  markFailed(id: string, failureCode: string, updatedAt: string): Promise<void>;
  markPaidAndRecordWebhook(record: PaidWebhookRecord): Promise<void>;
}

type CheckoutRow = {
  id: string;
  idempotency_key: string;
  reference_number: string;
  purpose: GivingPurpose;
  amount_minor: number;
  status: CheckoutStatus;
  provider_checkout_session_id: string | null;
  provider_checkout_url: string | null;
  provider_payment_id: string | null;
};

export class GivingCheckoutRepository implements GivingCheckoutRepositoryPort {
  constructor(private readonly database: D1Database) {}

  async findByIdempotencyKey(idempotencyKey: string) {
    const row = await this.database
      .prepare(
        `SELECT id, idempotency_key, reference_number, purpose, amount_minor,
                status, provider_checkout_session_id, provider_checkout_url,
                provider_payment_id
         FROM giving_checkout_sessions
         WHERE idempotency_key = ?1`,
      )
      .bind(idempotencyKey)
      .first<CheckoutRow>();
    return row ? mapCheckout(row) : null;
  }

  async findByProviderCheckoutSessionId(providerCheckoutSessionId: string) {
    const row = await this.database
      .prepare(
        `SELECT id, idempotency_key, reference_number, purpose, amount_minor,
                status, provider_checkout_session_id, provider_checkout_url,
                provider_payment_id
         FROM giving_checkout_sessions
         WHERE provider_checkout_session_id = ?1`,
      )
      .bind(providerCheckoutSessionId)
      .first<CheckoutRow>();
    return row ? mapCheckout(row) : null;
  }

  async createInitiated(record: CreateCheckoutRecord) {
    const result = await this.database
      .prepare(
        `INSERT OR IGNORE INTO giving_checkout_sessions (
          id, idempotency_key, reference_number, purpose, amount_minor,
          currency, status, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, 'PHP', 'initiated', ?6, ?6)`,
      )
      .bind(
        record.id,
        record.idempotencyKey,
        record.referenceNumber,
        record.purpose,
        record.amountMinor,
        record.createdAt,
      )
      .run();
    return result.meta.changes === 1;
  }

  async restartFailed(id: string, updatedAt: string) {
    const result = await this.database
      .prepare(
        `UPDATE giving_checkout_sessions
         SET status = 'initiated', failure_code = NULL, updated_at = ?2
         WHERE id = ?1
           AND status = 'failed'
           AND provider_checkout_session_id IS NULL`,
      )
      .bind(id, updatedAt)
      .run();
    return result.meta.changes === 1;
  }

  async markReady(input: {
    id: string;
    providerCheckoutSessionId: string;
    providerCheckoutUrl: string;
    updatedAt: string;
  }) {
    await this.database
      .prepare(
        `UPDATE giving_checkout_sessions
         SET status = 'ready', provider_checkout_session_id = ?2,
             provider_checkout_url = ?3, updated_at = ?4
         WHERE id = ?1 AND status = 'initiated'`,
      )
      .bind(
        input.id,
        input.providerCheckoutSessionId,
        input.providerCheckoutUrl,
        input.updatedAt,
      )
      .run();
  }

  async markFailed(id: string, failureCode: string, updatedAt: string) {
    await this.database
      .prepare(
        `UPDATE giving_checkout_sessions
         SET status = 'failed', failure_code = ?2, updated_at = ?3
         WHERE id = ?1 AND status = 'initiated'`,
      )
      .bind(id, failureCode, updatedAt)
      .run();
  }

  async markPaidAndRecordWebhook(record: PaidWebhookRecord) {
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE giving_checkout_sessions
           SET status = 'paid', provider_payment_id = ?2, paid_at = ?3,
               updated_at = ?3, failure_code = NULL
           WHERE id = ?1
             AND status IN ('ready', 'failed', 'paid')
             AND (provider_payment_id IS NULL OR provider_payment_id = ?2)`,
        )
        .bind(record.checkoutSessionId, record.providerPaymentId, record.processedAt),
      this.database
        .prepare(
          `INSERT OR IGNORE INTO paymongo_webhook_events (
            id, provider_event_key, event_type, checkout_session_id,
            provider_checkout_session_id, received_at, processed_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)`,
        )
        .bind(
          record.eventId,
          record.providerEventKey,
          record.eventType,
          record.checkoutSessionId,
          record.providerCheckoutSessionId,
          record.processedAt,
        ),
    ]);
  }
}

function mapCheckout(row: CheckoutRow): GivingCheckoutRecord {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    referenceNumber: row.reference_number,
    purpose: row.purpose,
    amountMinor: row.amount_minor,
    status: row.status,
    providerCheckoutSessionId: row.provider_checkout_session_id,
    providerCheckoutUrl: row.provider_checkout_url,
    providerPaymentId: row.provider_payment_id,
  };
}
