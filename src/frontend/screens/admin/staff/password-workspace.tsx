import type { ReactNode } from "react";

import { AdminHeader } from "@/frontend/components/admin/admin-header";
import { getAdminNotificationSummary } from "@/backend/queries/admin/notifications";
import { getPasswordStaffWorkspace } from "@/backend/queries/staff/password-directory";
import {
  assignRoleAction,
  createPasswordStaffAction,
  revokeRoleAction,
  resetStaffPasswordAction,
  reactivateTemporaryPasswordAction,
  revokeStaffPasswordSessionsAction,
  suspendStaffAction,
} from "@/backend/actions/staff";
import { roleOptions } from "@/shared/staff/roles";

const messages: Record<string, string> = {
  password_staff_created:
    "The account can sign in now. Hand over the temporary password privately; it expires after three days unless they choose a personal password.",
  password_reset_issued:
    "A replacement temporary password was issued. It expires after 30 minutes and signed the staff member out everywhere.",
  password_sessions_revoked:
    "All active website sessions for that staff account were revoked.",
  password_reactivation_issued:
    "A new temporary password was issued and the account is active for three days. Hand it over privately.",
  role_assigned: "The role was assigned.",
  role_revoked: "The role was removed.",
  account_suspended: "The account was suspended.",
};

const errors: Record<string, string> = {
  password_staff_admin_password_invalid:
    "Your current System Administrator password could not be verified. No staff account was created.",
  password_staff_email_exists:
    "That contact email already belongs to a staff account. Use a different email or review the existing account below.",
  password_staff_username_exists:
    "That username is already in use. Choose a different username.",
  password_staff_elevated_reason_required:
    "System Administrator and Core Leader accounts need an assignment reason of at least 10 characters.",
  password_staff_rate_limited:
    "Too many password confirmations were attempted. Wait a few minutes, then try again.",
  password_staff_invalid_input:
    "Check the required fields: name, valid email, username, and a temporary password with at least 15 characters.",
  password_staff_creation_failed:
    "The staff account was not created. Refresh once and retry; no partial account was saved.",
  password_reset_failed:
    "The password reset was not issued. Verify the account, reason, temporary password, and your own password, then retry.",
  password_session_revocation_failed:
    "Sessions were not revoked. Check the reason and your own password, then retry.",
  password_reactivation_failed:
    "The account could not be reactivated. Check the temporary password, reason, and your own password, then retry.",
  role_assignment_failed:
    "The role could not be assigned. Check the account and the required reason, then retry.",
  role_revocation_failed:
    "The role could not be removed. Check the account and reason, then retry.",
  suspension_failed:
    "The account could not be suspended. Check the reason, then retry.",
};

