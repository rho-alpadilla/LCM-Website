import type { PublicActivity } from "@/backend/repositories/content/public-repository";

export type PublicActivityOccurrence = {
  activity: PublicActivity;
  occurrenceDate: string;
  startsAt: string;
  endsAt: string;
  status: "scheduled" | "cancelled" | "rescheduled";
  publicNote: string | null;
};

type ExpansionOptions = {
  now?: Date;
  days?: number;
  limit?: number;
};

type ParsedRule = {
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  interval: number;
  weekdays: Set<string>;
  hasExplicitWeekdays: boolean;
};

const manilaOffset = "+08:00";
const millisecondsPerDay = 86_400_000;
const weekdayCodes = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export function expandUpcomingOccurrences(
  activities: PublicActivity[],
  options: ExpansionOptions = {},
) {
  const now = options.now ?? new Date();
  const days = options.days ?? 90;
  const limit = options.limit ?? 200;
  const windowStart = now.getTime();
  const startDate = manilaDate(now);
  const endDate = addDays(startDate, days);
  const windowEnd = Date.parse(`${endDate}T23:59:59.999${manilaOffset}`);

  const occurrences = activities.flatMap((activity) =>
    expandActivity(activity, startDate, endDate, windowStart, windowEnd),
  );

  return occurrences
    .sort(
      (left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt),
    )
    .slice(0, limit);
}

function expandActivity(
  activity: PublicActivity,
  windowStartDate: string,
  windowEndDate: string,
  windowStart: number,
  windowEnd: number,
) {
  const start = parseManilaDateTime(activity.startsAt);
  const duration = Date.parse(activity.endsAt) - Date.parse(activity.startsAt);
  const exceptions = new Map(
    activity.exceptions.map((exception) => [
      exception.occurrenceDate,
      exception,
    ]),
  );
  const originalDates = new Set<string>();
  const occurrences: PublicActivityOccurrence[] = [];

  if (!activity.recurrenceRule) {
    addOccurrence(start.date, start.time, activity, duration, exceptions, {
      windowStart,
      windowEnd,
      originalDates,
      occurrences,
    });
    return occurrences;
  }

  const rule = parseRule(activity.recurrenceRule, start.date);
  const firstCandidate =
    start.date > windowStartDate ? start.date : windowStartDate;
  const finalCandidate =
    activity.recurrenceUntil && activity.recurrenceUntil < windowEndDate
      ? activity.recurrenceUntil
      : windowEndDate;

  for (
    let candidate = firstCandidate;
    candidate <= finalCandidate;
    candidate = addDays(candidate, 1)
  ) {
    if (candidate < start.date || !matchesRule(candidate, start.date, rule)) {
      continue;
    }
    addOccurrence(candidate, start.time, activity, duration, exceptions, {
      windowStart,
      windowEnd,
      originalDates,
      occurrences,
    });
  }

  for (const exception of activity.exceptions) {
    if (
      exception.action !== "rescheduled" ||
      !exception.replacementStartsAt ||
      !exception.replacementEndsAt ||
      originalDates.has(exception.occurrenceDate)
    ) {
      continue;
    }
    const replacementStart = Date.parse(exception.replacementStartsAt);
    if (replacementStart >= windowStart && replacementStart <= windowEnd) {
      occurrences.push({
        activity,
        occurrenceDate: exception.occurrenceDate,
        startsAt: exception.replacementStartsAt,
        endsAt: exception.replacementEndsAt,
        status: "rescheduled",
        publicNote: exception.publicNote,
      });
    }
  }

  return occurrences;
}

function addOccurrence(
  occurrenceDate: string,
  time: string,
  activity: PublicActivity,
  duration: number,
  exceptions: Map<string, PublicActivity["exceptions"][number]>,
  state: {
    windowStart: number;
    windowEnd: number;
    originalDates: Set<string>;
    occurrences: PublicActivityOccurrence[];
  },
) {
  state.originalDates.add(occurrenceDate);
  const exception = exceptions.get(occurrenceDate);
  const originalStartsAt = `${occurrenceDate}T${time}${manilaOffset}`;
  const originalEndsAt = new Date(
    Date.parse(originalStartsAt) + duration,
  ).toISOString();

  if (exception?.action === "rescheduled") {
    if (!exception.replacementStartsAt || !exception.replacementEndsAt) return;
    const replacementStart = Date.parse(exception.replacementStartsAt);
    if (
      replacementStart >= state.windowStart &&
      replacementStart <= state.windowEnd
    ) {
      state.occurrences.push({
        activity,
        occurrenceDate,
        startsAt: exception.replacementStartsAt,
        endsAt: exception.replacementEndsAt,
        status: "rescheduled",
        publicNote: exception.publicNote,
      });
    }
    return;
  }

  const originalStart = Date.parse(originalStartsAt);
  const originalEnd = Date.parse(originalEndsAt);
  if (originalEnd < state.windowStart || originalStart > state.windowEnd)
    return;
  state.occurrences.push({
    activity,
    occurrenceDate,
    startsAt: originalStartsAt,
    endsAt: originalEndsAt,
    status: exception?.action === "cancelled" ? "cancelled" : "scheduled",
    publicNote: exception?.publicNote ?? null,
  });
}

function parseRule(value: string, startDate: string): ParsedRule {
  const parts = Object.fromEntries(
    value.split(";").map((part) => part.split("=", 2)),
  );
  const frequency = parts.FREQ as ParsedRule["frequency"];
  const interval = Number(parts.INTERVAL ?? "1");
  const defaultWeekday = weekdayCode(startDate);
  return {
    frequency,
    interval,
    weekdays: new Set((parts.BYDAY ?? defaultWeekday).split(",")),
    hasExplicitWeekdays: Boolean(parts.BYDAY),
  };
}

function matchesRule(candidate: string, startDate: string, rule: ParsedRule) {
  const elapsedDays = dayNumber(candidate) - dayNumber(startDate);
  const restrictToWeekdays =
    rule.hasExplicitWeekdays || rule.frequency === "WEEKLY";
  if (
    elapsedDays < 0 ||
    (restrictToWeekdays && !rule.weekdays.has(weekdayCode(candidate)))
  ) {
    return false;
  }

  switch (rule.frequency) {
    case "DAILY":
      return elapsedDays % rule.interval === 0;
    case "WEEKLY":
      return (
        Math.floor(
          (dayNumber(startOfWeek(candidate)) -
            dayNumber(startOfWeek(startDate))) /
            7,
        ) %
          rule.interval ===
        0
      );
    case "MONTHLY": {
      const elapsedMonths = monthNumber(candidate) - monthNumber(startDate);
      return (
        elapsedMonths >= 0 &&
        elapsedMonths % rule.interval === 0 &&
        (rule.hasExplicitWeekdays ||
          candidate.slice(8, 10) === startDate.slice(8, 10))
      );
    }
  }
}

function parseManilaDateTime(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/.exec(value);
  if (!match)
    throw new Error("Stored schedule time has an unsupported format.");
  return { date: match[1], time: match[2] };
}

function manilaDate(value: Date) {
  return new Date(value.getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function dayNumber(date: string) {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / millisecondsPerDay);
}

function addDays(date: string, days: number) {
  return new Date((dayNumber(date) + days) * millisecondsPerDay)
    .toISOString()
    .slice(0, 10);
}

function weekdayCode(date: string) {
  return weekdayCodes[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

function startOfWeek(date: string) {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  return addDays(date, -daysSinceMonday);
}

function monthNumber(date: string) {
  return Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;
}
