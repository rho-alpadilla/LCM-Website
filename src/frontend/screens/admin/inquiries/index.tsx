import type { Route } from "next";
import Link from "next/link";

import { AdminHeader } from "@/frontend/components/admin/admin-header";
import { getInquiryQueue } from "@/backend/queries/admin-inquiries";
import { inquiryTypeLabel } from "@/shared/inquiries/types";

export default async function InquiryQueuePage() {
  const state = await getInquiryQueue();

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminHeader context={state.context} />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-sm font-bold tracking-[0.2em] text-blue-800 uppercase">
          Visitor follow-up
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
          Contact and ministry inquiries
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          This queue contains personal information. Open an inquiry only when
          you need to follow up; detail views are recorded in the audit log.
        </p>
        <section className="mt-8 grid gap-4" aria-label="Visitor inquiry queue">
          {state.inquiries.length ? (
            state.inquiries.map((inquiry) => (
              <Link
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300"
                href={`/admin/inquiries/${inquiry.id}` as Route}
                key={inquiry.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-black text-slate-950">
                    {inquiryTypeLabel(inquiry.inquiryType)} · {formatStatus(inquiry.status)}
                  </span>
                  {inquiry.assignedToName ? (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-900">
                      Assigned to {inquiry.assignedToName}
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-950">
                      Unassigned
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {inquiry.name || "Contact details redacted"} · Submitted {formatDate(inquiry.submittedAt)}
                  {inquiry.ministryTitle ? ` · ${inquiry.ministryTitle}` : ""}
                </p>
              </Link>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-600">
              No visitor inquiries are currently visible to your role.
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
