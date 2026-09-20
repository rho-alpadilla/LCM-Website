"use client";

import { useMemo, useState } from "react";

import {
  activityTypeLabel,
  formatPublicDateTime,
} from "@/frontend/lib/public-format";

type PlannerOccurrence = {
  occurrenceDate: string;
  startsAt: string;
  endsAt: string;
  status: "scheduled" | "cancelled" | "rescheduled";
  publicNote: string | null;
  activity: {
    id: string;
    title: string;
    activityType: string;
    summary: string | null;
    location: { label: string; address: string | null };
  };
};

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthlyActivityPlanner({
  occurrences,
  initialMonth,
}: {
  occurrences: PlannerOccurrence[];
  initialMonth: string;
}) {
  const months = useMemo(
    () =>
      buildMonths(
        initialMonth,
        occurrences.map((occurrence) => manilaDate(occurrence.startsAt)),
      ),
    [initialMonth, occurrences],
  );
  const [activeMonthIndex, setActiveMonthIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => `${initialMonth}-01`);
  const activeMonth = months[activeMonthIndex] ?? initialMonth;
  const occurrencesByDate = useMemo(
    () => groupByDate(occurrences),
    [occurrences],
  );
  const activeOccurrences = occurrencesByDate.get(selectedDate) ?? [];
  const calendarDays = monthDays(activeMonth);

  function chooseMonth(index: number) {
    const month = months[index];
    if (!month) return;
    setActiveMonthIndex(index);
    setSelectedDate(`${month}-01`);
  }

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
      aria-labelledby="planner-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold tracking-[0.2em] text-green-700 uppercase">
            Monthly planner
          </p>
          <h2
            className="mt-2 text-2xl font-semibold text-slate-950"
            id="planner-title"
          >
            Church calendar
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Select a day to see what’s happening.
          </p>
        </div>
        <div className="flex gap-2" aria-label="Calendar months">
          <button
            className="rounded-lg border border-slate-300 px-3 py-2 font-bold text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={activeMonthIndex === 0}
            onClick={() => chooseMonth(activeMonthIndex - 1)}
            type="button"
          >
            Previous
          </button>
          <button
            className="rounded-lg border border-slate-300 px-3 py-2 font-bold text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={activeMonthIndex >= months.length - 1}
            onClick={() => chooseMonth(activeMonthIndex + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
      <p className="mt-6 text-center text-lg font-semibold text-slate-950">
        {formatMonth(activeMonth)}
      </p>
      <div
        className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500"
        aria-hidden="true"
      >
        {weekdayLabels.map((day) => (
          <span className="py-2" key={day}>
            {day}
          </span>
        ))}
      </div>
      <div
        className="grid grid-cols-7 gap-1"
        aria-label={formatMonth(activeMonth)}
      >
        {calendarDays.map((day, index) => {
          if (!day)
            return (
              <span
                aria-hidden="true"
                className="min-h-22 rounded-lg bg-slate-50"
                key={`empty-${index}`}
              />
            );
          const dayOccurrences = occurrencesByDate.get(day) ?? [];
          const selected = selectedDate === day;
          return (
            <button
              aria-label={`${formatDay(day)}${dayOccurrences.length ? `, ${dayOccurrences.length} activities` : ""}`}
              aria-pressed={selected}
              className={`min-h-22 rounded-lg border p-1 text-left transition sm:min-h-26 sm:p-2 ${selected ? "border-[#244d3d] bg-[#edf0e9] ring-2 ring-[#244d3d]" : "border-slate-200 hover:border-blue-300"}`}
              key={day}
              onClick={() => setSelectedDate(day)}
              type="button"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full text-xs font-semibold text-slate-700">
                {Number(day.slice(-2))}
              </span>
              <span className="mt-1 grid gap-1">
                {dayOccurrences.slice(0, 2).map((occurrence) => (
                  <span
                    className={`truncate rounded px-1 py-0.5 text-[10px] font-bold ${occurrence.status === "cancelled" ? "bg-red-100 text-red-800 line-through" : "bg-green-100 text-green-900"}`}
                    key={`${occurrence.activity.id}-${occurrence.startsAt}`}
                    title={occurrence.activity.title}
                  >
                    {occurrence.activity.title}
                  </span>
                ))}
                {dayOccurrences.length > 2 ? (
                  <span className="text-[10px] font-bold text-[#244d3d]">
                    +{dayOccurrences.length - 2} more
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl bg-slate-50 p-4" aria-live="polite">
        <h3 className="font-semibold text-slate-950">
          {formatDay(selectedDate)}
        </h3>
        {activeOccurrences.length ? (
          <ul className="mt-4 grid gap-3">
            {activeOccurrences.map((occurrence) => (
              <li
                className="rounded-xl border border-slate-200 bg-white p-4"
                key={`${occurrence.activity.id}-${occurrence.startsAt}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-green-700">
                    {activityTypeLabel(occurrence.activity.activityType)}
                  </span>
                  {occurrence.status !== "scheduled" ? (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-950">
                      {occurrence.status === "cancelled"
                        ? "Cancelled"
                        : "Rescheduled"}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 font-semibold text-slate-950">
                  {occurrence.activity.title}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {formatPublicDateTime(occurrence.startsAt)} ·{" "}
                  {occurrence.activity.location.label}
                </p>
                {occurrence.activity.summary ? (
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {occurrence.activity.summary}
                  </p>
                ) : null}
                {occurrence.publicNote ? (
                  <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
                    {occurrence.publicNote}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            No published activities are scheduled for this day.
          </p>
        )}
      </div>
    </section>
  );
}

function groupByDate(occurrences: PlannerOccurrence[]) {
  const grouped = new Map<string, PlannerOccurrence[]>();
  for (const occurrence of occurrences) {
    const date = manilaDate(occurrence.startsAt);
    const values = grouped.get(date) ?? [];
    values.push(occurrence);
    grouped.set(date, values);
  }
  return grouped;
}

function buildMonths(initialMonth: string, dates: string[]) {
  const finalMonth = dates.reduce(
    (latest, date) => (date.slice(0, 7) > latest ? date.slice(0, 7) : latest),
    addMonths(initialMonth, 2),
  );
  const months: string[] = [];
  for (
    let month = initialMonth;
    month <= finalMonth;
    month = addMonths(month, 1)
  )
    months.push(month);
  return months;
}

function monthDays(month: string) {
  const [year, value] = month.split("-").map(Number);
  const monthIndex = (value ?? 1) - 1;
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const leadingEmptyDays = (firstWeekday + 6) % 7;
  const dayCount = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const days = Array.from(
    { length: leadingEmptyDays },
    () => null as string | null,
  );
  for (let day = 1; day <= dayCount; day += 1)
    days.push(`${month}-${String(day).padStart(2, "0")}`);
  while (days.length % 7) days.push(null);
  return days;
}

function addMonths(month: string, amount: number) {
  const [year, value] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, (value ?? 1) - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function manilaDate(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function formatMonth(month: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date(`${month}-01T00:00:00+08:00`));
}

function formatDay(date: string) {
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date(`${date}T00:00:00+08:00`));
}
