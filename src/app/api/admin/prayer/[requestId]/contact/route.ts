import { authenticateActiveStaff } from "@/server/auth/staff-authentication";
import { requireCloudflareBindings } from "@/server/cloudflare/bindings";
import {
  applicationErrorResponse,
  privateJsonResponse,
} from "@/server/http/responses";
import { PrayerRepository } from "@/server/repositories/prayer-repository";
import { PrayerService } from "@/server/services/prayer-service";

export const dynamic = "force-dynamic";

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
