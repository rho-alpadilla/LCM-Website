import "server-only";

import { requireActiveStaffSession } from "@/backend/auth/staff-context";
import { MediaRepository } from "@/backend/repositories/media-repository";
import { MediaService } from "@/backend/services/media-service";

export async function getMediaWorkspace() {
  const { context, environment } = await requireActiveStaffSession(
    "content.media.manage",
  );
  const service = new MediaService(
    new MediaRepository(environment.DB),
    environment.WEBSITE_FILES,
  );
  return { context, assets: await service.listReadyAssets(context) };
}
