import Link from "next/link";
import type { Route } from "next";

import { AdminHeader } from "@/frontend/components/admin/admin-header";
import { requireActiveStaffSession } from "@/backend/auth/staff-context";
import { getAdminNotificationSummary } from "@/backend/queries/admin/notifications";
import { manageableContentTypes } from "@/shared/content/options";
import { roleLabel } from "@/shared/staff/roles";

export default async function AdminPage() {
  const [{ context }, notifications] = await Promise.all([
    requireActiveStaffSession(),
    getAdminNotificationSummary(),
  ]);
  const contentTypes = manageableContentTypes(context.permissions);
  const roleNames = context.roles.map((role) => roleLabel.get(role) ?? role);
  const workSummary = getWorkSummary(context.permissions);

  return (
    <div className="min-h-screen bg-slate-100 lg:pl-72">
      <AdminHeader context={context} notifications={notifications} />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-sm font-bold tracking-[0.2em] text-blue-800 uppercase">
          Administration
        </p>
        <h1 className="mt-3 text-4xl font-black text-slate-950 sm:text-5xl">
          Good to see you, {context.displayName.split(" ")[0]}.
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-600">
          {workSummary} This dashboard only shows areas your role permits.
        </p>
        <section className="mt-8 rounded-3xl bg-blue-950 p-5 text-white sm:p-7">
          <p className="text-xs font-bold tracking-[0.2em] text-blue-200 uppercase">
            Your access
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {roleNames.map((role) => (
              <span
                className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold"
                key={role}
              >
                {role}
              </span>
            ))}
          </div>
        </section>
        <section
          className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Available administration areas"
        >
          {context.permissions.includes("staff.read") ? (
            <Link
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              href="/admin/staff"
            >
              <h2 className="text-xl font-black text-slate-950">
                Staff and roles
              </h2>
              <p className="mt-2 leading-6 text-slate-600">
                Invite staff and manage approved access.
              </p>
            </Link>
          ) : null}
          {contentTypes.length ? (
            <Link
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              href={"/admin/content" as Route}
            >
              <h2 className="text-xl font-black text-slate-950">
                Content and publishing
              </h2>
              <p className="mt-2 leading-6 text-slate-600">
                Manage drafts, ministry details, reviews, and publishing.
              </p>
            </Link>
          ) : null}
          {context.permissions.includes("content.media.manage") ? (
            <Link
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              href={"/admin/media" as Route}
            >
              <h2 className="text-xl font-black text-slate-950">
                Media library
              </h2>
              <p className="mt-2 leading-6 text-slate-600">
                Upload validated images and bulletin PDFs.
              </p>
            </Link>
          ) : null}
          {context.permissions.includes("prayer.read_team") ? (
            <Link
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              href={"/admin/prayer" as Route}
            >
              <h2 className="text-xl font-black text-slate-950">Prayer care</h2>
              <p className="mt-2 leading-6 text-slate-600">
                Review only the prayer requests allowed by your role.
              </p>
            </Link>
          ) : null}
          {context.permissions.includes("contact.read") ||
          context.permissions.includes("ministry_interest.read") ? (
            <Link
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              href={"/admin/inquiries" as Route}
            >
              <h2 className="text-xl font-black text-slate-950">
                Visitor inquiries
              </h2>
              <p className="mt-2 leading-6 text-slate-600">
                Handle church contacts and ministry-interest follow-up.
              </p>
            </Link>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function getWorkSummary(permissions: string[]) {
  if (permissions.includes("staff.roles.manage")) {
    return "Keep staff access secure and recover sign-in setup when needed.";
  }
  if (permissions.includes("content.approve")) {
    return "Review, approve, and publish the church’s public updates.";
  }
  if (permissions.includes("prayer.read_team")) {
    return "Care for the prayer requests within your approved privacy scope.";
  }
  return "Continue the church’s public content work assigned to your role.";
}