export async function PasswordStaffWorkspace({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [workspace, notifications, parameters] = await Promise.all([
    getPasswordStaffWorkspace(),
    getAdminNotificationSummary(),
    searchParams,
  ]);
  const messageCode =
    typeof parameters.message === "string" ? parameters.message : "";
  const errorCode =
    typeof parameters.error === "string" ? parameters.error : "";
  const canManageCredentials = workspace.context.permissions.includes(
    "staff.credentials.manage",
  );
  const canManageRoles =
    workspace.context.permissions.includes("staff.roles.manage");
  const canSuspendStaff =
    workspace.context.permissions.includes("staff.suspend");

  return (
    <div className="min-h-screen bg-slate-100 lg:pl-72">
      <AdminHeader context={workspace.context} notifications={notifications} />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-sm font-bold tracking-[0.2em] text-blue-800 uppercase">
          System administration
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
          Staff and access
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Create a private username and one-time temporary password for each
          person. The temporary password is never saved in readable form, and
          staff can use it for up to three days while a clear dashboard reminder
          asks them to choose a personal password.
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
            {errors[errorCode] ??
              "The change could not be completed safely. Refresh and retry."}
          </p>
        ) : null}

        {canManageCredentials ? (
          <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <h2 className="text-2xl font-black text-slate-950">
              Add staff account
            </h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              Share the temporary password only through a verified private
              conversation. Do not put it in group chats, email, screenshots, or
              notes.
            </p>
            <form
              action={createPasswordStaffAction}
              className="mt-6 grid gap-5 sm:grid-cols-2"
            >
              <Field label="Display name">
                <input
                  className={inputClass}
                  maxLength={120}
                  minLength={2}
                  name="displayName"
                  required
                />
              </Field>
              <Field label="Contact email">
                <input
                  className={inputClass}
                  maxLength={254}
                  name="email"
                  required
                  type="email"
                />
              </Field>
              <Field label="Username">
                <input
                  autoCapitalize="none"
                  className={inputClass}
                  maxLength={64}
                  minLength={3}
                  name="username"
                  required
                />
              </Field>
              <Field label="Temporary password">
                <input
                  autoComplete="new-password"
                  className={inputClass}
                  minLength={15}
                  name="temporaryPassword"
                  required
                  type="password"
                />
              </Field>
              <Field label="Church role or title (optional)">
                <input className={inputClass} maxLength={120} name="jobTitle" />
              </Field>
              <Field label="Phone (optional)">
                <input
                  className={inputClass}
                  maxLength={40}
                  name="phone"
                  type="tel"
                />
              </Field>
              <Field label="Access role">
                <select className={inputClass} name="roleCode" required>
                  {roleOptions.map(([code, label]) => (
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
                  placeholder="Required for System Administrator or Core Leader"
                />
              </Field>
              <Field label="Confirm with your password">
                <input
                  autoComplete="current-password"
                  className={inputClass}
                  minLength={15}
                  name="adminPassword"
                  required
                  type="password"
                />
              </Field>
              <p className="self-end text-sm leading-6 text-slate-600">
                This confirmation protects staff creation if an administrator’s
                device is left unattended.
              </p>
              <button
                className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white sm:col-span-2"
                type="submit"
              >
                Create staff account
              </button>
            </form>
          </section>
        ) : null}

        <section
          className="mt-10 space-y-5"
          aria-label="Staff password accounts"
        >
          <h2 className="text-2xl font-black text-slate-950">Staff accounts</h2>
          {workspace.staff.map((person) => (
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
                  <p className="mt-1 text-sm font-semibold text-blue-900">
                    {person.username
                      ? `@${person.username}`
                      : "No password username"}
                  </p>
                </div>
                <span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700 capitalize">
                  {person.accountStatus === "disabled" &&
                  person.temporaryPasswordPending
                    ? "temporary password expired"
                    : person.temporaryPasswordPending
                      ? "password change due"
                      : person.accountStatus}
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
              {canManageCredentials &&
              person.username &&
              person.accountStatus === "active" ? (
                <div className="mt-6 grid gap-5 border-t border-slate-200 pt-6 lg:grid-cols-2">
                  <form
                    action={resetStaffPasswordAction}
                    className="grid gap-3"
                  >
                    <input name="staffId" type="hidden" value={person.id} />
                    <h4 className="font-black text-slate-950">
                      Issue replacement temporary password
                    </h4>
                    <input
                      autoComplete="new-password"
                      className={inputClass}
                      minLength={15}
                      name="temporaryPassword"
                      placeholder="New temporary password"
                      required
                      type="password"
                    />
                    <input
                      className={inputClass}
                      maxLength={500}
                      minLength={10}
                      name="reason"
                      placeholder="Verified handover reason"
                      required
                    />
                    <input
                      autoComplete="current-password"
                      className={inputClass}
                      minLength={15}
                      name="adminPassword"
                      placeholder="Your password"
                      required
                      type="password"
                    />
                    <button
                      className="rounded-xl border border-blue-800 px-4 py-3 font-bold text-blue-800"
                      type="submit"
                    >
                      Issue reset
                    </button>
                  </form>
                  <form
                    action={revokeStaffPasswordSessionsAction}
                    className="grid gap-3"
                  >
                    <input name="staffId" type="hidden" value={person.id} />
                    <h4 className="font-black text-slate-950">
                      Sign out on all devices
                    </h4>
                    <input
                      className={inputClass}
                      maxLength={500}
                      minLength={10}
                      name="reason"
                      placeholder="Security reason"
                      required
                    />
                    <input
                      autoComplete="current-password"
                      className={inputClass}
                      minLength={15}
                      name="adminPassword"
                      placeholder="Your password"
                      required
                      type="password"
                    />
                    <button
                      className="rounded-xl border border-red-300 px-4 py-3 font-bold text-red-800"
                      type="submit"
                    >
                      Revoke sessions
                    </button>
                  </form>
                </div>
              ) : null}
              {canManageCredentials &&
              person.username &&
              person.accountStatus === "disabled" &&
              person.temporaryPasswordPending ? (
                <form
                  action={reactivateTemporaryPasswordAction}
                  className="mt-6 grid gap-3 border-t border-amber-200 pt-6"
                >
                  <input name="staffId" type="hidden" value={person.id} />
                  <h4 className="font-black text-slate-950">
                    Reactivate password setup
                  </h4>
                  <p className="text-sm leading-6 text-slate-600">
                    Verify the person&apos;s identity privately, then issue a
                    new temporary password. It gives them three days to choose a
                    personal password.
                  </p>
                  <input
                    autoComplete="new-password"
                    className={inputClass}
                    minLength={15}
                    name="temporaryPassword"
                    placeholder="New temporary password"
                    required
                    type="password"
                  />
                  <input
                    className={inputClass}
                    maxLength={500}
                    minLength={10}
                    name="reason"
                    placeholder="Verified reactivation reason"
                    required
                  />
                  <input
                    autoComplete="current-password"
                    className={inputClass}
                    minLength={15}
                    name="adminPassword"
                    placeholder="Your password"
                    required
                    type="password"
                  />
                  <button
                    className="rounded-xl border border-amber-500 px-4 py-3 font-bold text-amber-900"
                    type="submit"
                  >
                    Reactivate account
                  </button>
                </form>
              ) : null}
              {canManageRoles && person.accountStatus === "active" ? (
                <div className="mt-6 grid gap-5 border-t border-slate-200 pt-6 lg:grid-cols-2">
                  <form action={assignRoleAction} className="grid gap-3">
                    <input name="staffId" type="hidden" value={person.id} />
                    <h4 className="font-black text-slate-950">Add role</h4>
                    <select className={inputClass} name="roleCode">
                      {roleOptions.map(([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <input
                      className={inputClass}
                      maxLength={500}
                      name="reason"
                      placeholder="Reason (required for System Administrator or Core Leader)"
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
                      <h4 className="font-black text-slate-950">Remove role</h4>
                      <select className={inputClass} name="roleCode">
                        {person.roles.map((role) => (
                          <option key={role.assignmentId} value={role.code}>
                            {role.name}
                          </option>
                        ))}
                      </select>
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
              {canSuspendStaff && person.accountStatus === "active" ? (
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
