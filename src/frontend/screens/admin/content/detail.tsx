import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getContentEditor } from "@/backend/queries/content/admin-workspace";
import { getAdminNotificationSummary } from "@/backend/queries/admin/notifications";
import { AdminHeader } from "@/frontend/components/admin/admin-header";
import {
  contentStatusLabels,
  contentTypeLabels,
} from "@/shared/content/options";
import { ApplicationError } from "@/shared/errors/application-error";

import { ContentSubtypeEditor } from "./components/subtype-editor";
import { EditorFeedback } from "./components/editor-feedback";
import { MainContentForm } from "./components/main-content-form";
import { ReviewWorkflowPanel } from "./components/review-workflow-panel";
import { ScheduleExceptionForm } from "./components/schedule-exception-form";
import { SubtypeSummary } from "./components/subtype-summary";

type ContentEditorPageProps = {
  params: Promise<{ contentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ContentEditorPage({
  params,
  searchParams,
}: ContentEditorPageProps) {
  const [{ contentId }, parameters] = await Promise.all([params, searchParams]);
  const [state, notifications] = await Promise.all([
    loadEditorState(contentId),
    getAdminNotificationSummary(),
  ]);
  const { editor, references, mediaAssets } = state;
  const { content, subtype } = editor;
  const messageCode = readQueryValue(parameters.message);
  const errorCode = readQueryValue(parameters.error);
  const readyImages = mediaAssets.filter((asset) =>
    asset.mimeType.startsWith("image/"),
  );

  return (
    <div className="min-h-screen bg-slate-100 lg:pl-72">
      <AdminHeader context={state.context} notifications={notifications} />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link
          className="font-semibold text-blue-800"
          href={"/admin/content" as Route}
        >
          ← Back to content
        </Link>
        <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-bold tracking-[0.2em] text-blue-800 uppercase">
              {contentTypeLabels[content.contentType]}
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
              {content.title}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Version {content.version} · /{content.slug}
            </p>
          </div>
          <span className="h-fit rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm">
            {contentStatusLabels[content.status]}
          </span>
        </div>

        <EditorFeedback errorCode={errorCode} messageCode={messageCode} />

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black text-slate-950">Main content</h2>
          {content.status === "draft" ? (
            <MainContentForm content={content} readyImages={readyImages} />
          ) : (
            <div className="mt-5 space-y-4 text-slate-700">
              <p>{content.summary || "No summary provided."}</p>
              <p className="whitespace-pre-wrap">
                {content.body.text || "No body content provided."}
              </p>
            </div>
          )}
        </section>

        {content.contentType === "schedule" &&
        content.status !== "archived" &&
        subtype ? (
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <h2 className="text-2xl font-black text-slate-950">
              Cancel or reschedule one occurrence
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use the original occurrence date. Saving the same date again
              replaces its earlier exception and writes a new audit event.
            </p>
            <ScheduleExceptionForm contentId={content.id} />
          </section>
        ) : null}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black text-slate-950">
            Specific details
          </h2>
          {content.status === "draft" ? (
            <ContentSubtypeEditor
              content={content}
              mediaAssets={mediaAssets}
              references={references}
              subtype={subtype}
            />
          ) : (
            <SubtypeSummary subtype={subtype} />
          )}
        </section>

        <ReviewWorkflowPanel
          content={content}
          permissions={state.context.permissions}
        />
      </main>
    </div>
  );
}

async function loadEditorState(contentId: string) {
  try {
    return await getContentEditor(contentId);
  } catch (error) {
    if (error instanceof ApplicationError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }
}

function readQueryValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}
