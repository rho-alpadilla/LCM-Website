import { z } from "zod";

import { requirePrayerCloudflareBindings } from "@/server/cloudflare/bindings";
import {
  readLimitedJson,
  requireSameOrigin,
} from "@/server/http/request-security";
import { PrayerRepository } from "@/server/repositories/prayer-repository";
import {
  anonymousRateLimitKey,
  verifyTurnstile,
} from "@/server/security/turnstile";
import { PrayerService } from "@/server/services/prayer-service";

export const dynamic = "force-dynamic";

const nullableText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || null);

const submissionSchema = z
  .object({
    requestText: z.string().trim().min(1).max(5000),
    privacyScope: z.enum(["team", "pastoral_only"]),
    name: nullableText(120),
    email: z
      .union([z.literal(""), z.email().max(254)])
      .transform((value) => value || null),
    phone: nullableText(40).refine(
      (value) => value === null || value.length >= 7,
      "Enter a valid phone number.",
    ),
    preferredContact: z.enum(["none", "email", "phone"]),
    followUpConsent: z.boolean(),
    privacyAcknowledged: z.literal(true),
    turnstileToken: z.string().min(1).max(2048),
  })
  .superRefine((value, context) => {
    if (
      !value.followUpConsent &&
      (value.email || value.phone || value.preferredContact !== "none")
    ) {
      context.addIssue({
        code: "custom",
        message: "Contact details require follow-up consent.",
      });
    }
  });

const publicHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
} as const;
const genericMessage =
  "If the request could be accepted, it has been shared with the permitted prayer team.";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const environment = await requirePrayerCloudflareBindings();
    const rateLimitKey = await anonymousRateLimitKey(request.headers);
    const rateLimit = await environment.PRAYER_SUBMISSION_RATE_LIMITER.limit({
      key: rateLimitKey,
    });
    if (!rateLimit.success)
      return Response.json(
        { message: genericMessage },
        { status: 429, headers: publicHeaders },
      );

    const input = submissionSchema.parse(
      await readLimitedJson(request, 16_384),
    );
    await verifyTurnstile({
      token: input.turnstileToken,
      remoteIp: request.headers.get("cf-connecting-ip"),
      secret: environment.TURNSTILE_SECRET,
      allowedHostnames: environment.TURNSTILE_HOSTNAMES,
      expectedAction: "prayer_request",
    });

    const hasContact = Boolean(input.name || input.followUpConsent);
    const service = new PrayerService({
      repository: new PrayerRepository(environment.DB),
    });
    await service.submitPublic({
      requestText: input.requestText,
      privacyScope: input.privacyScope,
      contact: hasContact
        ? {
            name: input.name,
            email: input.email,
            phone: input.phone,
            preferredContact: input.preferredContact,
            followUpConsent: input.followUpConsent,
          }
        : null,
    });
    return Response.json(
      { message: genericMessage },
      { status: 202, headers: publicHeaders },
    );
  } catch {
    return Response.json(
      {
        message:
          "The request could not be submitted. Please check the form and try again.",
      },
      { status: 400, headers: publicHeaders },
    );
  }
}
