"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireActiveStaffSession } from "@/features/auth/staff-context";
import { ContentRepository } from "@/server/repositories/content-repository";
import { ContentSubtypeRepository } from "@/server/repositories/content-subtype-repository";
import { ContentSubtypeService } from "@/server/services/content-subtype-service";
import { ContentWorkflowService } from "@/server/services/content-workflow-service";

const contentIdSchema = z.uuid();
const contentTypeSchema = z.enum([
  "page",
  "ministry",
  "sermon",
  "series",
  "speaker",
  "schedule",
  "announcement",
  "bulletin",
]);

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function nullableText(formData: FormData, name: string) {
  return text(formData, name).trim() || null;
}

function optionalInteger(formData: FormData, name: string) {
  const value = text(formData, name).trim();
  return value ? Number(value) : null;
}

function manilaDateTime(formData: FormData, name: string) {
  const value = text(formData, name).trim();
  return value ? `${value}:00+08:00` : null;
}

function editorPath(contentId: string, query: string) {
  return `/admin/content/${contentId}?${query}` as Route;
}

function services(database: D1Database) {
  return {
    workflow: new ContentWorkflowService(new ContentRepository(database)),
    subtype: new ContentSubtypeService(new ContentSubtypeRepository(database)),
  };
}

async function stateAndId(formData: FormData) {
  const contentId = contentIdSchema.safeParse(text(formData, "contentId"));
  if (!contentId.success)
    redirect("/admin/content?error=invalid_content" as Route);
  const state = await requireActiveStaffSession();
  return { state, contentId: contentId.data };
}

export async function createContentAction(formData: FormData) {
  const contentType = contentTypeSchema.safeParse(
    text(formData, "contentType"),
  );
  if (!contentType.success)
    redirect("/admin/content?error=invalid_content" as Route);
  const state = await requireActiveStaffSession();
  let contentId: string;
  try {
    const result = await services(state.environment.DB).workflow.createDraft(
      state.context,
      {
        contentType: contentType.data,
        slug: text(formData, "slug"),
        title: text(formData, "title"),
        summary: text(formData, "summary"),
        bodyText: "",
      },
    );
    contentId = result.contentId;
    revalidatePath("/admin/content");
  } catch {
    redirect("/admin/content?error=create_failed" as Route);
  }
  redirect(editorPath(contentId, "message=draft_created"));
}

export async function updateContentDraftAction(formData: FormData) {
  const { state, contentId } = await stateAndId(formData);
  try {
    await services(state.environment.DB).workflow.updateDraft(
      state.context,
      contentId,
      {
        slug: text(formData, "slug"),
        title: text(formData, "title"),
        summary: text(formData, "summary"),
        bodyText: text(formData, "bodyText"),
        coverMediaId: null,
      },
    );
    revalidatePath("/admin/content");
    revalidatePath(`/admin/content/${contentId}`);
  } catch {
    redirect(editorPath(contentId, "error=basic_save_failed"));
  }
  redirect(editorPath(contentId, "message=basic_saved"));
}

export async function saveContentSubtypeAction(formData: FormData) {
  const { state, contentId } = await stateAndId(formData);
  const contentType = contentTypeSchema.safeParse(
    text(formData, "contentType"),
  );
  if (!contentType.success || contentType.data === "page") {
    redirect(editorPath(contentId, "error=subtype_save_failed"));
  }
  const subtype = services(state.environment.DB).subtype;
  try {
    switch (contentType.data) {
      case "ministry":
        await subtype.saveMinistry(state.context, contentId, {
          shortName: nullableText(formData, "shortName"),
          contactEmail: nullableText(formData, "contactEmail"),
          contactPhone: nullableText(formData, "contactPhone"),
          sortOrder: optionalInteger(formData, "sortOrder") ?? 0,
        });
        break;
      case "series":
        await subtype.saveSeries(state.context, contentId, {
          startsOn: nullableText(formData, "startsOn"),
          endsOn: nullableText(formData, "endsOn"),
        });
        break;
      case "speaker":
        await subtype.saveSpeaker(state.context, contentId, {
          biography: nullableText(formData, "biography"),
          photoMediaId: nullableText(formData, "photoMediaId"),
          isActive: formData.get("isActive") === "true",
        });
        break;
      case "sermon":
        await subtype.saveSermon(state.context, contentId, {
          seriesContentId: nullableText(formData, "seriesContentId"),
          speakerContentId: nullableText(formData, "speakerContentId"),
          preachedAt: manilaDateTime(formData, "preachedAt"),
          scriptureReference: nullableText(formData, "scriptureReference"),
          videoProvider: text(formData, "videoProvider"),
          videoUrl: text(formData, "videoUrl"),
          durationSeconds: optionalInteger(formData, "durationSeconds"),
        });
        break;
      case "announcement":
        await subtype.saveAnnouncement(state.context, contentId, {
          visibleFrom: manilaDateTime(formData, "visibleFrom"),
          visibleUntil: manilaDateTime(formData, "visibleUntil"),
          priority: optionalInteger(formData, "priority") ?? 0,
        });
        break;
      case "bulletin":
        await subtype.saveBulletin(state.context, contentId, {
          issueDate: text(formData, "issueDate"),
          fileMediaId: text(formData, "fileMediaId"),
          editionLabel: nullableText(formData, "editionLabel"),
        });
        break;
      case "schedule":
        await subtype.saveSchedule(state.context, contentId, {
          activityType: text(formData, "activityType"),
          ministryContentId: nullableText(formData, "ministryContentId"),
          startsAt: manilaDateTime(formData, "startsAt"),
          endsAt: manilaDateTime(formData, "endsAt"),
          timezone: "Asia/Manila",
          recurrenceRule: nullableText(formData, "recurrenceRule"),
          recurrenceUntil: nullableText(formData, "recurrenceUntil"),
          locationName: nullableText(formData, "locationName"),
          locationAddress: nullableText(formData, "locationAddress"),
          locationVisibility: text(formData, "locationVisibility"),
          contactEmail: nullableText(formData, "contactEmail"),
          contactPhone: nullableText(formData, "contactPhone"),
          registrationUrl: nullableText(formData, "registrationUrl"),
        });
        break;
    }
    revalidatePath("/admin/content");
    revalidatePath(`/admin/content/${contentId}`);
  } catch {
    redirect(editorPath(contentId, "error=subtype_save_failed"));
  }
  redirect(editorPath(contentId, "message=details_saved"));
}

