import "server-only";

import { requireActiveStaffSession } from "@/backend/auth/staff-context";
import { ContentRepository } from "@/backend/repositories/content-repository";
import { MediaRepository } from "@/backend/repositories/media-repository";
import { ContentWorkflowService } from "@/backend/services/content-workflow-service";

export async function getContentWorkspace() {
  const { context, environment } = await requireActiveStaffSession();
  const service = new ContentWorkflowService(
    new ContentRepository(environment.DB),
  );
  return { context, content: await service.listForActor(context) };
}

export async function getContentEditor(contentId: string) {
  const { context, environment } = await requireActiveStaffSession();
  const repository = new ContentRepository(environment.DB);
  const service = new ContentWorkflowService(repository);
  const editor = await service.getForActor(context, contentId);
  const references = await repository.listContent([
    "ministry",
    "series",
    "speaker",
  ]);
  const mediaAssets = context.permissions.includes("content.media.manage")
    ? await new MediaRepository(environment.DB).listReadyAssets()
    : [];
  return { context, editor, references, mediaAssets };
}
