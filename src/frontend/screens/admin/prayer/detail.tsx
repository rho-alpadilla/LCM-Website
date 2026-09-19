import { AdminHeader } from "@/frontend/components/admin/admin-header";
import { PrayerContactReveal } from "@/frontend/screens/admin/prayer/components/contact-reveal";
import { getPrayerDetail } from "@/backend/queries/prayer/admin-queue";
import {
  addPrayerUpdateAction,
  assignPrayerAction,
  closePrayerAction,
} from "@/backend/actions/prayer";

type Props = {
  params: Promise<{ requestId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const messages: Record<string, string> = {
  assigned: "Prayer Warrior assigned.",
  updated: "Prayer update added.",
  closed: "Prayer request closed.",
};
const errors: Record<string, string> = {
  assign_failed: "The assignment could not be completed.",
  update_failed: "The update could not be added.",
  close_failed: "The prayer request could not be closed.",
};

export default async function PrayerDetailPage({
  params,
  searchParams,
}: Props) {
  const { requestId } = await params;
  const query = await searchParams;
  const state = await getPrayerDetail(requestId);
  const { detail, assignees } = state;
  const { request, updates, assignments } = detail;
  const isClosed =
    request.status === "closed" || request.status === "retention_review";
  const message =
    typeof query.message === "string" ? messages[query.message] : null;
  const error = typeof query.error === "string" ? errors[query.error] : null;

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminHeader context={state.context} />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <p className="text-sm font-bold tracking-[0.2em] text-blue-800 uppercase">
          Prayer request ·{" "}
          {request.privacyScope === "pastoral_only"
            ? "Pastoral only"
            : "Prayer team"}
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-950">
          Prayer care record
        </h1>
        {message ? (
          <p
            className="mt-5 rounded-xl bg-green-50 p-4 font-semibold text-green-900"
            role="status"
          >
            {message}
          </p>
        ) : null}
        {error ? (
          <p
            className="mt-5 rounded-xl bg-red-50 p-4 font-semibold text-red-900"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <section
          className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
          aria-labelledby="request-title"
        >
          <div className="flex flex-wrap justify-between gap-3">
            <h2 className="text-xl font-black" id="request-title">
              Request
            </h2>
            <span className="font-bold text-blue-900">
              {formatStatus(request.status)}
            </span>
          </div>
          <p className="mt-5 leading-7 whitespace-pre-wrap text-slate-800">
            {request.requestText ||
              "Prayer text was removed under the retention policy."}
          </p>
          <p className="mt-5 text-sm text-slate-500">
            Submitted {formatDate(request.submittedAt)}
          </p>
        </section>

        <section
          className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8"
          aria-labelledby="contact-title"
        >
          <h2 className="text-xl font-black" id="contact-title">
            Contact information
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Contact data stays hidden until deliberately revealed.
          </p>
          {state.context.permissions.includes("prayer.contact.read") ? (
            <PrayerContactReveal requestId={request.id} />
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              Your role cannot reveal contact details.
            </p>
          )}
        </section>

        <section
          className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8"
          aria-labelledby="updates-title"
        >
          <h2 className="text-xl font-black" id="updates-title">
            Prayer updates
          </h2>
          <ol className="mt-5 grid gap-4">
            {updates.length ? (
              updates.map((update) => (
                <li className="rounded-xl bg-slate-50 p-4" key={update.id}>
                  <div className="flex flex-wrap justify-between gap-2">
                    <strong>{formatStatus(update.updateType)}</strong>
                    <span className="text-sm text-slate-500">
                      {formatDate(update.createdAt)}
                    </span>
                  </div>
                  {update.note ? (
                    <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">
                      {update.note}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">
                    By {update.createdByName} ·{" "}
                    {update.visibilityScope === "pastoral_only"
                      ? "Pastoral only"
                      : "Prayer team"}
                  </p>
                </li>
              ))
            ) : (
              <li className="text-slate-600">No updates yet.</li>
            )}
          </ol>
          {!isClosed ? (
            <form
              action={addPrayerUpdateAction}
              className="mt-6 grid gap-4 rounded-xl border border-slate-200 p-4"
            >
              <input name="requestId" type="hidden" value={request.id} />
              <label className="font-bold">
                Update type
                <select className={inputClass} name="updateType">
                  <option value="prayed">Prayed</option>
                  <option value="note">Note</option>
                  {state.context.permissions.includes(
                    "prayer.update_pastoral",
                  ) ? (
                    <>
                      <option value="follow_up">Follow up</option>
                      <option value="escalated">Escalate</option>
                    </>
                  ) : null}
                </select>
              </label>
              <label className="font-bold">
                Visibility
                <select className={inputClass} name="visibilityScope">
                  <option value="team">Prayer team</option>
                  {state.context.permissions.includes(
                    "prayer.update_pastoral",
                  ) ? (
                    <option value="pastoral_only">Pastoral only</option>
                  ) : null}
                </select>
              </label>
              <label className="font-bold">
                Note
                <textarea
                  className={`${inputClass} min-h-28`}
                  maxLength={5000}
                  name="note"
                />
              </label>
              <button
                className="rounded-xl bg-blue-800 px-4 py-3 font-bold text-white"
                type="submit"
              >
                Add update
              </button>
            </form>
          ) : null}
        </section>

        {state.context.permissions.includes("prayer.assign") &&
        !isClosed &&
        request.privacyScope === "team" ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
            <h2 className="text-xl font-black">Assignments</h2>
            <ul className="mt-3 text-sm text-slate-700">
              {assignments.length ? (
                assignments.map((assignment) => (
                  <li key={assignment.id}>
                    {assignment.assignedToName} ·{" "}
                    {formatDate(assignment.assignedAt)}
                  </li>
                ))
              ) : (
                <li>No active assignments.</li>
              )}
            </ul>
            <form
              action={assignPrayerAction}
              className="mt-5 flex flex-col gap-3 sm:flex-row"
            >
              <input name="requestId" type="hidden" value={request.id} />
              <select className={inputClass} name="assignedTo" required>
                <option value="">Choose an active Prayer Warrior</option>
                {assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.displayName}
                  </option>
                ))}
              </select>
              <button
                className="rounded-xl bg-slate-900 px-4 py-3 font-bold text-white"
                type="submit"
              >
                Assign
              </button>
            </form>
          </section>
        ) : null}

        {state.context.permissions.includes("prayer.close") && !isClosed ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
            <h2 className="text-xl font-black">Close request</h2>
            <p className="mt-2 text-sm text-slate-600">
              Closing starts the approved 30-day contact and 90-day prayer-text
              retention periods.
            </p>
            <form action={closePrayerAction} className="mt-4 grid gap-3">
              <input name="requestId" type="hidden" value={request.id} />
              <label className="font-bold">
                Closing note (optional)
                <textarea
                  className={`${inputClass} min-h-24`}
                  maxLength={500}
                  name="reason"
                />
              </label>
              <button
                className="rounded-xl bg-red-800 px-4 py-3 font-bold text-white"
                type="submit"
              >
                Close prayer request
              </button>
            </form>
          </section>
        ) : null}
      </main>
    </div>
  );
}

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950";
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
