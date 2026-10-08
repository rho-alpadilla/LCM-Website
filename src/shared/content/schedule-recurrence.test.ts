import { describe, expect, it } from "vitest";

import {
  recurrenceRuleForPreset,
  scheduleRecurrencePreset,
} from "./schedule-recurrence";

describe("schedule recurrence presets", () => {
  it("maps simple staff choices to the supported stored rules", () => {
    expect(recurrenceRuleForPreset("once", "FREQ=DAILY")).toBeNull();
    expect(recurrenceRuleForPreset("daily", "")).toBe("FREQ=DAILY");
    expect(recurrenceRuleForPreset("weekly", "")).toBe("FREQ=WEEKLY");
    expect(recurrenceRuleForPreset("weekly_sunday", "")).toBe(
      "FREQ=WEEKLY;BYDAY=SU",
    );
    expect(recurrenceRuleForPreset("monthly", "")).toBe("FREQ=MONTHLY");
  });

  it("keeps an existing custom rule only when advanced is chosen", () => {
    const customRule = "FREQ=WEEKLY;BYDAY=MO,WE,FR";

    expect(scheduleRecurrencePreset(customRule)).toBe("advanced");
    expect(recurrenceRuleForPreset("advanced", ` ${customRule} `)).toBe(
      customRule,
    );
  });

  it("rejects an unrecognized preset sent outside the form", () => {
    expect(() => recurrenceRuleForPreset("yearly", "FREQ=DAILY")).toThrow(
      "Invalid schedule recurrence preset.",
    );
  });
});
