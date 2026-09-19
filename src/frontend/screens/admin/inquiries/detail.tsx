import Link from "next/link";
import type { Route } from "next";

import {
  addInquiryUpdateAction,
  assignInquiryAction,
  closeInquiryAction,
} from "@/backend/actions/inquiries";
import { getInquiryDetail } from "@/backend/queries/inquiries/admin-queue";
import { AdminHeader } from "@/frontend/components/admin/admin-header";
import { inquiryPermission } from "@/shared/inquiries/schemas";
import { inquiryTypeLabel } from "@/shared/inquiries/types";

export default async function InquiryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ inquiryId: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const [{ inquiryId }, result] = await Promise.all([params, searchParams]);
  const state = await getInquiryDetail(inquiryId);
  const { inquiry, updates, assignees } = state.detail;
  const canAssign = state.context.permissions.includes(
    inquiryPermission(inquiry.inquiryType, "assign"),
  );
  const canRespond = state.context.permissions.includes(
    inquiryPermission(inquiry.inquiryType, "respond"),
  );
  const open = inquiry.status === "open" || inquiry.status === "in_progress";

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminHeader context={state.context} />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link
          className="font-bold text-blue-800 underline"
          href={"/admin/inquiries" as Route}
        >
          Back to inquiries
        </Link>
        <p className="mt-8 text-sm font-bold tracking-[0.2em] text-blue-800 uppercase">
          {inquiryTypeLabel(inquiry.inquiryType)}
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
          {inquiry.name || "Visitor details have been redacted"}
        </h1>
        <p className="mt-3 text-slate-600">
          Status: <strong>{formatStatus(inquiry.status)}</strong> · Submitted{" "}
          {formatDate(inquiry.submittedAt)}
        </p>
        {result.message ? (
          <p
            className="mt-5 rounded-xl bg-green-50 p-4 font-semibold text-green-900"
            role="status"
          >
            The inquiry was updated.
          </p>
        ) : null}
        {result.error ? (
          <p
            className="mt-5 rounded-xl bg-red-50 p-4 font-semibold text-red-900"
            role="alert"
          >
            The update could not be saved. Check your permission and try again.
          </p>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-black text-slate-950">
              Visitor message
            </h2>
            {inquiry.ministryTitle ? (
              <p className="mt-3 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-900">
                Interested in: {inquiry.ministryTitle}
              </p>
            ) : null}
            <p className="mt-5 leading-7 whitespace-pre-line text-slate-700">
              {inquiry.message ||
                "The original message has been redacted under the retention policy."}
            </p>
          </section>
          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-black text-slate-950">
              Contact details
            </h2>
            {inquiry.redactedAt ? (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Personal details were redacted after the approved 90-day
                closed-inquiry retention period.
              </p>
            ) : (
              <dl className="mt-4 grid gap-4 text-sm">
                <div>
                  <dt className="font-bold text-slate-950">Preferred method</dt>
                  <dd className="mt-1 text-slate-600">
                    {inquiry.preferredContact}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-950">Email</dt>
                  <dd className="mt-1 text-slate-600">
                    {inquiry.email ? (
                      <a
                        className="text-blue-800 underline"
                        href={`mailto:${inquiry.email}`}
                      >
                        {inquiry.email}
                      </a>
                    ) : (
                      "Not provided"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-950">Phone</dt>
                  <dd className="mt-1 text-slate-600">
                    {inquiry.phone ? (
                      <a
                        className="text-blue-800 underline"
                        href={`tel:${inquiry.phone}`}
                      >
                        {inquiry.phone}
                      </a>
                    ) : (
                      "Not provided"
                    )}
                  </dd>
                </div>
              </dl>
            )}
          </aside>
        </div>

        {open && canAssign ? (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-black text-slate-950">
              Assign follow-up
            </h2>
            <form
              action={assignInquiryAction}
              className="mt-4 flex flex-wrap gap-3"
            >
              <input name="inquiryId" type="hidden" value={inquiry.id} />
              <label className="sr-only" htmlFor="assigned-to">
                Staff member
              </label>
              <select
                className="min-w-56 rounded-xl border border-slate-300 px-4 py-3"
                id="assigned-to"
                name="assignedTo"
                required
              >
                <option value="">Choose a staff member</option>
                {assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.displayName}
                  </option>
                ))}
              </select>
              <button
                className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white"
                type="submit"
              >
                Assign
              </button>
            </form>
          </section>
        ) : null}

        {open && canRespond ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <form
              action={addInquiryUpdateAction}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <h2 className="text-xl font-black text-slate-950">
                Record follow-up
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This records work already completed. It does not send an email
                or text from the website.
              </p>
              <input name="inquiryId" type="hidden" value={inquiry.id} />
              <label
                className="mt-4 block font-bold text-slate-900"
                htmlFor="update-type"
              >
                Update type
              </label>
              <select
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
                id="update-type"
                name="updateType"
              >
                <option value="note">Internal note</option>
                <option value="responded">Visitor contacted</option>
              </select>
              <label
                className="mt-4 block font-bold text-slate-900"
                htmlFor="update-note"
              >
                Note
              </label>
              <textarea
                className="mt-2 min-h-32 w-full rounded-xl border border-slate-300 px-4 py-3"
                id="update-note"
                maxLength={2000}
                name="note"
                required
              />
              <button
                className="mt-4 rounded-xl bg-blue-800 px-5 py-3 font-bold text-white"
                type="submit"
              >
                Save update
              </button>
            </form>
            <form
              action={closeInquiryAction}
              className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6"
            >
              <h2 className="text-xl font-black text-slate-950">
                Close inquiry
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Closing starts the provisional 90-day retention period. After it
                expires, the visitor details and notes are automatically
                redacted.
              </p>
              <input name="inquiryId" type="hidden" value={inquiry.id} />
              <label
                className="mt-4 block font-bold text-slate-900"
                htmlFor="close-note"
              >
                Closure note
              </label>
              <textarea
                className="mt-2 min-h-32 w-full rounded-xl border border-amber-300 bg-white px-4 py-3"
                id="close-note"
                maxLength={2000}
                minLength={10}
                name="note"
                required
              />
              <button
                className="mt-4 rounded-xl bg-slate-950 px-5 py-3 font-bold text-white"
                type="submit"
              >
                Close inquiry
              </button>
            </form>
          </section>
        ) : null}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-black text-slate-950">
            Follow-up history
          </h2>
          {updates.length ? (
            <ol className="mt-5 grid gap-4">
              {updates.map((update) => (
                <li className="border-l-2 border-blue-200 pl-4" key={update.id}>
                  <p className="font-bold text-slate-950">
                    {formatStatus(update.updateType)} · {update.createdByName}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatDate(update.createdAt)}
                  </p>
                  <p className="mt-2 leading-7 text-slate-700">
                    {update.note ||
                      "This update has been redacted under the retention policy."}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-slate-600">
              No follow-up has been recorded yet.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}
