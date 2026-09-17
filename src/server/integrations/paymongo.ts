import { z } from "zod";

import { ApplicationError } from "@/lib/errors/application-error";

export const givingPurposeSchema = z.enum([
  "general_church",
  "church_building",
  "love_gift",
]);

export type GivingPurpose = z.infer<typeof givingPurposeSchema>;
export type PayMongoPaymentMethod = "card" | "gcash" | "qrph";

const purposeLabels: Record<GivingPurpose, string> = {
  general_church: "Tithes & Offerings",
  church_building: "Church Building Fund",
  love_gift: "Love Gift",
};

const checkoutResponseSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    attributes: z.object({ checkout_url: z.url() }),
  }),
});

export type CreatePayMongoCheckoutInput = {
  amountMinor: number;
  purpose: GivingPurpose;
  referenceNumber: string;
  successUrl: string;
  cancelUrl: string;
  paymentMethodTypes: PayMongoPaymentMethod[];
};

type PayMongoClientOptions = {
  secretKey: string;
  fetcher?: typeof fetch;
  apiBaseUrl?: string;
};

export class PayMongoClient {
  private readonly fetcher: typeof fetch;
  private readonly apiBaseUrl: string;

  constructor(private readonly options: PayMongoClientOptions) {
    this.fetcher = options.fetcher ?? fetch;
    this.apiBaseUrl = options.apiBaseUrl ?? "https://api.paymongo.com";
  }

  async createCheckoutSession(input: CreatePayMongoCheckoutInput) {
    if (!/^sk_(test|live)_/.test(this.options.secretKey)) {
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "The payment provider is not configured.",
      );
    }

    let response: Response;
    try {
      response = await this.fetcher(`${this.apiBaseUrl}/v2/checkout_sessions`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${btoa(`${this.options.secretKey}:`)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            attributes: {
              line_items: [
                {
                  name: purposeLabels[input.purpose],
                  amount: input.amountMinor,
                  currency: "PHP",
                  quantity: 1,
                },
              ],
              payment_method_types: input.paymentMethodTypes,
              success_url: input.successUrl,
              cancel_url: input.cancelUrl,
              reference_number: input.referenceNumber,
              send_email_receipt: true,
              pass_on_fees: true,
              metadata: { giving_purpose: input.purpose },
            },
          },
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (cause) {
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "The secure checkout could not be started.",
        cause,
      );
    }

    const payload = await response.json().catch(() => null);
    const result = checkoutResponseSchema.safeParse(payload);
    if (!response.ok || !result.success) {
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "The secure checkout could not be started.",
      );
    }

    return {
      checkoutSessionId: result.data.data.id,
      checkoutUrl: result.data.data.attributes.checkout_url,
    };
  }
}

type VerifyPayMongoWebhookInput = {
  rawBody: string;
  signatureHeader: string | null;
  webhookSecret: string;
  mode: "test" | "live";
  now?: Date;
  toleranceSeconds?: number;
};

export async function verifyPayMongoWebhook(
  input: VerifyPayMongoWebhookInput,
): Promise<void> {
  const parts = new Map(
    (input.signatureHeader ?? "").split(",").map((part) => {
      const [key, ...value] = part.trim().split("=");
      return [key, value.join("=")];
    }),
  );
  const timestamp = parts.get("t") ?? "";
  const signature = parts.get(input.mode === "live" ? "li" : "te") ?? "";
  const timestampNumber = Number(timestamp);
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000);
  const tolerance = input.toleranceSeconds ?? 300;

  if (
    !input.webhookSecret ||
    !/^\d+$/.test(timestamp) ||
    !/^[a-f0-9]{64}$/i.test(signature) ||
    !Number.isSafeInteger(timestampNumber) ||
    Math.abs(nowSeconds - timestampNumber) > tolerance
  ) {
    throw new ApplicationError("FORBIDDEN", "Invalid webhook signature.");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(input.webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${input.rawBody}`),
  );
  const expected = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  if (!constantTimeEqual(expected, signature.toLowerCase())) {
    throw new ApplicationError("FORBIDDEN", "Invalid webhook signature.");
  }
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}
