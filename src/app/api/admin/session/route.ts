import { authenticateActiveStaff } from "@/server/auth/staff-authentication";
import { requireCloudflareBindings } from "@/server/cloudflare/bindings";
import {
  applicationErrorResponse,
  privateJsonResponse,
} from "@/server/http/responses";

export const dynamic = "force-dynamic";

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
