import { describe, expect, it, vi } from "vitest";

import { ApplicationError } from "@/shared/errors/application-error";
import type { PayMongoClient } from "@/backend/integrations/paymongo";
import type {
  GivingCheckoutRecord,
  GivingCheckoutRepositoryPort,
} from "@/backend/repositories/giving-checkout-repository";

import { GivingCheckoutService } from "./giving-checkout-service";

const ids = [
  "8d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
  "9d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
  "ad3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
];

function repository(
  overrides: Partial<GivingCheckoutRepositoryPort> = {},
): GivingCheckoutRepositoryPort {
  return {
    findByIdempotencyKey: vi.fn().mockResolvedValue(null),
    findByProviderCheckoutSessionId: vi.fn().mockResolvedValue(null),
    createInitiated: vi.fn().mockResolvedValue(true),
    restartFailed: vi.fn().mockResolvedValue(true),
    markReady: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
    markPaidAndRecordWebhook: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function payMongo() {
  return {
    createCheckoutSession: vi.fn().mockResolvedValue({
      checkoutSessionId: "cs_synthetic",
      checkoutUrl: "https://checkout.paymongo.com/cs_synthetic",
    }),
  } as unknown as PayMongoClient;
}

function service(repo = repository(), provider = payMongo()) {
  return new GivingCheckoutService({
    repository: repo,
    payMongo: provider,
    createId: () => ids.shift() ?? crypto.randomUUID(),
    now: () => new Date("2026-09-17T13:00:00.000Z"),
  });
}

const validInput = {
  idempotencyKey: "7d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
  purpose: "general_church",
  amount: "500.50",
  successUrl: "https://example.test/give/success",
  cancelUrl: "https://example.test/give",
};

describe("GivingCheckoutService", () => {
  it("creates a server-validated checkout within the approved amount range", async () => {
    const repo = repository();
    const provider = payMongo();

    await expect(service(repo, provider).start(validInput)).resolves.toEqual({
      referenceNumber: "LCM-9D3A2EE47F944E95AE5B",
      checkoutUrl: "https://checkout.paymongo.com/cs_synthetic",
    });
    expect(repo.createInitiated).toHaveBeenCalledWith(
      expect.objectContaining({
        amountMinor: 50050,
        purpose: "general_church",
      }),
    );
    expect(provider.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        amountMinor: 50050,
        paymentMethodTypes: ["card", "gcash", "qrph"],
      }),
    );
  });

  it.each(["0", "0.99", "100000.01"])(
    "rejects an amount outside the approved range: %s",
    async (amount) => {
      await expect(
        service().start({ ...validInput, amount }),
      ).rejects.toBeTruthy();
    },
  );

  it("reuses the existing provider checkout for a repeated idempotency key", async () => {
    const existing: GivingCheckoutRecord = {
      id: "checkout-id",
      idempotencyKey: validInput.idempotencyKey,
      referenceNumber: "LCM-EXISTING",
      purpose: "general_church",
      amountMinor: 50050,
      status: "ready",
      providerCheckoutSessionId: "cs_existing",
      providerCheckoutUrl: "https://checkout.paymongo.com/cs_existing",
      providerPaymentId: null,
    };
    const repo = repository({
      findByIdempotencyKey: vi.fn().mockResolvedValue(existing),
    });
    const provider = payMongo();

    await expect(service(repo, provider).start(validInput)).resolves.toEqual({
      referenceNumber: "LCM-EXISTING",
      checkoutUrl: "https://checkout.paymongo.com/cs_existing",
    });
    expect(provider.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("records a matched verified paid webhook using its net donation amount", async () => {
    const checkout: GivingCheckoutRecord = {
      id: "checkout-id",
      idempotencyKey: validInput.idempotencyKey,
      referenceNumber: "LCM-EXISTING",
      purpose: "general_church",
      amountMinor: 50050,
      status: "ready",
      providerCheckoutSessionId: "cs_existing",
      providerCheckoutUrl: "https://checkout.paymongo.com/cs_existing",
      providerPaymentId: null,
    };
    const repo = repository({
      findByProviderCheckoutSessionId: vi.fn().mockResolvedValue(checkout),
    });
    const result = await service(repo).recordVerifiedPaidWebhook(
      {
        event_type: "send.webhook",
        data: {
          type: "checkout_session.payment.paid",
          data: {
            id: "cs_existing",
            attributes: {
              payments: [
                {
                  id: "pay_synthetic",
                  attributes: {
                    status: "paid",
                    currency: "PHP",
                    net_amount: 50050,
                  },
                },
              ],
            },
          },
        },
      },
      "checkout_session.payment.paid:cs_existing",
    );

    expect(result).toEqual({ matched: true, referenceNumber: "LCM-EXISTING" });
    expect(repo.markPaidAndRecordWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        providerCheckoutSessionId: "cs_existing",
        providerPaymentId: "pay_synthetic",
      }),
    );
  });

  it("does not match a webhook whose net donation amount differs", async () => {
    const repo = repository({
      findByProviderCheckoutSessionId: vi.fn().mockResolvedValue({
        id: "checkout-id",
        amountMinor: 50000,
        providerPaymentId: null,
      }),
    });
    await expect(
      service(repo).recordVerifiedPaidWebhook(
        {
          data: {
            type: "checkout_session.payment.paid",
            data: {
              id: "cs_existing",
              attributes: {
                payments: [
                  {
                    id: "pay_synthetic",
                    attributes: {
                      status: "paid",
                      currency: "PHP",
                      net_amount: 50050,
                    },
                  },
                ],
              },
            },
          },
        },
        "checkout_session.payment.paid:cs_existing",
      ),
    ).resolves.toEqual({ matched: false });
    expect(repo.markPaidAndRecordWebhook).not.toHaveBeenCalled();
  });

  it("returns a conflict when a checkout is already being prepared", async () => {
    const repo = repository({
      findByIdempotencyKey: vi.fn().mockResolvedValue({
        id: "checkout-id",
        status: "initiated",
        providerCheckoutUrl: null,
      }),
    });
    await expect(service(repo).start(validInput)).rejects.toBeInstanceOf(
      ApplicationError,
    );
  });
});
