import {
  EmptyContent,
  PageIntro,
  PublicPage,
} from "@/frontend/components/public/public-page";
import { MonthlyActivityPlanner } from "@/frontend/components/public/activities/monthly-planner";
import { getPublicUpcomingOccurrences } from "@/backend/queries/content/public-activities";
import {
  activityTypeLabel,
  formatPublicDate,
  formatPublicDateTime,
  recurrenceLabel,
} from "@/frontend/lib/public-format";

export default async function ActivitiesPage() {
  const occurrences = await getPublicUpcomingOccurrences();
  return (
    <PublicPage>
      <PageIntro
        description="See the next 90 days of services, discipleship gatherings, prayer meetings, outreach, and other church activities."
        eyebrow="Church calendar"
        title="Daily activities"
      />
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <MonthlyActivityPlanner
          initialMonth={currentManilaMonth()}
          occurrences={occurrences}
        />
        <h2 className="mt-12 text-2xl font-semibold text-slate-950">
          Upcoming activities
        </h2>
        {occurrences.length ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {occurrences.map((occurrence) => {
              const { activity } = occurrence;
              return (
                <article
                  className="rounded-2xl border border-slate-200 p-5 sm:p-6"
                  key={`${activity.id}-${occurrence.occurrenceDate}`}
                >
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
                        {occurrence.status === "cancelled"
                          ? "Cancelled"
                          : "Rescheduled"}
                      </p>
                    ) : null}
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                    {activity.title}
                  </h2>
                  {activity.summary ? (
                    <p className="mt-3 leading-7 text-slate-600">
                      {activity.summary}
                    </p>
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
                          <span className="block">
                            {activity.location.address}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  </dl>
                  {occurrence.publicNote ? (
                    <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
                      <h3 className="font-semibold">Schedule update</h3>
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
            })}
          </div>
        ) : (
          <EmptyContent>
            No published activities are scheduled in the next 90 days.
          </EmptyContent>
        )}
      </section>
    </PublicPage>
  );
}

function currentManilaMonth() {
  const parts = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const value = (type: "year" | "month") =>
    parts.find((part) => part.type === type)?.value ?? "01";
  return `${value("year")}-${value("month")}`;
}
