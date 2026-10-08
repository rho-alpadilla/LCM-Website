import {
  EmptyContent,
  PageIntro,
  PublicPage,
} from "@/frontend/components/public/public-page";
import { MonthlyActivityPlanner } from "@/frontend/components/public/activities/monthly-planner";
import { UpcomingActivities } from "@/frontend/components/public/activities/upcoming-activities";
import { getPublicActivitiesPageData } from "@/backend/queries/content/public-activities";

export default async function ActivitiesPage() {
  const { occurrences, upcomingHighlights } =
    await getPublicActivitiesPageData();
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
        {upcomingHighlights.length ? (
          <UpcomingActivities occurrences={upcomingHighlights} />
        ) : (
          <EmptyContent>
            No active published activities are scheduled in the next 90 days.
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
