import { requireActiveStaffSession } from "@/backend/auth/staff-context";
import { getAdminNotificationSummary } from "@/backend/queries/admin/notifications";
import { AdminHeader } from "@/frontend/components/admin/admin-header";
import { roleLabel } from "@/shared/staff/roles";

export default async function ProfilePage() {
  const [{ context }, notifications] = await Promise.all([
    requireActiveStaffSession(),
    getAdminNotificationSummary(),
  ]);

  return (
    <div className="min-h-screen bg-slate-100 lg:pl-72">
      <AdminHeader context={context} notifications={notifications} />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm font-bold tracking-[0.2em] text-blue-800 uppercase">
          Administration
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
          My account
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          Your identity is secured by Cloudflare Access. Your email sign-in code
          is never stored by this website.
        </p>
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <dl className="grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-bold text-slate-500">Name</dt>
              <dd className="mt-1 font-black text-slate-950">
                {context.displayName}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-slate-500">
                Sign-in email
              </dt>
              <dd className="mt-1 font-black break-all text-slate-950">
                {context.email}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-slate-500">
                Account status
              </dt>
              <dd className="mt-1 font-black text-slate-950 capitalize">
                {context.accountStatus}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-slate-500">
                Assigned roles
              </dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {context.roles.map((role) => (
                  <span
                    className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-900"
                    key={role}
                  >
                    {roleLabel.get(role) ?? role}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}
