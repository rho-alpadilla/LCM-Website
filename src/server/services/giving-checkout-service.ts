import { z } from "zod";

import { ApplicationError } from "@/lib/errors/application-error";
import {
  givingPurposeSchema,
  PayMongoClient,
} from "@/server/integrations/paymongo";
import type {
  GivingCheckoutRecord,
  GivingCheckoutRepositoryPort,
} from "@/server/repositories/giving-checkout-repository";

const amountSchema = z
  .string()
  .trim()
  .regex(/^(?:0|[1-9]\d{0,5})(?:\.\d{1,2})?$/, "Enter a valid amount.")
  .transform((amount) => {
    const [whole, fraction = ""] = amount.split(".");
    return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  })
  .refine((amountMinor) => amountMinor >= 100, "The minimum giving amount is ₱1.00.")
  .refine(
    (amountMinor) => amountMinor <= 10_000_000,
    "The maximum giving amount is ₱100,000.00.",
  );

const startCheckoutSchema = z.object({
  idempotencyKey: z.uuid(),
  purpose: givingPurposeSchema,
  amount: amountSchema,
  successUrl: z.url(),
  cancelUrl: z.url(),
});

const paidWebhookSchema = z.object({
  event_type: z.literal("send.webhook").optional(),
  data: z.object({
    type: z.literal("checkout_session.payment.paid"),
    data: z.object({
      id: z.string().trim().min(1).max(120),
      attributes: z.object({
        payments: z
          .array(
            z.object({
              id: z.string().trim().min(1).max(120),
              attributes: z.object({
                status: z.literal("paid"),
                currency: z.literal("PHP"),
                net_amount: z.number().int().positive(),
              }),
            }),
          )
          .min(1),
      }),
    }),
  }),
});

type Dependencies = {
  repository: GivingCheckoutRepositoryPort;
  payMongo?: PayMongoClient;
  createId?: () => string;
  now?: () => Date;
};

export class GivingCheckoutService {
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(private readonly dependencies: Dependencies) {
    this.createId = dependencies.createId ?? (() => crypto.randomUUID());
    this.now = dependencies.now ?? (() => new Date());
  }

  async start(rawInput: unknown) {
    const input = startCheckoutSchema.parse(rawInput);
    const existing = await this.dependencies.repository.findByIdempotencyKey(
      input.idempotencyKey,
    );
    if (
      existing &&
      (existing.purpose !== input.purpose || existing.amountMinor !== input.amount)
    ) {
      throw new ApplicationError(
        "CONFLICT",
        "This giving request does not match the existing secure checkout.",
      );
    }
    if (existing?.providerCheckoutUrl) return checkoutResult(existing);
    if (existing && existing.status !== "failed") {
      throw new ApplicationError(
        "CONFLICT",
        "A secure checkout is already being prepared.",
      );
    }

    const checkout = existing ?? {
      id: this.createId(),
      idempotencyKey: input.idempotencyKey,
      referenceNumber: `LCM-${this.createId()
        .replaceAll("-", "")
        .slice(0, 20)
        .toUpperCase()}`,
      purpose: input.purpose,
      amountMinor: input.amount,
    };
    const now = this.now().toISOString();
    const prepared = existing
      ? await this.dependencies.repository.restartFailed(checkout.id, now)
      : await this.dependencies.repository.createInitiated({ ...checkout, createdAt: now });

    if (!prepared) {
      const current = await this.dependencies.repository.findByIdempotencyKey(
        input.idempotencyKey,
      );
      if (current?.providerCheckoutUrl) return checkoutResult(current);
      throw new ApplicationError(
        "CONFLICT",
        "A secure checkout is already being prepared.",
      );
    }

    try {
      if (!this.dependencies.payMongo) {
        throw new ApplicationError(
          "INTERNAL_ERROR",
          "The payment provider is not configured.",
        );
      }
      const providerCheckout = await this.dependencies.payMongo.createCheckoutSession({
        amountMinor: checkout.amountMinor,
        purpose: checkout.purpose,
        referenceNumber: checkout.referenceNumber,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        paymentMethodTypes: ["card", "gcash", "qrph"],
      });
      await this.dependencies.repository.markReady({
        id: checkout.id,
        providerCheckoutSessionId: providerCheckout.checkoutSessionId,
        providerCheckoutUrl: providerCheckout.checkoutUrl,
        updatedAt: this.now().toISOString(),
      });
      return {
        referenceNumber: checkout.referenceNumber,
        checkoutUrl: providerCheckout.checkoutUrl,
      };
    } catch (error) {
      await this.dependencies.repository.markFailed(
        checkout.id,
        error instanceof ApplicationError ? error.code : "provider_failure",
        this.now().toISOString(),
      );
      throw error;
    }
  }

  async recordVerifiedPaidWebhook(rawPayload: unknown, providerEventKey: string) {
    const payload = paidWebhookSchema.parse(rawPayload);
    const providerCheckoutSessionId = payload.data.data.id;
    const payment = payload.data.data.attributes.payments.at(-1);
    if (!payment) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "Payment details are missing.",
      );
    }
    const checkout =
      await this.dependencies.repository.findByProviderCheckoutSessionId(
        providerCheckoutSessionId,
      );
    // `pass_on_fees` makes PayMongo's net amount the approved gift amount;
    // the separate provider fee is charged on top for the selected method.
    if (
      !checkout ||
      checkout.amountMinor !== payment.attributes.net_amount ||
      (checkout.providerPaymentId && checkout.providerPaymentId !== payment.id)
    ) {
      return { matched: false };
    }

    await this.dependencies.repository.markPaidAndRecordWebhook({
      eventId: this.createId(),
      providerEventKey,
      providerCheckoutSessionId,
      providerPaymentId: payment.id,
      eventType: payload.data.type,
      processedAt: this.now().toISOString(),
      checkoutSessionId: checkout.id,
    });
    return { matched: true, referenceNumber: checkout.referenceNumber };
  }
}

function checkoutResult(checkout: GivingCheckoutRecord) {
  if (!checkout.providerCheckoutUrl) {
    throw new ApplicationError(
      "CONFLICT",
      "A secure checkout is already being prepared.",
    );
  }
  return {
    referenceNumber: checkout.referenceNumber,
    checkoutUrl: checkout.providerCheckoutUrl,
  };
}
