import { z } from "zod";

import { requireInquiryCloudflareBindings } from "@/backend/cloudflare/bindings";
import {
  readLimitedJson,
  requireSameOrigin,
} from "@/backend/http/request-security";
import { InquiryRepository } from "@/backend/repositories/inquiry-repository";
import {
  anonymousRateLimitKey,
  verifyTurnstile,
} from "@/backend/security/turnstile";
import { InquiryService } from "@/backend/services/inquiry-service";
import { publicInquirySchema } from "@/shared/inquiries/schemas";

const submissionSchema = publicInquirySchema.extend({
  turnstileToken: z.string().min(1).max(2048),
});

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
} as const;

const acceptedMessage =
  "If your message could be accepted, it has been shared with the appropriate church team.";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const environment = await requireInquiryCloudflareBindings();
    const rateLimit = await environment.INQUIRY_SUBMISSION_RATE_LIMITER.limit({
      key: await anonymousRateLimitKey(request.headers),
    });
    if (!rateLimit.success) {
      return Response.json(
        { message: acceptedMessage },
        { status: 429, headers: responseHeaders },
      );
    }

    const input = submissionSchema.parse(await readLimitedJson(request, 8_192));
    await verifyTurnstile({
      token: input.turnstileToken,
      remoteIp: request.headers.get("cf-connecting-ip"),
      secret: environment.TURNSTILE_SECRET,
      allowedHostnames: environment.TURNSTILE_HOSTNAMES,
      expectedAction: "visitor_inquiry",
    });
    const service = new InquiryService({
      repository: new InquiryRepository(environment.DB),
    });
    await service.submitPublic({
      inquiryType: input.inquiryType,
      ministryContentId: input.ministryContentId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      preferredContact: input.preferredContact,
      followUpConsent: input.followUpConsent,
      message: input.message,
    });
    return Response.json(
      { message: acceptedMessage },
      { status: 202, headers: responseHeaders },
    );
  } catch {
    return Response.json(
      {
        message:
          "The message could not be submitted. Please check the form and try again.",
      },
      { status: 400, headers: responseHeaders },
    );
  }
}
