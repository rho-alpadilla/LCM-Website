import type { Route } from "next";
import Link from "next/link";

import { AdminHeader } from "@/components/admin/admin-header";
import { requireActiveStaffSession } from "@/features/auth/staff-context";
import { PrayerRepository } from "@/server/repositories/prayer-repository";
import { PrayerService } from "@/server/services/prayer-service";

export const metadata = { title: "Prayer Care" };

export default async function PrayerQueuePage() {
  const state = await requireActiveStaffSession("prayer.read_team");
  const service = new PrayerService({
    repository: new PrayerRepository(state.environment.DB),
  });
  const requests = await service.listQueue(state.context);

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminHeader context={state.context} />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-sm font-bold tracking-[0.2em] text-blue-800 uppercase">
          Sensitive ministry workspace
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
          Prayer care
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          Only requests within your approved privacy scope are shown. Prayer
          text is opened from the detail page and every detail view is audited.
        </p>
        <section className="mt-8 grid gap-4" aria-label="Prayer request queue">
          {requests.length ? (
            requests.map((item) => (
              <Link
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                href={`/admin/prayer/${item.id}` as Route}
                key={item.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-black text-slate-950">
                    {formatStatus(item.status)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {item.privacyScope === "pastoral_only"
                      ? "Pastoral only"
                      : "Prayer team"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Submitted {formatDate(item.submittedAt)}
                  {item.assignedToCurrentActor ? " · Assigned to you" : ""}
                </p>
              </Link>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-600">
              No prayer requests are currently visible to your role.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}
