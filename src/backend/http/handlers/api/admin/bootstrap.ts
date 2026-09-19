import { z } from "zod";

import { verifyCloudflareAccessHeaders } from "@/backend/auth/cloudflare-access";
import { requireCloudflareBindings } from "@/backend/cloudflare/bindings";
import {
  applicationErrorResponse,
  privateJsonResponse,
} from "@/backend/http/responses";
import {
  readLimitedJson,
  requireSameOrigin,
} from "@/backend/http/request-security";
import { AccessControlRepository } from "@/backend/repositories/staff/access-control-repository";
import { AccessControlService } from "@/backend/services/staff/access-control-service";

const bootstrapBodySchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  reason: z.string().trim().min(10).max(500),
});

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);

    const environment = await requireCloudflareBindings();
    const identity = await verifyCloudflareAccessHeaders(
      request.headers,
      environment,
    );
    const body = bootstrapBodySchema.parse(await readLimitedJson(request));
    const service = new AccessControlService(
      new AccessControlRepository(environment.DB),
    );
    const result = await service.bootstrapFirstSystemAdministrator({
      ...identity,
      ...body,
    });

    return privateJsonResponse(result, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return privateJsonResponse(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Enter a valid display name and setup reason.",
          },
        },
        400,
      );
    }

    return applicationErrorResponse(error);
  }
}
