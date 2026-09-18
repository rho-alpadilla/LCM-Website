import Link from "next/link";
import type { Route } from "next";

import { AdminHeader } from "@/frontend/components/admin/admin-header";
import { requireActiveStaffSession } from "@/backend/auth/staff-context";
import { manageableContentTypes } from "@/shared/content/options";


export default async function AdminPage() {
  const { context } = await requireActiveStaffSession();
  const contentTypes = manageableContentTypes(context.permissions);

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminHeader context={context} />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-sm font-bold tracking-[0.2em] text-blue-800 uppercase">
          Administration
        </p>
        <h1 className="mt-3 text-4xl font-black text-slate-950">
          Welcome, {context.displayName}
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-600">
          Your dashboard shows only the website and prayer-care areas your role
          permits.
        </p>
        <section
          className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Available administration areas"
        >
          {context.permissions.includes("staff.read") ? (
            <Link
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
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
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
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
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
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
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
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
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
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
