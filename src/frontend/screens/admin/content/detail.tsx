import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";

import { AdminHeader } from "@/frontend/components/admin/admin-header";
import { ContentSubtypeEditor } from "@/frontend/components/admin/content-subtype-editor";
import { getContentEditor } from "@/backend/queries/admin-content";
import {
  approveContentAction,
  archiveContentAction,
  publishContentAction,
  requestContentChangesAction,
  saveScheduleExceptionAction,
  submitContentAction,
  updateContentDraftAction,
} from "@/backend/actions/content";
import {
  contentStatusLabels,
  contentTypeLabels,
} from "@/shared/content/options";
import { ApplicationError } from "@/shared/errors/application-error";

const successMessages: Record<string, string> = {
  draft_created: "Draft created. Add its content and specific details below.",
  basic_saved: "The main content was saved.",
  details_saved: "The specific details were saved.",
  submitted: "The content was submitted for review.",
  approved: "The content was approved.",
  changes_requested: "The content was returned to draft with review notes.",
  published: "The content was published.",
  archived: "The content was archived.",
  exception_saved: "The schedule exception was saved.",
};

const errorMessages: Record<string, string> = {
  basic_save_failed:
    "The main content could not be saved. Check every field and retry.",
  subtype_save_failed:
    "The specific details could not be saved. Check required fields, dates, and links.",
  submit_failed: "Submission failed. Save all required details first.",
  approval_failed:
    "Approval failed. The status or your approval permission may have changed.",
  change_request_failed:
    "The change request failed. Enter a clear reason of at least 10 characters.",
  publish_failed:
    "Publication failed. Approved content and ready media are required.",
  archive_not_confirmed: "Confirm the archive action before continuing.",
  archive_failed:
    "Archiving failed. Enter a reason of at least 10 characters and retry.",
  exception_save_failed:
    "The schedule exception could not be saved. Check the date and replacement times.",
};

