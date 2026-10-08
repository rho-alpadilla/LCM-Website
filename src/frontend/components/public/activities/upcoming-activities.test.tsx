import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  UpcomingActivities,
  type UpcomingActivityOccurrence,
} from "./upcoming-activities";

afterEach(cleanup);

function occurrence(index: number): UpcomingActivityOccurrence {
  return {
    occurrenceDate: `2026-10-${String(index + 1).padStart(2, "0")}`,
    startsAt: `2026-10-${String(index + 1).padStart(2, "0")}T09:00:00+08:00`,
    endsAt: `2026-10-${String(index + 1).padStart(2, "0")}T10:00:00+08:00`,
    status: "scheduled",
    publicNote: null,
    activity: {
      id: `activity-${index}`,
      title: `Activity ${index + 1}`,
      summary: null,
      activityType: "daily_activity",
      recurrenceRule: null,
      recurrenceUntil: null,
      location: { label: "Church", address: null },
      contactEmail: null,
      contactPhone: null,
      registrationUrl: null,
    },
  };
}

describe("UpcomingActivities", () => {
  it("keeps the overview short and pages through distinct activities", () => {
    render(
      <UpcomingActivities
        occurrences={[occurrence(0), occurrence(1), occurrence(2)]}
      />,
    );

    expect(screen.getByText("Activity 1")).toBeInTheDocument();
    expect(screen.getByText("Activity 2")).toBeInTheDocument();
    expect(screen.queryByText("Activity 3")).not.toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Show next upcoming activities" }),
    );

    expect(screen.queryByText("Activity 1")).not.toBeInTheDocument();
    expect(screen.getByText("Activity 3")).toBeInTheDocument();
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });
});
