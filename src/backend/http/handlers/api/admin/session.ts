import { authenticateActiveStaff } from "@/backend/auth/staff-authentication";
import { requireCloudflareBindings } from "@/backend/cloudflare/bindings";
import {
  applicationErrorResponse,
  privateJsonResponse,
} from "@/backend/http/responses";

export async function GET(request: Request) {
  try {
    const environment = await requireCloudflareBindings();
    const context = await authenticateActiveStaff(
      request.headers,
      environment,
      environment.DB,
    );

    return privateJsonResponse({ staff: context });
  } catch (error) {
    return applicationErrorResponse(error);
  }
}
