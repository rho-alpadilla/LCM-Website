import { describe, expect, it } from "vitest";

import type { PublicActivity } from "@/backend/repositories/public-content-repository";

import { expandUpcomingOccurrences } from "./schedule-occurrence-service";

function activity(overrides: Partial<PublicActivity> = {}): PublicActivity {
  return {
    id: "7d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
    slug: "evening-prayer",
    title: "Evening Prayer",
    summary: null,
    body: { format: "plain_text", text: "Prayer gathering" },
    coverImage: null,
    publishedAt: "2026-09-01T00:00:00Z",
    activityType: "prayer_meeting",
    ministryName: null,
    startsAt: "2026-09-14T18:00:00+08:00",
    endsAt: "2026-09-14T19:00:00+08:00",
    timezone: "Asia/Manila",
    recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
    recurrenceUntil: null,
    location: { label: "Main Hall", address: null, access: "area_only" },
    contactEmail: null,
    contactPhone: null,
    registrationUrl: null,
    exceptions: [],
    ...overrides,
  };
}

const now = new Date("2026-09-16T00:00:00Z");

describe("expandUpcomingOccurrences", () => {
  it("expands weekly activities into sorted upcoming occurrences", () => {
    const result = expandUpcomingOccurrences([activity()], {
      now,
      days: 7,
    });
    expect(result.map((item) => item.occurrenceDate)).toEqual([
      "2026-09-16",
      "2026-09-18",
      "2026-09-21",
      "2026-09-23",
    ]);
  });

  it("expands a daily schedule on every day when no weekdays are specified", () => {
    const result = expandUpcomingOccurrences(
      [activity({ recurrenceRule: "FREQ=DAILY" })],
      { now, days: 2 },
    );
    expect(result.map((item) => item.occurrenceDate)).toEqual([
      "2026-09-16",
      "2026-09-17",
      "2026-09-18",
    ]);
  });

  it("keeps cancellations visible and applies rescheduled times", () => {
    const result = expandUpcomingOccurrences(
      [
        activity({
          exceptions: [
            {
              occurrenceDate: "2026-09-16",
              action: "cancelled",
              replacementStartsAt: null,
              replacementEndsAt: null,
              publicNote: "Weather advisory",
            },
            {
              occurrenceDate: "2026-09-18",
              action: "rescheduled",
              replacementStartsAt: "2026-09-19T10:00:00+08:00",
              replacementEndsAt: "2026-09-19T11:00:00+08:00",
              publicNote: "Moved to Saturday",
            },
          ],
        }),
      ],
      { now, days: 7 },
    );
    expect(result[0]).toMatchObject({
      occurrenceDate: "2026-09-16",
      status: "cancelled",
      publicNote: "Weather advisory",
    });
    expect(result[1]).toMatchObject({
      occurrenceDate: "2026-09-18",
      startsAt: "2026-09-19T10:00:00+08:00",
      status: "rescheduled",
    });
  });

  it("supports monthly dates without inventing missing calendar days", () => {
    const result = expandUpcomingOccurrences(
      [
        activity({
          startsAt: "2026-01-31T18:00:00+08:00",
          endsAt: "2026-01-31T19:00:00+08:00",
          recurrenceRule: "FREQ=MONTHLY",
        }),
      ],
      { now: new Date("2026-02-01T00:00:00Z"), days: 90 },
    );
    expect(result.map((item) => item.occurrenceDate)).toEqual(["2026-03-31"]);
  });

  it("includes a one-time activity only while it is upcoming", () => {
    const result = expandUpcomingOccurrences(
      [
        activity({
          startsAt: "2026-09-17T09:00:00+08:00",
          endsAt: "2026-09-17T10:00:00+08:00",
          recurrenceRule: null,
        }),
      ],
      { now, days: 7 },
    );
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("scheduled");
  });
});
