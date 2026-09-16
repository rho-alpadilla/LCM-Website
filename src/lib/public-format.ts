export function formatPublicDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export function formatPublicDateTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours
    ? `${hours} hr${minutes ? ` ${minutes} min` : ""}`
    : `${minutes} min`;
}

export function activityTypeLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function recurrenceLabel(rule: string | null) {
  if (!rule) return null;
  const values = Object.fromEntries(
    rule.split(";").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    }),
  );
  const interval = values.INTERVAL ? Number(values.INTERVAL) : 1;
  const frequency = values.FREQ?.toLowerCase();
  const weekdays: Record<string, string> = {
    MO: "Mon",
    TU: "Tue",
    WE: "Wed",
    TH: "Thu",
    FR: "Fri",
    SA: "Sat",
    SU: "Sun",
  };
  const days = values.BYDAY?.split(",")
    .map((day) => weekdays[day] ?? day)
    .join(", ");
  const cadence =
    interval > 1 ? `Every ${interval} ${frequency}s` : `Every ${frequency}`;
  return days ? `${cadence} on ${days}` : cadence;
}
