import { verifyCloudflareAccessHeaders } from "@/server/auth/cloudflare-access";
import { requireCloudflareBindings } from "@/server/cloudflare/bindings";
import {
  applicationErrorResponse,
  privateJsonResponse,
} from "@/server/http/responses";
import { requireSameOrigin } from "@/server/http/request-security";
import { AccessControlRepository } from "@/server/repositories/access-control-repository";
import { AccessControlService } from "@/server/services/access-control-service";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const environment = await requireCloudflareBindings();
    const identity = await verifyCloudflareAccessHeaders(
      request.headers,
      environment,
    );
    const service = new AccessControlService(
      new AccessControlRepository(environment.DB),
    );
    const result = await service.activatePendingInvitation(identity);
    return privateJsonResponse(result, 201);
  } catch (error) {
    return applicationErrorResponse(error);
  }
}
