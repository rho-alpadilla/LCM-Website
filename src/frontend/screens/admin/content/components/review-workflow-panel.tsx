import {
  approveContentAction,
  archiveContentAction,
  publishContentAction,
  requestContentChangesAction,
  submitContentAction,
} from "@/backend/actions/content";
import type { ContentEntry } from "@/shared/content/types";

import { formInputClass, FormField } from "./form-field";

type ReviewWorkflowPanelProps = {
  content: ContentEntry;
  permissions: string[];
};

export function ReviewWorkflowPanel({
  content,
  permissions,
}: ReviewWorkflowPanelProps) {
  const can = (permission: string) => permissions.includes(permission);

  return (
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
            <FormField label="What changed?">
              <textarea
                className={`${formInputClass} min-h-24`}
                maxLength={500}
                minLength={10}
                name="changeSummary"
                required
              />
            </FormField>
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
              <FormField label="Approval note (optional)">
                <textarea
                  className={`${formInputClass} min-h-24`}
                  maxLength={500}
                  name="reason"
                />
              </FormField>
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
              <FormField label="Requested changes">
                <textarea
                  className={`${formInputClass} min-h-24`}
                  maxLength={500}
                  minLength={10}
                  name="reason"
                  required
                />
              </FormField>
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
              Publishing makes this item eligible for the public website once
              public routes are enabled.
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
            <FormField label="Archive reason">
              <textarea
                className={`${formInputClass} min-h-20`}
                maxLength={500}
                minLength={10}
                name="reason"
                required
              />
            </FormField>
            <label className="mt-4 flex items-start gap-3 text-sm font-semibold text-red-950">
              <input
                className="mt-1"
                name="confirmArchive"
                required
                type="checkbox"
                value="yes"
              />
              I understand this removes the item from active content and there
              is no restore interface yet.
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
  );
}
