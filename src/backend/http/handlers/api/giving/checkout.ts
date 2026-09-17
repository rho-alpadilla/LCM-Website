import { z } from "zod";

import { requirePayMongoCloudflareBindings } from "@/backend/cloudflare/bindings";
import {
  requireConfiguredRequestHostname,
  readLimitedJson,
  requireSameOrigin,
} from "@/backend/http/request-security";
import { PayMongoClient } from "@/backend/integrations/paymongo";
import { GivingCheckoutRepository } from "@/backend/repositories/giving-checkout-repository";
import { anonymousRateLimitKey, verifyTurnstile } from "@/backend/security/turnstile";
import { GivingCheckoutService } from "@/backend/services/giving-checkout-service";


const submissionSchema = z.object({
  amount: z.string().trim().max(16),
  purpose: z.enum(["general_church", "church_building", "love_gift"]),
  idempotencyKey: z.uuid(),
  turnstileToken: z.string().min(1).max(2048),
});

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
} as const;

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const environment = await requirePayMongoCloudflareBindings();
    requireConfiguredRequestHostname(request, environment.TURNSTILE_HOSTNAMES);
    const rateLimit = await environment.GIVING_CHECKOUT_RATE_LIMITER.limit({
      key: await anonymousRateLimitKey(request.headers),
    });
    if (!rateLimit.success) {
      return Response.json(
        { message: "Please wait a moment before starting another checkout." },
        { status: 429, headers: responseHeaders },
      );
    }

    const input = submissionSchema.parse(await readLimitedJson(request, 4_096));
    await verifyTurnstile({
      token: input.turnstileToken,
      remoteIp: request.headers.get("cf-connecting-ip"),
      secret: environment.TURNSTILE_SECRET,
      allowedHostnames: environment.TURNSTILE_HOSTNAMES,
      expectedAction: "giving_checkout",
    });
    if (!environment.PAYMONGO_SECRET_KEY) {
      return Response.json(
        { message: "Online giving is not configured in this environment yet." },
        { status: 503, headers: responseHeaders },
      );
    }

    const origin = new URL(request.url).origin;
    const service = new GivingCheckoutService({
      repository: new GivingCheckoutRepository(environment.DB),
      payMongo: new PayMongoClient({
        secretKey: environment.PAYMONGO_SECRET_KEY,
      }),
    });
    const checkout = await service.start({
      amount: input.amount,
      purpose: input.purpose,
      idempotencyKey: input.idempotencyKey,
      successUrl: `${origin}/give/success`,
      cancelUrl: `${origin}/give`,
    });
    return Response.json(checkout, { status: 201, headers: responseHeaders });
  } catch (error) {
    const status =
      error instanceof Error && "code" in error && error.code === "CONFLICT"
        ? 409
        : 400;
    return Response.json(
      {
        message:
          status === 409
            ? "A checkout is already being prepared. Please wait a moment."
            : "The secure checkout could not be started. Check the amount and try again.",
      },
      { status, headers: responseHeaders },
    );
  }
}