type Props = {
  params: Promise<{ contentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ContentEditorPage({
  params,
  searchParams,
}: Props) {
  const [{ contentId }, parameters] = await Promise.all([params, searchParams]);
  let state;
  try {
    state = await getContentEditor(contentId);
  } catch (error) {
    if (error instanceof ApplicationError && error.code === "NOT_FOUND")
      notFound();
    throw error;
  }
  const { editor, references, mediaAssets } = state;
  const messageCode =
    typeof parameters.message === "string" ? parameters.message : "";
  const errorCode =
    typeof parameters.error === "string" ? parameters.error : "";
  const { content, subtype } = editor;
  const can = (permission: string) =>
    state.context.permissions.includes(permission);
  const readyImages = mediaAssets.filter((asset) =>
    asset.mimeType.startsWith("image/"),
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminHeader context={state.context} />
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

        {messageCode ? (
          <p
            className="mt-6 rounded-xl bg-green-50 p-4 font-semibold text-green-800"
            role="status"
          >
            {successMessages[messageCode] ?? "The content was updated."}
          </p>
        ) : null}
        {errorCode ? (
          <p
            className="mt-6 rounded-xl bg-red-50 p-4 font-semibold text-red-800"
            role="alert"
          >
            {errorMessages[errorCode] ??
              "The content action could not be completed."}
          </p>
        ) : null}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black text-slate-950">Main content</h2>
          {content.status === "draft" ? (
            <form
              action={updateContentDraftAction}
              className="mt-6 grid gap-5 sm:grid-cols-2"
            >
              <input name="contentId" type="hidden" value={content.id} />
              <Field label="Title">
                <input
                  className={inputClass}
                  defaultValue={content.title}
                  maxLength={180}
                  name="title"
                  required
                />
              </Field>
              <Field label="Web address slug">
                <input
                  className={inputClass}
                  defaultValue={content.slug}
                  maxLength={180}
                  name="slug"
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  required
                />
              </Field>
              <Field label="Short summary (optional)" wide>
                <textarea
                  className={`${inputClass} min-h-24`}
                  defaultValue={content.summary ?? ""}
                  maxLength={500}
                  name="summary"
                />
              </Field>
              <Field
                label="Cover image (optional)"
                hint="Choose a validated image from the media library."
                wide
              >
                <select
                  className={inputClass}
                  defaultValue={content.coverMediaId ?? ""}
                  name="coverMediaId"
                >
                  <option value="">No cover image</option>
                  {readyImages.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.originalName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Body"
                hint="Plain text for the first launch. Rich text is not enabled yet."
                wide
              >
                <textarea
                  className={`${inputClass} min-h-64`}
                  defaultValue={content.body.text}
                  maxLength={50000}
                  name="bodyText"
                />
              </Field>
              <button
                className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white sm:col-span-2"
                type="submit"
              >
                Save main content
              </button>
            </form>
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
            <form
              action={saveScheduleExceptionAction}
              className="mt-6 grid gap-5 sm:grid-cols-2"
            >
              <input name="contentId" type="hidden" value={content.id} />
              <Field label="Original occurrence date">
                <input
                  className={inputClass}
                  name="occurrenceDate"
                  required
                  type="date"
                />
              </Field>
              <Field label="Action">
                <select className={inputClass} name="exceptionAction" required>
                  <option value="cancelled">Cancel this occurrence</option>
                  <option value="rescheduled">
                    Reschedule this occurrence
                  </option>
                </select>
              </Field>
              <Field
                label="Replacement start"
                hint="Required only when rescheduling."
              >
                <input
                  className={inputClass}
                  name="replacementStartsAt"
                  type="datetime-local"
                />
              </Field>
              <Field
                label="Replacement end"
                hint="Required only when rescheduling."
              >
                <input
                  className={inputClass}
                  name="replacementEndsAt"
                  type="datetime-local"
                />
              </Field>
              <Field label="Public note (optional)" wide>
                <textarea
                  className={`${inputClass} min-h-20`}
                  maxLength={500}
                  name="publicNote"
                />
              </Field>
              <button
                className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white sm:col-span-2"
                type="submit"
              >
                Save schedule exception
              </button>
            </form>
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

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black text-slate-950">
            Review and publishing
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Available actions depend on this item’s status and your assigned
            permissions.
          </p>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {content.status === "draft" && can("content.submit") ? (
              <form
                action={submitContentAction}
                className="rounded-2xl bg-blue-50 p-5"
              >
                <input name="contentId" type="hidden" value={content.id} />
                <Field label="What changed?">
                  <textarea
                    className={`${inputClass} min-h-24`}
                    maxLength={500}
                    minLength={10}
                    name="changeSummary"
                    required
                  />
                </Field>
                <button
                  className="mt-4 w-full rounded-xl bg-blue-800 px-5 py-3 font-bold text-white"
                  type="submit"
                >
                  Submit for review
                </button>
              </form>
            ) : null}
            {content.status === "pending_review" && can("content.approve") ? (
              <>
                <form
                  action={approveContentAction}
                  className="rounded-2xl bg-green-50 p-5"
                >
                  <input name="contentId" type="hidden" value={content.id} />
                  <Field label="Approval note (optional)">
                    <textarea
                      className={`${inputClass} min-h-24`}
                      maxLength={500}
                      name="reason"
                    />
                  </Field>
                  <button
                    className="mt-4 w-full rounded-xl bg-green-800 px-5 py-3 font-bold text-white"
                    type="submit"
                  >
                    Approve content
                  </button>
                </form>
                <form
                  action={requestContentChangesAction}
                  className="rounded-2xl bg-amber-50 p-5"
                >
                  <input name="contentId" type="hidden" value={content.id} />
                  <Field label="Requested changes">
                    <textarea
                      className={`${inputClass} min-h-24`}
                      maxLength={500}
                      minLength={10}
                      name="reason"
                      required
                    />
                  </Field>
                  <button
                    className="mt-4 w-full rounded-xl bg-amber-700 px-5 py-3 font-bold text-white"
                    type="submit"
                  >
                    Return to draft
                  </button>
                </form>
              </>
            ) : null}
            {content.status === "approved" && can("content.publish") ? (
              <form
                action={publishContentAction}
                className="rounded-2xl bg-green-50 p-5"
              >
                <input name="contentId" type="hidden" value={content.id} />
                <p className="text-sm leading-6 text-green-950">
                  Publishing makes this item eligible for the public website
                  once public routes are enabled.
                </p>
                <button
                  className="mt-4 w-full rounded-xl bg-green-800 px-5 py-3 font-bold text-white"
                  type="submit"
                >
                  Publish
                </button>
              </form>
            ) : null}
            {content.status !== "archived" && can("content.archive") ? (
              <form
                action={archiveContentAction}
                className="rounded-2xl border border-red-200 bg-red-50 p-5 lg:col-span-2"
              >
                <input name="contentId" type="hidden" value={content.id} />
                <Field label="Archive reason">
                  <textarea
                    className={`${inputClass} min-h-20`}
                    maxLength={500}
                    minLength={10}
                    name="reason"
                    required
                  />
                </Field>
                <label className="mt-4 flex items-start gap-3 text-sm font-semibold text-red-950">
                  <input
                    className="mt-1"
                    name="confirmArchive"
                    required
                    type="checkbox"
                    value="yes"
                  />
                  I understand this removes the item from active content and
                  there is no restore interface yet.
                </label>
                <button
                  className="mt-4 rounded-xl bg-red-800 px-5 py-3 font-bold text-white"
                  type="submit"
                >
                  Archive content
                </button>
              </form>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}

const inputClass = "mt-2 w-full rounded-xl border border-slate-300 px-4 py-3";

function Field({
  label,
  hint,
  wide,
  children,
}: {
  label: string;
  hint?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`block font-semibold text-slate-800 ${wide ? "sm:col-span-2" : ""}`}
    >
      {label}
      {hint ? (
        <span className="mt-1 block text-xs font-normal text-slate-500">
          {hint}
        </span>
      ) : null}
      {children}
    </label>
  );
}

function SubtypeSummary({
  subtype,
}: {
  subtype: Record<string, unknown> | null;
}) {
  if (!subtype)
    return <p className="mt-5 text-slate-600">No additional details.</p>;
  return (
    <dl className="mt-5 grid gap-4 sm:grid-cols-2">
      {Object.entries(subtype).map(([key, rawValue]) => (
        <div className="rounded-xl bg-slate-50 p-4" key={key}>
          <dt className="text-xs font-bold tracking-wider text-slate-500 uppercase">
            {humanize(key)}
          </dt>
          <dd className="mt-1 break-words text-slate-900">
            {formatValue(rawValue)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function humanize(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatValue(value: unknown) {
  if (value === null || value === "") return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