export async function saveScheduleExceptionAction(formData: FormData) {
  const { state, contentId } = await stateAndId(formData);
  const action = text(formData, "exceptionAction");
  try {
    await services(state.environment.DB).subtype.saveScheduleException(
      state.context,
      contentId,
      {
        occurrenceDate: text(formData, "occurrenceDate"),
        action,
        replacementStartsAt:
          action === "rescheduled"
            ? manilaDateTime(formData, "replacementStartsAt")
            : null,
        replacementEndsAt:
          action === "rescheduled"
            ? manilaDateTime(formData, "replacementEndsAt")
            : null,
        publicNote: nullableText(formData, "publicNote"),
      },
    );
    revalidatePath(`/admin/content/${contentId}`);
  } catch {
    redirect(editorPath(contentId, "error=exception_save_failed"));
  }
  redirect(editorPath(contentId, "message=exception_saved"));
}

export async function submitContentAction(formData: FormData) {
  const { state, contentId } = await stateAndId(formData);
  try {
    await services(state.environment.DB).workflow.submitForReview(
      state.context,
      contentId,
      text(formData, "changeSummary"),
    );
    revalidatePath("/admin/content");
  } catch {
    redirect(editorPath(contentId, "error=submit_failed"));
  }
  redirect(editorPath(contentId, "message=submitted"));
}

export async function approveContentAction(formData: FormData) {
  const { state, contentId } = await stateAndId(formData);
  try {
    await services(state.environment.DB).workflow.approve(
      state.context,
      contentId,
      text(formData, "reason"),
    );
    revalidatePath("/admin/content");
  } catch {
    redirect(editorPath(contentId, "error=approval_failed"));
  }
  redirect(editorPath(contentId, "message=approved"));
}

export async function requestContentChangesAction(formData: FormData) {
  const { state, contentId } = await stateAndId(formData);
  try {
    await services(state.environment.DB).workflow.requestChanges(
      state.context,
      contentId,
      text(formData, "reason"),
    );
    revalidatePath("/admin/content");
  } catch {
    redirect(editorPath(contentId, "error=change_request_failed"));
  }
  redirect(editorPath(contentId, "message=changes_requested"));
}

export async function publishContentAction(formData: FormData) {
  const { state, contentId } = await stateAndId(formData);
  try {
    await services(state.environment.DB).workflow.publish(
      state.context,
      contentId,
    );
    revalidatePath("/admin/content");
  } catch {
    redirect(editorPath(contentId, "error=publish_failed"));
  }
  redirect(editorPath(contentId, "message=published"));
}

export async function archiveContentAction(formData: FormData) {
  const { state, contentId } = await stateAndId(formData);
  if (formData.get("confirmArchive") !== "yes") {
    redirect(editorPath(contentId, "error=archive_not_confirmed"));
  }
  try {
    await services(state.environment.DB).workflow.archive(
      state.context,
      contentId,
      text(formData, "reason"),
    );
    revalidatePath("/admin/content");
  } catch {
    redirect(editorPath(contentId, "error=archive_failed"));
  }
  redirect(editorPath(contentId, "message=archived"));
}
