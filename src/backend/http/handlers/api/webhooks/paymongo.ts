import { requirePayMongoCloudflareBindings } from "@/backend/cloudflare/bindings";
import { readLimitedText } from "@/backend/http/request-security";
import { verifyPayMongoWebhook } from "@/backend/integrations/paymongo";
import { GivingCheckoutRepository } from "@/backend/repositories/giving-checkout-repository";
import { GivingCheckoutService } from "@/backend/services/giving-checkout-service";

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
} as const;

export async function POST(request: Request) {
  try {
    const environment = await requirePayMongoCloudflareBindings();
    if (!environment.PAYMONGO_WEBHOOK_SECRET) {
      return Response.json(
        { received: false },
        { status: 503, headers: responseHeaders },
      );
    }
    const rawBody = await readLimitedText(request, 65_536);
    await verifyPayMongoWebhook({
      rawBody,
      signatureHeader: request.headers.get("paymongo-signature"),
      webhookSecret: environment.PAYMONGO_WEBHOOK_SECRET,
      mode: environment.PAYMONGO_MODE === "live" ? "live" : "test",
    });
    const payload: unknown = JSON.parse(rawBody);
    const service = new GivingCheckoutService({
      repository: new GivingCheckoutRepository(environment.DB),
    });
    await service.recordVerifiedPaidWebhook(payload, await eventKey(rawBody));
    return Response.json(
      { received: true },
      { status: 200, headers: responseHeaders },
    );
  } catch {
    return Response.json(
      { received: false },
      { status: 400, headers: responseHeaders },
    );
  }
}

async function eventKey(rawBody: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(rawBody),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
