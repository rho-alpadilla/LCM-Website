import Link from "next/link";
import type { Route } from "next";

import { AdminHeader } from "@/frontend/components/admin/admin-header";
import { getContentWorkspace } from "@/backend/queries/content/admin-workspace";
import { createContentAction } from "@/backend/actions/content";
import {
  contentStatusLabels,
  contentTypeLabels,
  manageableContentTypes,
} from "@/shared/content/options";

import { formInputClass, FormField } from "./components/form-field";

const messages: Record<string, string> = {
  invalid_content:
    "Choose a valid content type and complete the required fields.",
  create_failed:
    "The draft could not be created. Check the URL slug and try again.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ContentPage({ searchParams }: Props) {
  const [state, parameters] = await Promise.all([
    getContentWorkspace(),
    searchParams,
  ]);
  const { content } = state;
  const manageableTypes = manageableContentTypes(state.context.permissions);
  const reviewQueue = state.context.permissions.includes("content.approve")
    ? content.filter((item) => item.status === "pending_review")
    : [];
  const errorCode =
    typeof parameters.error === "string" ? parameters.error : "";

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminHeader context={state.context} />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold tracking-[0.2em] text-blue-800 uppercase">
              Publishing workspace
            </p>
            <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
              Content
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Draft, review, approve, and publish only the ministry areas your
              account is allowed to manage.
            </p>
          </div>
          <a
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center font-bold text-slate-800"
            href="#new-draft"
          >
            Create a draft
          </a>
        </div>

        {errorCode ? (
          <p
            className="mt-6 rounded-xl bg-red-50 p-4 font-semibold text-red-800"
            role="alert"
          >
            {messages[errorCode] ??
              "The content action could not be completed."}
          </p>
        ) : null}

        {state.context.permissions.includes("content.approve") ? (
          <section
            className="mt-10 rounded-3xl bg-blue-950 p-5 text-white sm:p-8"
            aria-labelledby="review-queue-title"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-[0.2em] text-blue-200 uppercase">
                  Action needed
                </p>
                <h2
                  className="mt-2 text-2xl font-black"
                  id="review-queue-title"
                >
                  Review queue
                </h2>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold">
                {reviewQueue.length} pending
              </span>
            </div>
            {reviewQueue.length ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {reviewQueue.map((item) => (
                  <Link
                    className="rounded-xl bg-white p-4 text-slate-950"
                    href={`/admin/content/${item.id}` as Route}
                    key={item.id}
                  >
                    <span className="text-xs font-bold tracking-wider text-blue-800 uppercase">
                      {contentTypeLabels[item.contentType]}
                    </span>
                    <span className="mt-1 block font-black">{item.title}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-blue-100">
                Nothing is waiting for review.
              </p>
            )}
          </section>
        ) : null}

        <section className="mt-10" aria-labelledby="content-list-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              className="text-2xl font-black text-slate-950"
              id="content-list-title"
            >
              Recent content
            </h2>
            <span className="text-sm font-semibold text-slate-600">
              {content.length} item{content.length === 1 ? "" : "s"}
            </span>
          </div>
          {content.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {content.map((item) => (
                <Link
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                  href={`/admin/content/${item.id}` as Route}
                  key={item.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-bold tracking-wider text-blue-800 uppercase">
                      {contentTypeLabels[item.contentType]}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  <h3 className="mt-4 text-xl font-black text-slate-950 group-hover:text-blue-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm break-all text-slate-500">
                    /{item.slug}
                  </p>
                  <p className="mt-5 text-xs font-semibold text-slate-500">
                    Version {item.version} · Updated{" "}
                    {formatDate(item.updatedAt)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-600">
              No content is in your permitted ministry areas yet. Create the
              first draft below.
            </p>
          )}
        </section>

        <section
          className="mt-12 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
          id="new-draft"
        >
          <h2 className="text-2xl font-black text-slate-950">Create a draft</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Start with the title and web address. You’ll add the specific
            sermon, schedule, ministry, or bulletin details on the next screen.
          </p>
          {manageableTypes.length ? (
            <form
              action={createContentAction}
              className="mt-6 grid gap-5 sm:grid-cols-2"
            >
              <FormField label="Content type">
                <select className={formInputClass} name="contentType" required>
                  {manageableTypes.map((type) => (
                    <option key={type} value={type}>
                      {contentTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Title">
                <input
                  className={formInputClass}
                  maxLength={180}
                  name="title"
                  required
                />
              </FormField>
              <FormField
                label="Web address slug"
                hint="Lowercase letters, numbers, and hyphens only."
              >
                <input
                  className={formInputClass}
                  maxLength={180}
                  name="slug"
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  placeholder="sunday-celebration"
                  required
                />
              </FormField>
              <FormField label="Short summary (optional)">
                <input
                  className={formInputClass}
                  maxLength={500}
                  name="summary"
                />
              </FormField>
              <button
                className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white sm:col-span-2"
                type="submit"
              >
                Create draft and continue
              </button>
            </form>
          ) : (
            <p className="mt-5 rounded-xl bg-amber-50 p-4 text-amber-900">
              Your account does not currently have a content-management role.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: keyof typeof contentStatusLabels }) {
  const colors = {
    draft: "bg-slate-100 text-slate-700",
    pending_review: "bg-amber-100 text-amber-900",
    approved: "bg-blue-100 text-blue-900",
    published: "bg-green-100 text-green-900",
    archived: "bg-red-100 text-red-900",
  };
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${colors[status]}`}
    >
      {contentStatusLabels[status]}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}
