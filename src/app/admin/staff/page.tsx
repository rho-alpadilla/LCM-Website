import type { ReactNode } from "react";

import { AdminHeader } from "@/components/admin/admin-header";
import { requireActiveStaffSession } from "@/features/auth/staff-context";
import {
  assignRoleAction,
  inviteStaffAction,
  revokeRoleAction,
  suspendStaffAction,
} from "@/features/staff/actions";
import { inviteRoleOptions, roleOptions } from "@/features/staff/roles";
import { AccessControlRepository } from "@/server/repositories/access-control-repository";
import { AccessControlService } from "@/server/services/access-control-service";

const messages: Record<string, string> = {
  account_suspended: "The account was suspended.",
  invitation_recorded:
    "Invitation recorded. Add the exact email to Cloudflare Access, then notify the person.",
  role_assigned: "The role was assigned.",
  role_revoked: "The role was removed.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StaffPage({ searchParams }: Props) {
  const state = await requireActiveStaffSession("staff.read");
  const [{ staff, invitations }, parameters] = await Promise.all([
    new AccessControlService(
      new AccessControlRepository(state.environment.DB),
    ).listStaffDirectory(),
    searchParams,
  ]);
  const messageCode =
    typeof parameters.message === "string" ? parameters.message : "";
  const errorCode =
    typeof parameters.error === "string" ? parameters.error : "";

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminHeader context={state.context} />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-sm font-bold tracking-[0.2em] text-blue-800 uppercase">
          System administration
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
          Staff and roles
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          D1 controls permissions after Cloudflare Access verifies the person.
          Core Leader can be added only to an existing Leader and grants highly
          trusted senior-level access.
        </p>

        {messageCode ? (
          <p
            className="mt-6 rounded-xl bg-green-50 p-4 font-semibold text-green-800"
            role="status"
          >
            {messages[messageCode] ?? "The staff account was updated."}
          </p>
        ) : null}
        {errorCode ? (
          <p
            className="mt-6 rounded-xl bg-red-50 p-4 font-semibold text-red-800"
            role="alert"
          >
            The change could not be completed. Check the account, role rules,
            and required reason, then retry.
          </p>
        ) : null}

        {state.context.permissions.includes("staff.invite") ? (
          <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <h2 className="text-2xl font-black text-slate-950">
              Record a staff invitation
            </h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              This does not send email. After saving, a System Administrator
              must add the exact email to the Cloudflare Access allowlist and
              notify the person manually.
            </p>
            <form
              action={inviteStaffAction}
              className="mt-6 grid gap-5 sm:grid-cols-2"
            >
              <Field label="Email address">
                <input
                  className={inputClass}
                  maxLength={254}
                  name="email"
                  required
                  type="email"
                />
              </Field>
              <Field label="Display name">
                <input
                  className={inputClass}
                  maxLength={120}
                  minLength={2}
                  name="displayName"
                  required
                />
              </Field>
              <Field label="Phone (optional)">
                <input
                  className={inputClass}
                  maxLength={40}
                  name="phone"
                  type="tel"
                />
              </Field>
              <Field label="Church role or title (optional)">
                <input className={inputClass} maxLength={120} name="jobTitle" />
              </Field>
              <Field label="Initial access role">
                <select className={inputClass} name="roleCode" required>
                  {inviteRoleOptions.map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Assignment reason">
                <input
                  className={inputClass}
                  maxLength={500}
                  name="reason"
                  placeholder="Required for System Administrator"
                />
              </Field>
              <button
                className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white sm:col-span-2"
                type="submit"
              >
                Record invitation
              </button>
            </form>
          </section>
        ) : null}

        {invitations.length ? (
          <section className="mt-10">
            <h2 className="text-2xl font-black text-slate-950">
              Pending invitations
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {invitations.map((invitation) => (
                <article
                  className="rounded-2xl border border-amber-200 bg-amber-50 p-5"
                  key={invitation.id}
                >
                  <h3 className="font-black text-slate-950">
                    {invitation.displayName}
                  </h3>
                  <p className="mt-1 text-sm break-all text-slate-700">
                    {invitation.email}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-amber-900">
                    {invitation.initialRoleName} · awaiting first sign-in
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-10 space-y-5" aria-label="Staff accounts">
          <h2 className="text-2xl font-black text-slate-950">
            Active and retained accounts
          </h2>
          {staff.map((person) => (
            <article
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              key={person.id}
            >
              <div className="flex flex-wrap justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-xl font-black text-slate-950">
                    {person.displayName}
                  </h3>
                  <p className="text-sm break-all text-slate-600">
                    {person.email}
                  </p>
                  <p className="text-slate-600">
                    {person.jobTitle || "No church title recorded"}
                  </p>
                </div>
                <span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700 capitalize">
                  {person.accountStatus}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {person.roles.map((role) => (
                  <span
                    className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-900"
                    key={role.assignmentId}
                  >
                    {role.name}
                  </span>
                ))}
              </div>

              {state.context.permissions.includes("staff.roles.manage") &&
              person.accountStatus === "active" ? (
                <div className="mt-6 grid gap-5 border-t border-slate-200 pt-6 lg:grid-cols-2">
                  <form action={assignRoleAction} className="grid gap-3">
                    <input name="staffId" type="hidden" value={person.id} />
                    <Field label="Add role">
                      <select className={inputClass} name="roleCode">
                        {roleOptions.map(([code, label]) => (
                          <option key={code} value={code}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <input
                      className={inputClass}
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
                  {person.roles.length ? (
                    <form action={revokeRoleAction} className="grid gap-3">
                      <input name="staffId" type="hidden" value={person.id} />
                      <Field label="Remove role">
                        <select className={inputClass} name="roleCode">
                          {person.roles.map((role) => (
                            <option key={role.assignmentId} value={role.code}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <input
                        className={inputClass}
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

              {state.context.permissions.includes("staff.suspend") &&
              person.accountStatus === "active" ? (
                <form
                  action={suspendStaffAction}
                  className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row"
                >
                  <input name="staffId" type="hidden" value={person.id} />
                  <input
                    className={`${inputClass} min-w-0 flex-1`}
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
          ))}
        </section>
      </main>
    </div>
  );
}

const inputClass = "mt-2 w-full rounded-xl border border-slate-300 px-4 py-3";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block font-semibold">
      {label}
      {children}
    </label>
  );
}
