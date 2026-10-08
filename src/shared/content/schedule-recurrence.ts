export const scheduleRecurrencePresets = [
  {
    value: "once",
    label: "Does not repeat",
    rule: null,
  },
  {
    value: "daily",
    label: "Every day",
    rule: "FREQ=DAILY",
  },
  {
    value: "weekly",
    label: "Every week",
    rule: "FREQ=WEEKLY",
  },
  {
    value: "weekly_sunday",
    label: "Every Sunday",
    rule: "FREQ=WEEKLY;BYDAY=SU",
  },
  {
    value: "monthly",
    label: "Every month",
    rule: "FREQ=MONTHLY",
  },
  {
    value: "advanced",
    label: "Custom repeat pattern",
    rule: null,
  },
] as const;

export type ScheduleRecurrencePreset =
  (typeof scheduleRecurrencePresets)[number]["value"];

const presetByRule: Record<string, ScheduleRecurrencePreset> = {
  "FREQ=DAILY": "daily",
  "FREQ=WEEKLY": "weekly",
  "FREQ=WEEKLY;BYDAY=SU": "weekly_sunday",
  "FREQ=MONTHLY": "monthly",
};

const presetByValue = new Map(
  scheduleRecurrencePresets.map((preset) => [preset.value, preset]),
);

export function scheduleRecurrencePreset(
  recurrenceRule: string | null | undefined,
): ScheduleRecurrencePreset {
  const normalizedRule = recurrenceRule?.trim();
  if (!normalizedRule) return "once";

  return presetByRule[normalizedRule] ?? "advanced";
}

export function recurrenceRuleForPreset(
  presetValue: string,
  advancedRule: string | null | undefined,
) {
  const preset = presetByValue.get(presetValue as ScheduleRecurrencePreset);
  if (!preset) {
    throw new Error("Invalid schedule recurrence preset.");
  }

  return preset.value === "advanced"
    ? advancedRule?.trim() || null
    : preset.rule;
}
