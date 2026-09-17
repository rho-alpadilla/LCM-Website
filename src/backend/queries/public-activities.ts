import "server-only";

import { getPublicActivities } from "@/backend/queries/public-content-cache";
import { expandUpcomingOccurrences } from "@/backend/services/schedule-occurrence-service";

export async function getPublicUpcomingOccurrences() {
  return expandUpcomingOccurrences(await getPublicActivities());
}
