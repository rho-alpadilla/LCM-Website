import { redirect } from "next/navigation";

import { AdminHeader } from "@/components/admin/admin-header";
import { requireActiveStaffSession } from "@/features/auth/staff-context";
import {
  assignRoleAction,
  inviteStaffAction,
  revokeRoleAction,
  suspendStaffAction,
} from "@/features/staff/actions";
import {
  inviteRoleOptions,
  roleLabel,
  roleOptions,
} from "@/features/staff/roles";

type StaffAssignment = {
  id: string;
  revoked_at: string | null;
  roles:
    { code: string; name: string } | { code: string; name: string }[] | null;
};

type StaffRow = {
  id: string;
  display_name: string;
  job_title: string | null;
  account_status: string;
  staff_roles: StaffAssignment[];
};

const messages: Record<string, string> = {
  account_suspended: "The account was suspended.",
  invitation_sent: "The invitation was sent.",
  role_assigned: "The role was assigned.",
  role_revoked: "The role was revoked.",
};

type StaffPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StaffPage({ searchParams }: StaffPageProps) {
  const { context, supabase } = await requireActiveStaffSession();
  if (!context.permissions.includes("staff.read")) {
    redirect("/admin/access-denied");
  }

  const [{ data, error }, parameters] = await Promise.all([
    supabase
      .from("staff_profiles")
      .select(
        "id, display_name, job_title, account_status, staff_roles(id, revoked_at, roles(code, name))",
      )
      .order("display_name"),
    searchParams,
  ]);
  const staff = (data ?? []) as StaffRow[];
  const messageCode =
    typeof parameters.message === "string" ? parameters.message : "";
  const errorCode =
    typeof parameters.error === "string" ? parameters.error : "";

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminHeader context={context} />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-sm font-bold tracking-[0.2em] text-blue-800 uppercase">
          System administration
        </p>
        <h1 className="mt-3 text-4xl font-black text-slate-950">
          Staff and roles
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Invite one account per person. Core Leader access can be added only to
          an existing Leader and requires a clear reason.
        </p>

        {messageCode ? (
          <p
            className="mt-6 rounded-xl bg-green-50 p-4 font-semibold text-green-800"
            role="status"
          >
            {messages[messageCode] ?? "The staff account was updated."}
          </p>
        ) : null}
        {errorCode || error ? (
          <p
            className="mt-6 rounded-xl bg-red-50 p-4 font-semibold text-red-800"
            role="alert"
          >
            The requested change could not be completed. Check the role rules
            and required reason, then retry.
          </p>
        ) : null}

        {context.permissions.includes("staff.invite") ? (
          <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-black text-slate-950">
              Invite staff member
            </h2>
            <form
              action={inviteStaffAction}
              className="mt-6 grid gap-5 sm:grid-cols-2"
            >
              <label className="font-semibold">
                Email address
                <input
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
                  maxLength={254}
                  name="email"
                  required
                  type="email"
                />
              </label>
              <label className="font-semibold">
                Display name
                <input
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
                  maxLength={120}
                  minLength={2}
                  name="displayName"
                  required
                />
              </label>
              <label className="font-semibold">
                Phone{" "}
                <span className="font-normal text-slate-500">(optional)</span>
                <input
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
                  maxLength={40}
                  name="phone"
                  type="tel"
                />
              </label>
              <label className="font-semibold">
                Church role or title{" "}
                <span className="font-normal text-slate-500">(optional)</span>
                <input
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
                  maxLength={120}
                  name="jobTitle"
                />
              </label>
              <label className="font-semibold">
                Initial access role
                <select
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
                  name="roleCode"
                  required
                >
                  {inviteRoleOptions.map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="font-semibold">
                Assignment reason
                <input
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
                  maxLength={500}
                  name="reason"
                  placeholder="Required for System Administrator"
                />
              </label>
              <button
                className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white sm:col-span-2"
                type="submit"
              >
                Send secure invitation
              </button>
            </form>
          </section>
        ) : null}

        <section className="mt-10 space-y-5" aria-label="Staff accounts">
          {staff.map((person) => {
            const activeRoles = person.staff_roles
              .filter((assignment) => !assignment.revoked_at)
              .flatMap((assignment) => assignment.roles ?? []);

            return (
              <article
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                key={person.id}
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      {person.display_name}
                    </h2>
                    <p className="text-slate-600">
                      {person.job_title || "No church title recorded"}
                    </p>
                  </div>
                  <span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700 capitalize">
                    {person.account_status}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {activeRoles.map((role) => (
                    <span
                      className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-900"
                      key={role.code}
                    >
                      {role.name}
                    </span>
                  ))}
                </div>

                {context.permissions.includes("staff.roles.manage") ? (
                  <div className="mt-6 grid gap-5 border-t border-slate-200 pt-6 lg:grid-cols-2">
                    <form action={assignRoleAction} className="grid gap-3">
                      <input name="staffId" type="hidden" value={person.id} />
                      <label className="font-semibold">
                        Add role
                        <select
                          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
                          name="roleCode"
                        >
                          {roleOptions.map(([code, label]) => (
                            <option key={code} value={code}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <input
                        className="rounded-xl border border-slate-300 px-4 py-3"
                        maxLength={500}
                        name="reason"
                        placeholder="Reason (required for elevated roles)"
                      />
                      <button
                        className="rounded-xl border border-blue-800 px-4 py-3 font-bold text-blue-800"
                        type="submit"
                      >
                        Assign role
                      </button>
                    </form>
                    {activeRoles.length ? (
                      <form action={revokeRoleAction} className="grid gap-3">
                        <input name="staffId" type="hidden" value={person.id} />
                        <label className="font-semibold">
                          Remove role
                          <select
                            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
                            name="roleCode"
                          >
                            {activeRoles.map((role) => (
                              <option key={role.code} value={role.code}>
                                {roleLabel.get(role.code) ?? role.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <input
                          className="rounded-xl border border-slate-300 px-4 py-3"
                          maxLength={500}
                          minLength={10}
                          name="reason"
                          placeholder="Required reason (at least 10 characters)"
                          required
                        />
                        <button
                          className="rounded-xl border border-red-300 px-4 py-3 font-bold text-red-800"
                          type="submit"
                        >
                          Remove role
                        </button>
                      </form>
                    ) : null}
                  </div>
                ) : null}

                {context.permissions.includes("staff.suspend") &&
                person.account_status !== "suspended" ? (
                  <form
                    action={suspendStaffAction}
                    className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row"
                  >
                    <input name="staffId" type="hidden" value={person.id} />
                    <input
                      className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3"
                      maxLength={500}
                      minLength={10}
                      name="reason"
                      placeholder="Suspension reason (at least 10 characters)"
                      required
                    />
                    <button
                      className="rounded-xl bg-red-800 px-5 py-3 font-bold text-white"
                      type="submit"
                    >
                      Suspend account
                    </button>
                  </form>
                ) : null}
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
