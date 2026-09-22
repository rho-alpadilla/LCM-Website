import type { ReactNode } from "react";

import { AdminHeader } from "@/frontend/components/admin/admin-header";
import { getStaffWorkspace } from "@/backend/queries/staff/admin-directory";
import { getAdminNotificationSummary } from "@/backend/queries/admin/notifications";
import {
  assignRoleAction,
  cancelStaffInvitationAction,
  inviteStaffAction,
  revokeRoleAction,
  retryStaffInvitationAccessAction,
  suspendStaffAction,
} from "@/backend/actions/staff";
import { roleOptions } from "@/shared/staff/roles";

const messages: Record<string, string> = {
  account_suspended: "The account was suspended.",
  account_created:
    "Staff account created and secure email sign-in is ready. Share the admin link with them.",
  account_created_needs_setup:
    "The staff account was saved, but secure sign-in needs attention. Use Retry setup below after reviewing the Cloudflare connection.",
  invitation_cancelled:
    "The pending invitation was cancelled. A new invitation can be created later if needed.",
  staff_access_needs_attention:
    "Secure sign-in still needs attention. The staff account remains saved; retry after correcting the Cloudflare Access connection.",
  staff_access_ready:
    "Secure sign-in is ready. The person can now use the admin link and their email code.",
  role_assigned: "The role was assigned.",
  role_revoked: "The role was removed.",
};

const errors: Record<string, string> = {
  invalid_invitation_cancellation:
    "Enter a cancellation reason with at least 10 characters, then retry.",
  invalid_invitation_retry:
    "This staff setup record is invalid. Refresh and retry.",
  invitation_not_pending:
    "This invitation is no longer pending. Refresh the page to review the current staff list.",
  invitation_cancellation_failed:
    "The invitation could not be cancelled. A safe diagnostic was recorded; wait a moment and retry once.",
  elevated_role_reason_required:
    "System Administrator and Core Leader access require a reason of at least 10 characters.",
  staff_email_exists:
    "This email already has an active account or a pending staff account. Use a different email, or review the existing record below.",
  staff_setup_required:
    "Staff sign-in setup is not ready. Complete the one-time Cloudflare Access connection first.",
  staff_access_authorization_failed:
    "Cloudflare rejected the website's staff-access permission. The staff account was not saved.",
  staff_access_policy_missing:
    "The configured Cloudflare staff policy could not be found. The staff account was not saved.",
  staff_access_policy_invalid:
    "The Cloudflare staff policy has an unsupported rule. The staff account was not saved. It must be an Allow policy containing only exact staff email addresses.",
  staff_access_unreachable:
    "Cloudflare Access could not be reached. The staff account was not saved; wait a moment and retry once.",
  staff_access_update_failed:
    "Cloudflare could not update the secure staff sign-in list. The staff account was not saved.",
  invitation_failed:
    "The staff account was not saved. A safe diagnostic was recorded; review the Worker logs before retrying.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StaffPage({ searchParams }: Props) {
  const [state, parameters, notifications] = await Promise.all([
    getStaffWorkspace(),
    searchParams,
    getAdminNotificationSummary(),
  ]);
  const { staff, invitations } = state;
  const messageCode =
    typeof parameters.message === "string" ? parameters.message : "";
  const errorCode =
    typeof parameters.error === "string" ? parameters.error : "";
  const canCancelInvitations =
    state.context.permissions.includes("staff.invite") &&
    state.context.permissions.includes("staff.roles.manage");
  const canManageProvisioning = canCancelInvitations;

  return (
    <div className="min-h-screen bg-slate-100 lg:pl-72">
      <AdminHeader context={state.context} notifications={notifications} />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-sm font-bold tracking-[0.2em] text-blue-800 uppercase">
          System administration
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
          Staff and roles
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Create each staff account once here. The account is saved before
          secure email sign-in is connected, so a setup issue can be safely
          retried instead of losing the record. Core Leader and System
          Administrator access require a documented reason.
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
              "The change could not be completed. Check the account, role rules, and required reason, then retry."}
          </p>
        ) : null}

        {state.context.permissions.includes("staff.invite") ? (
          <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <h2 className="text-2xl font-black text-slate-950">Add staff</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              The person only needs to open the admin link and enter the email
              code sent by Cloudflare. This website does not send invitation
              emails, so share the link with them yourself.
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
              <button
                className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white sm:col-span-2"
                type="submit"
              >
                Create staff account
              </button>
            </form>
          </section>
        ) : null}

        {invitations.length ? (
          <section className="mt-10">
            <h2 className="text-2xl font-black text-slate-950">
              New staff accounts
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
                    {invitation.initialRoleName} ·{" "}
                    {provisioningLabel(invitation.accessProvisioningStatus)}
                  </p>
                  {invitation.accessProvisioningStatus !== "ready" ? (
                    <p className="mt-2 text-sm leading-6 text-amber-950">
                      The account is saved. Secure sign-in is not available
                      until this setup is ready.
                    </p>
                  ) : null}
                  {canManageProvisioning &&
                  invitation.accessProvisioningStatus !== "ready" ? (
                    <form
                      action={retryStaffInvitationAccessAction}
                      className="mt-4"
                    >
                      <input
                        name="invitationId"
                        type="hidden"
                        value={invitation.id}
                      />
                      <button
                        className="rounded-xl bg-blue-800 px-4 py-2 font-bold text-white"
                        type="submit"
                      >
                        Retry secure sign-in setup
                      </button>
                    </form>
                  ) : null}
                  {canCancelInvitations ? (
                    <details className="mt-5 border-t border-amber-200 pt-4">
                      <summary className="cursor-pointer font-bold text-red-800">
                        Cancel this invitation
                      </summary>
                      <form
                        action={cancelStaffInvitationAction}
                        className="mt-3"
                      >
                        <input
                          name="invitationId"
                          type="hidden"
                          value={invitation.id}
                        />
                        <label className="block text-sm font-semibold text-slate-800">
                          Why is this invitation being cancelled?
                          <input
                            className={inputClass}
                            maxLength={500}
                            minLength={10}
                            name="reason"
                            placeholder="At least 10 characters"
                            required
                          />
                        </label>
                        <button
                          className="mt-3 rounded-xl border border-red-300 px-4 py-2 font-bold text-red-800"
                          type="submit"
                        >
                          Cancel invitation
                        </button>
                      </form>
                    </details>
                  ) : null}
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

function provisioningLabel(status: string) {
  if (status === "ready") return "awaiting first email sign-in";
  if (status === "needs_attention") return "secure sign-in needs attention";
  return "secure sign-in setup in progress";
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block font-semibold">
      {label}
      {children}
    </label>
  );
}
