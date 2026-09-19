import { authenticateActiveStaff } from "@/backend/auth/staff-authentication";
import { requireCloudflareBindings } from "@/backend/cloudflare/bindings";
import {
  applicationErrorResponse,
  privateJsonResponse,
} from "@/backend/http/responses";
import { PrayerRepository } from "@/backend/repositories/prayer-repository";
import { PrayerService } from "@/backend/services/prayer-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  try {
    const environment = await requireCloudflareBindings();
    const actor = await authenticateActiveStaff(
      request.headers,
      environment,
      environment.DB,
    );
    const { requestId } = await context.params;
    const service = new PrayerService({
      repository: new PrayerRepository(environment.DB),
    });
    return privateJsonResponse({
      contact: await service.getContact(actor, requestId),
    });
  } catch (error) {
    return applicationErrorResponse(error);
  }
}
