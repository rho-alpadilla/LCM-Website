import Link from "next/link";

import { AdminHeader } from "@/components/admin/admin-header";
import { requireActiveStaffSession } from "@/features/auth/staff-context";

export const metadata = { title: "Administration" };

export default async function AdminPage() {
  const { context } = await requireActiveStaffSession();

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
          Your dashboard will show only the ministry areas your role permits.
          Content, prayer, and giving cards will be added as those modules are
          implemented.
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
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
            <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">
              Clearly labeled placeholder
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950">
              Ministry tools coming next
            </h2>
          </div>
        </section>
      </main>
    </div>
  );
}
