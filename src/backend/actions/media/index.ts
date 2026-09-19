"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireActiveStaffSession } from "@/backend/auth/staff-context";
import { MediaRepository } from "@/backend/repositories/media/repository";
import { MediaService } from "@/backend/services/media/service";

const scopeSchema = z.enum(["public_content", "bulletins"]);

export async function uploadMediaAction(formData: FormData) {
  const scope = scopeSchema.safeParse(formData.get("storageScope"));
  const file = formData.get("file");
  if (!scope.success || !(file instanceof File)) {
    redirect("/admin/media?error=invalid_upload" as Route);
  }
  const state = await requireActiveStaffSession("content.media.manage");
  try {
    await new MediaService(
      new MediaRepository(state.environment.DB),
      state.environment.WEBSITE_FILES,
    ).upload(state.context, {
      storageScope: scope.data,
      file,
      altText:
        typeof formData.get("altText") === "string"
          ? String(formData.get("altText"))
          : null,
      isDecorative: formData.get("isDecorative") === "yes",
    });
    revalidatePath("/admin/media");
    revalidatePath("/admin/content");
  } catch {
    redirect("/admin/media?error=upload_failed" as Route);
  }
  redirect("/admin/media?message=uploaded" as Route);
}
