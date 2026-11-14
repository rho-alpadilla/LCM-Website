import type { ReactNode } from "react";

import {
  assignRoleAction,
  reactivateTemporaryPasswordAction,
  revokeRoleAction,
  revokeStaffPasswordSessionsAction,
  suspendStaffAction,
} from "@/backend/actions/staff";
import { roleOptions } from "@/shared/staff/roles";
import type { PasswordStaffDirectoryEntry } from "@/shared/staff/password-directory";

import { StaffPasswordRecoveryForm } from "./staff-password-recovery-form";

type Props = {
  person: PasswordStaffDirectoryEntry;
  canManageCredentials: boolean;
  canManageRoles: boolean;
  canSuspendStaff: boolean;
  returnHref: string;
};

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100";

export function StaffAccountManagementPanel({
  person,
  canManageCredentials,
  canManageRoles,
  canSuspendStaff,
  returnHref,
}: Props) {
  return (
    <section
      className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
      id="staff-management"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-sm font-bold tracking-[0.18em] text-blue-800 uppercase">
            Selected account
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Manage {person.displayName}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {person.email} {person.username ? `· @${person.username}` : ""}
          </p>
        </div>
        <a
          className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-800 transition-colors hover:bg-slate-50"
          href={returnHref}
        >
          Back to staff list
        </a>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {person.roles.map((role) => (
          <span
            className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-900"
            key={role.assignmentId}
          >
            {role.name}
          </span>
        ))}
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700 capitalize">
          {statusLabel(person)}
        </span>
      </div>

      {canManageCredentials &&
      person.username &&
      person.accountStatus === "active" ? (
        <div className="mt-7 border-t border-slate-200 pt-7">
          <StaffPasswordRecoveryForm
            staffId={person.id}
            username={person.username}
          />
          <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <summary className="cursor-pointer font-semibold text-slate-800">
              Sign out on all devices without changing the password
            </summary>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use this only when the password is still valid. Resetting access
              above already signs the account out everywhere.
            </p>
            <form
              action={revokeStaffPasswordSessionsAction}
              className="mt-4 grid gap-3"
            >
              <input name="staffId" type="hidden" value={person.id} />
              <Field label="Security reason">
                <input
                  className={inputClass}
                  maxLength={500}
                  minLength={10}
                  name="reason"
                  required
                />
              </Field>
              <Field label="Confirm with your administrator password">
                <input
                  autoComplete="current-password"
                  className={inputClass}
                  minLength={15}
                  name="adminPassword"
                  required
                  type="password"
                />
              </Field>
              <button
                className="rounded-xl border border-red-300 px-4 py-3 font-bold text-red-800 transition-transform duration-150 ease-out active:scale-[0.97]"
                type="submit"
              >
                Sign out on all devices
              </button>
            </form>
          </details>
        </div>
      ) : null}

      {canManageCredentials &&
      person.username &&
      person.accountStatus === "disabled" &&
      person.temporaryPasswordPending ? (
        <form
          action={reactivateTemporaryPasswordAction}
          className="mt-7 grid gap-3 border-t border-amber-200 pt-7"
        >
          <input name="staffId" type="hidden" value={person.id} />
          <h3 className="font-black text-slate-950">
            Reactivate password setup
          </h3>
          <p className="text-sm leading-6 text-slate-600">
            Verify the person&apos;s identity privately, then issue a new
            temporary password. It gives them three days to choose a personal
            password.
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
            className="rounded-xl border border-amber-500 px-4 py-3 font-bold text-amber-900 transition-transform duration-150 ease-out active:scale-[0.97]"
            type="submit"
          >
            Reactivate account
          </button>
        </form>
      ) : null}

      {canManageRoles && person.accountStatus === "active" ? (
        <div className="mt-7 grid gap-5 border-t border-slate-200 pt-7 lg:grid-cols-2">
          <form action={assignRoleAction} className="grid gap-3">
            <input name="staffId" type="hidden" value={person.id} />
            <h3 className="font-black text-slate-950">Add role</h3>
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
              className="rounded-xl border border-blue-800 px-4 py-3 font-bold text-blue-800 transition-transform duration-150 ease-out active:scale-[0.97]"
              type="submit"
            >
              Assign role
            </button>
          </form>
          {person.roles.length ? (
            <form action={revokeRoleAction} className="grid gap-3">
              <input name="staffId" type="hidden" value={person.id} />
              <h3 className="font-black text-slate-950">Remove role</h3>
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
                className="rounded-xl border border-red-300 px-4 py-3 font-bold text-red-800 transition-transform duration-150 ease-out active:scale-[0.97]"
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
          className="mt-7 flex flex-col gap-3 border-t border-slate-200 pt-7 sm:flex-row"
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
            className="rounded-xl bg-red-800 px-5 py-3 font-bold text-white transition-transform duration-150 ease-out active:scale-[0.97]"
            type="submit"
          >
            Suspend account
          </button>
        </form>
      ) : null}
    </section>
  );
}

function statusLabel(person: PasswordStaffDirectoryEntry) {
  if (person.accountStatus === "disabled" && person.temporaryPasswordPending) {
    return "Temporary password expired";
  }
  if (person.temporaryPasswordPending) return "Password change due";
  return person.accountStatus;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block font-semibold text-slate-900">
      {label}
      {children}
    </label>
  );
}
