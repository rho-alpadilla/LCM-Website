import "server-only";

import { getPublicActivities } from "@/backend/queries/content/public-cache";
import {
  expandUpcomingOccurrences,
  getUpcomingActivityHighlights,
} from "@/backend/services/content/schedule-occurrence-service";

export async function getPublicUpcomingOccurrences() {
  return expandUpcomingOccurrences(await getPublicActivities());
}

export async function getPublicActivitiesPageData() {
  const occurrences = await getPublicUpcomingOccurrences();
  return {
    occurrences,
    upcomingHighlights: getUpcomingActivityHighlights(occurrences),
  };
}
