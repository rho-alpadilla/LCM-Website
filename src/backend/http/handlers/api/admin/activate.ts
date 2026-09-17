import { verifyCloudflareAccessHeaders } from "@/backend/auth/cloudflare-access";
import { requireCloudflareBindings } from "@/backend/cloudflare/bindings";
import {
  applicationErrorResponse,
  privateJsonResponse,
} from "@/backend/http/responses";
import { requireSameOrigin } from "@/backend/http/request-security";
import { AccessControlRepository } from "@/backend/repositories/access-control-repository";
import { AccessControlService } from "@/backend/services/access-control-service";

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
