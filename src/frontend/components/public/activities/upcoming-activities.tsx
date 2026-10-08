"use client";

import { useState } from "react";

import {
  activityTypeLabel,
  formatPublicDate,
  formatPublicDateTime,
  recurrenceLabel,
} from "@/frontend/lib/public-format";

const activitiesPerPage = 2;

export type UpcomingActivityOccurrence = {
  occurrenceDate: string;
  startsAt: string;
  endsAt: string;
  status: "scheduled" | "cancelled" | "rescheduled";
  publicNote: string | null;
  activity: {
    id: string;
    title: string;
    summary: string | null;
    activityType: string;
    recurrenceRule: string | null;
    recurrenceUntil: string | null;
    location: { label: string; address: string | null };
    contactEmail: string | null;
    contactPhone: string | null;
    registrationUrl: string | null;
  };
};

export function UpcomingActivities({
  occurrences,
}: {
  occurrences: UpcomingActivityOccurrence[];
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(occurrences.length / activitiesPerPage);
  const start = page * activitiesPerPage;
  const visibleOccurrences = occurrences.slice(
    start,
    start + activitiesPerPage,
  );

  if (!occurrences.length) return null;

  return (
    <section aria-labelledby="upcoming-activities-title" className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2
            className="text-2xl font-semibold text-slate-950"
            id="upcoming-activities-title"
          >
            Upcoming activities
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Browse the next scheduled date for each activity. The calendar above
            shows every date.
          </p>
        </div>
        {pageCount > 1 ? (
          <div
            aria-label="Upcoming activities pages"
            className="flex items-center gap-2"
          >
            <button
              aria-label="Show previous upcoming activities"
              className="rounded-full border border-slate-300 px-3 py-2 font-bold text-slate-800 transition hover:border-[#244d3d] hover:text-[#244d3d] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={page === 0}
              onClick={() => setPage((currentPage) => currentPage - 1)}
              type="button"
            >
              <span aria-hidden="true">←</span>
              <span className="sr-only">Previous</span>
            </button>
            <span
              aria-live="polite"
              className="min-w-18 text-center text-sm font-semibold text-slate-600"
            >
              {page + 1} / {pageCount}
            </span>
            <button
              aria-label="Show next upcoming activities"
              className="rounded-full border border-slate-300 px-3 py-2 font-bold text-slate-800 transition hover:border-[#244d3d] hover:text-[#244d3d] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              type="button"
            >
              <span aria-hidden="true">→</span>
              <span className="sr-only">Next</span>
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {visibleOccurrences.map((occurrence) => (
          <ActivityCard
            key={`${occurrence.activity.id}-${occurrence.occurrenceDate}`}
            occurrence={occurrence}
          />
        ))}
      </div>
    </section>
  );
}

function ActivityCard({
  occurrence,
}: {
  occurrence: UpcomingActivityOccurrence;
}) {
  const { activity } = occurrence;

  return (
    <article className="rounded-2xl border border-slate-200 p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
        <p className="text-green-700">
          {activityTypeLabel(activity.activityType)}
        </p>
        {occurrence.status !== "scheduled" ? (
          <p
            className={
              occurrence.status === "cancelled"
                ? "rounded-full bg-red-100 px-3 py-1 text-red-800"
                : "rounded-full bg-amber-100 px-3 py-1 text-amber-900"
            }
          >
            {occurrence.status === "cancelled" ? "Cancelled" : "Rescheduled"}
          </p>
        ) : null}
      </div>
      <h3 className="mt-2 text-2xl font-semibold text-slate-950">
        {activity.title}
      </h3>
      {activity.summary ? (
        <p className="mt-3 leading-7 text-slate-600">{activity.summary}</p>
      ) : null}
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-bold text-slate-950">Starts</dt>
          <dd className="mt-1 text-slate-600">
            {formatPublicDateTime(occurrence.startsAt)}
          </dd>
        </div>
        <div>
          <dt className="font-bold text-slate-950">Ends</dt>
          <dd className="mt-1 text-slate-600">
            {formatPublicDateTime(occurrence.endsAt)}
          </dd>
        </div>
        {recurrenceLabel(activity.recurrenceRule) ? (
          <div>
            <dt className="font-bold text-slate-950">Repeats</dt>
            <dd className="mt-1 text-slate-600">
              {recurrenceLabel(activity.recurrenceRule)}
              {activity.recurrenceUntil
                ? ` until ${formatPublicDate(activity.recurrenceUntil)}`
                : ""}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="font-bold text-slate-950">Location</dt>
          <dd className="mt-1 text-slate-600">
            {activity.location.label}
            {activity.location.address ? (
              <span className="block">{activity.location.address}</span>
            ) : null}
          </dd>
        </div>
      </dl>
      {occurrence.publicNote ? (
        <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
          <h4 className="font-semibold">Schedule update</h4>
          <p className="mt-1">{occurrence.publicNote}</p>
        </div>
      ) : null}
      {activity.contactEmail ||
      activity.contactPhone ||
      activity.registrationUrl ? (
        <div className="mt-5 flex flex-wrap gap-3">
          {activity.contactEmail ? (
            <a
              className="font-bold text-[#244d3d] underline"
              href={`mailto:${activity.contactEmail}`}
            >
              Email contact
            </a>
          ) : null}
          {activity.contactPhone ? (
            <a
              className="font-bold text-[#244d3d] underline"
              href={`tel:${activity.contactPhone}`}
            >
              Call contact
            </a>
          ) : null}
          {activity.registrationUrl ? (
            <a
              className="font-bold text-[#244d3d] underline"
              href={activity.registrationUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              Registration
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
