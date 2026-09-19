import "server-only";

import { getPublicActivities } from "@/backend/queries/content/public-cache";
import { expandUpcomingOccurrences } from "@/backend/services/content/schedule-occurrence-service";

export async function getPublicUpcomingOccurrences() {
  return expandUpcomingOccurrences(await getPublicActivities());
}
