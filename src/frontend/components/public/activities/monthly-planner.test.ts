import { describe, expect, it } from "vitest";

import { monthDays, weekdayLabels } from "./monthly-planner";

describe("MonthlyActivityPlanner calendar layout", () => {
  it("starts every visible calendar week on Sunday", () => {
    expect(weekdayLabels).toEqual([
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ]);
    expect(monthDays("2026-11").slice(0, 7)).toEqual([
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
    ]);
  });
});
