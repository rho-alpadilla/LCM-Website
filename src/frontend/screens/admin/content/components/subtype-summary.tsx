export function SubtypeSummary({
  subtype,
}: {
  subtype: Record<string, unknown> | null;
}) {
  if (!subtype) {
    return <p className="mt-5 text-slate-600">No additional details.</p>;
  }

  return (
    <dl className="mt-5 grid gap-4 sm:grid-cols-2">
      {Object.entries(subtype).map(([key, rawValue]) => (
        <div className="rounded-xl bg-slate-50 p-4" key={key}>
          <dt className="text-xs font-bold tracking-wider text-slate-500 uppercase">
            {humanize(key)}
          </dt>
          <dd className="mt-1 break-words text-slate-900">
            {formatValue(rawValue)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function humanize(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatValue(value: unknown) {
  if (value === null || value === "") return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
