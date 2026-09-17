import { describe, expect, it, vi } from "vitest";

import {
  PayMongoClient,
  verifyPayMongoWebhook,
} from "@/backend/integrations/paymongo";

const TEST_API_KEY = ["sk", "test", "synthetic-not-real"].join("_");

async function signature(secret: string, timestamp: string, rawBody: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

describe("PayMongoClient", () => {
  it("creates a V2 hosted checkout without exposing the secret in the body", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        data: {
          id: "cs_synthetic",
          attributes: {
            checkout_url: "https://checkout.paymongo.com/cs_synthetic",
          },
        },
      }),
    );
    const client = new PayMongoClient({
      secretKey: TEST_API_KEY,
      fetcher,
    });

    await expect(
      client.createCheckoutSession({
        amountMinor: 50000,
        purpose: "church_building",
        referenceNumber: "LCM-SYNTHETIC-1",
        successUrl: "https://example.test/give/success",
        cancelUrl: "https://example.test/give",
        paymentMethodTypes: ["card", "gcash", "qrph"],
      }),
    ).resolves.toEqual({
      checkoutSessionId: "cs_synthetic",
      checkoutUrl: "https://checkout.paymongo.com/cs_synthetic",
    });

    const [url, request] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.paymongo.com/v2/checkout_sessions");
    const body = JSON.parse(String(request.body));
    expect(body.data.attributes).toMatchObject({
      pass_on_fees: true,
      send_email_receipt: true,
      reference_number: "LCM-SYNTHETIC-1",
      metadata: { giving_purpose: "church_building" },
    });
    expect(String(request.body)).not.toContain(TEST_API_KEY);
  });

  it("fails closed when the provider response is invalid", async () => {
    const client = new PayMongoClient({
      secretKey: TEST_API_KEY,
      fetcher: vi.fn().mockResolvedValue(Response.json({}, { status: 502 })),
    });
    await expect(
      client.createCheckoutSession({
        amountMinor: 50000,
        purpose: "general_church",
        referenceNumber: "LCM-SYNTHETIC-2",
        successUrl: "https://example.test/give/success",
        cancelUrl: "https://example.test/give",
        paymentMethodTypes: ["gcash"],
      }),
    ).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
  });
});

describe("verifyPayMongoWebhook", () => {
  it("accepts a current test-mode signature over the unmodified body", async () => {
    const rawBody = '{"data":{"id":"evt_synthetic"}}';
    const timestamp = "1789650000";
    const secret = "whsk_synthetic_not_real";
    const digest = await signature(secret, timestamp, rawBody);
    await expect(
      verifyPayMongoWebhook({
        rawBody,
        signatureHeader: `t=${timestamp},te=${digest},li=`,
        webhookSecret: secret,
        mode: "test",
        now: new Date("2026-09-17T13:00:00.000Z"),
      }),
    ).resolves.toBeUndefined();
  });

  it("rejects stale or altered webhook input", async () => {
    const secret = "whsk_synthetic_not_real";
    const digest = await signature(secret, "1789649000", "{}");
    await expect(
      verifyPayMongoWebhook({
        rawBody: '{"altered":true}',
        signatureHeader: `t=1789649000,te=${digest},li=`,
        webhookSecret: secret,
        mode: "test",
        now: new Date("2026-09-17T13:00:00.000Z"),
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
