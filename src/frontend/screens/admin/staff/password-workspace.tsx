import Link from "next/link";

import { AdminHeader } from "@/frontend/components/admin/admin-header";
import { getAdminNotificationSummary } from "@/backend/queries/admin/notifications";
import { getPasswordStaffWorkspace } from "@/backend/queries/staff/password-directory";
import { roleOptions, type RoleCode } from "@/shared/staff/roles";
import type { PasswordStaffDirectoryFilters } from "@/shared/staff/password-directory";
import type { StaffAccountStatus } from "@/shared/staff/types";

import { StaffAccountCreateDialog } from "./components/staff-account-create-dialog";
import { StaffAccountManagementPanel } from "./components/staff-account-management-panel";

const pageSize = 20;

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
    "The account could not be suspended. Check the account and reason, then retry.",
};

type SearchParameters = Record<string, string | string[] | undefined>;

export async function PasswordStaffWorkspace({
  searchParams,
}: {
  searchParams: Promise<SearchParameters>;
}) {
  const parameters = await searchParams;
  const filters = readDirectoryFilters(parameters);
  const [workspace, notifications] = await Promise.all([
    getPasswordStaffWorkspace(filters),
    getAdminNotificationSummary(),
  ]);
  const messageCode = valueFor(parameters, "message");
  const errorCode = valueFor(parameters, "error");
  const selectedStaffId = valueFor(parameters, "selected");
  const selectedStaff = workspace.staff.entries.find(
    (person) => person.id === selectedStaffId,
  );
  const canManageCredentials = workspace.context.permissions.includes(
    "staff.credentials.manage",
  );
  const canManageRoles =
    workspace.context.permissions.includes("staff.roles.manage");
  const canSuspendStaff =
    workspace.context.permissions.includes("staff.suspend");
  const activeFilters = { ...filters, page: workspace.staff.page };
  const totalPages = Math.max(1, Math.ceil(workspace.staff.total / pageSize));
  const hasPreviousPage = activeFilters.page > 1;
  const hasNextPage = activeFilters.page < totalPages;
  const resultStart = workspace.staff.total
    ? (activeFilters.page - 1) * pageSize + 1
    : 0;
  const resultEnd = Math.min(
    activeFilters.page * pageSize,
    workspace.staff.total,
  );
  const baseHref = staffDirectoryHref(activeFilters);

  return (
    <div className="min-h-screen bg-slate-100 lg:pl-72">
      <AdminHeader context={workspace.context} notifications={notifications} />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-bold tracking-[0.2em] text-blue-800 uppercase">
              System administration
            </p>
            <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
              Staff and access
            </h1>
            <p className="mt-4 max-w-3xl leading-7 text-slate-600">
              Create and manage private staff accounts. Temporary passwords are
              never stored in readable form and expire after three days unless
              the person chooses a personal password.
            </p>
          </div>
          {canManageCredentials ? <StaffAccountCreateDialog /> : null}
        </div>

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

        <section className="mt-10" id="staff-directory">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Staff accounts
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Search by name, email, or username. Account controls stay out of
                the list until you select a person to manage.
              </p>
            </div>
            <p className="text-sm font-semibold text-slate-600">
              {workspace.staff.total} account
              {workspace.staff.total === 1 ? "" : "s"}
            </p>
          </div>

          <form className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_12rem_14rem_auto_auto]">
            <label className="sr-only" htmlFor="staff-search">
              Search staff accounts
            </label>
            <input
              className={filterInputClass}
              defaultValue={filters.search}
              id="staff-search"
              maxLength={100}
              name="search"
              placeholder="Search name, email, or username"
              type="search"
            />
            <label className="sr-only" htmlFor="staff-status">
              Filter by account status
            </label>
            <select
              className={filterInputClass}
              defaultValue={filters.accountStatus}
              id="staff-status"
              name="status"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="suspended">Suspended</option>
              <option value="invited">Invited</option>
            </select>
            <label className="sr-only" htmlFor="staff-role">
              Filter by access role
            </label>
            <select
              className={filterInputClass}
              defaultValue={filters.roleCode}
              id="staff-role"
              name="role"
            >
              <option value="all">All roles</option>
              {roleOptions.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
            <button
              className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white transition-transform duration-150 ease-out active:scale-[0.97]"
              type="submit"
            >
              Apply
            </button>
            <Link
              className="rounded-xl px-4 py-3 text-center font-bold text-slate-700 transition-colors hover:bg-slate-100"
              href="/admin/staff#staff-directory"
            >
              Clear
            </Link>
          </form>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <caption className="sr-only">
                Staff accounts and access roles
              </caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-sm text-slate-700">
                <tr>
                  <th className="px-5 py-4 font-bold" scope="col">
                    Staff member
                  </th>
                  <th className="px-5 py-4 font-bold" scope="col">
                    Username
                  </th>
                  <th className="px-5 py-4 font-bold" scope="col">
                    Access roles
                  </th>
                  <th className="px-5 py-4 font-bold" scope="col">
                    Status
                  </th>
                  <th className="px-5 py-4 text-right font-bold" scope="col">
                    <span className="sr-only">Account actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {workspace.staff.entries.map((person) => (
                  <tr
                    className="border-b border-slate-100 last:border-0"
                    key={person.id}
                  >
                    <td className="max-w-xs px-5 py-4 align-top">
                      <p className="font-bold text-slate-950">
                        {person.displayName}
                      </p>
                      <p className="mt-1 text-sm break-all text-slate-600">
                        {person.email}
                      </p>
                    </td>
                    <td className="px-5 py-4 align-top font-semibold text-blue-900">
                      {person.username ? `@${person.username}` : "—"}
                    </td>
                    <td className="max-w-sm px-5 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        {person.roles.length ? (
                          person.roles.map((role) => (
                            <span
                              className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-900"
                              key={role.assignmentId}
                            >
                              {role.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">
                            No active role
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className={statusClass(person.accountStatus)}>
                        {statusLabel(
                          person.accountStatus,
                          person.temporaryPasswordPending,
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right align-top">
                      <a
                        className="inline-flex rounded-xl border border-blue-800 px-4 py-2 font-bold text-blue-800 transition-transform duration-150 ease-out active:scale-[0.97]"
                        href={staffDirectoryHref(
                          activeFilters,
                          person.id,
                          "staff-management",
                        )}
                      >
                        Manage
                      </a>
                    </td>
                  </tr>
                ))}
                {!workspace.staff.entries.length ? (
                  <tr>
                    <td
                      className="px-5 py-12 text-center text-slate-600"
                      colSpan={5}
                    >
                      No staff accounts match these filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            On a smaller screen, swipe the table sideways to see every column.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-semibold text-slate-600">
              {workspace.staff.total
                ? `Showing ${resultStart}–${resultEnd} of ${workspace.staff.total}`
                : "Showing 0 accounts"}
            </p>
            <nav aria-label="Staff account pages" className="flex gap-2">
              {hasPreviousPage ? (
                <a
                  className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-800 transition-colors hover:bg-white"
                  href={staffDirectoryHref({
                    ...activeFilters,
                    page: activeFilters.page - 1,
                  })}
                >
                  Previous
                </a>
              ) : (
                <span className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-400">
                  Previous
                </span>
              )}
              <span className="rounded-xl bg-white px-4 py-2 font-bold text-slate-800 shadow-sm">
                Page {activeFilters.page} of {totalPages}
              </span>
              {hasNextPage ? (
                <a
                  className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-800 transition-colors hover:bg-white"
                  href={staffDirectoryHref({
                    ...activeFilters,
                    page: activeFilters.page + 1,
                  })}
                >
                  Next
                </a>
              ) : (
                <span className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-400">
                  Next
                </span>
              )}
            </nav>
          </div>
        </section>

        {selectedStaff ? (
          <StaffAccountManagementPanel
            canManageCredentials={canManageCredentials}
            canManageRoles={canManageRoles}
            canSuspendStaff={canSuspendStaff}
            person={selectedStaff}
            returnHref={`${baseHref}#staff-directory`}
          />
        ) : null}
      </main>
    </div>
  );
}

const filterInputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100";

function readDirectoryFilters(
  parameters: SearchParameters,
): PasswordStaffDirectoryFilters {
  const status = valueFor(parameters, "status");
  const role = valueFor(parameters, "role");
  const page = Number.parseInt(valueFor(parameters, "page"), 10);
  return {
    search: valueFor(parameters, "search").trim().slice(0, 100),
    accountStatus: isAccountStatus(status) ? status : "all",
    roleCode: isRoleCode(role) ? role : "all",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    pageSize,
  };
}

function valueFor(parameters: SearchParameters, key: string) {
  const value = parameters[key];
  return typeof value === "string" ? value : "";
}

function isAccountStatus(value: string): value is StaffAccountStatus {
  return ["invited", "active", "suspended", "disabled"].includes(value);
}

function isRoleCode(value: string): value is RoleCode {
  return roleOptions.some(([code]) => code === value);
}

function staffDirectoryHref(
  filters: PasswordStaffDirectoryFilters,
  selectedStaffId?: string,
  anchor?: string,
) {
  const parameters = new URLSearchParams();
  if (filters.search) parameters.set("search", filters.search);
  if (filters.accountStatus !== "all") {
    parameters.set("status", filters.accountStatus);
  }
  if (filters.roleCode !== "all") parameters.set("role", filters.roleCode);
  if (filters.page > 1) parameters.set("page", String(filters.page));
  if (selectedStaffId) parameters.set("selected", selectedStaffId);
  const query = parameters.size ? `?${parameters.toString()}` : "";
  return `/admin/staff${query}${anchor ? `#${anchor}` : ""}`;
}

function statusLabel(
  status: StaffAccountStatus,
  temporaryPasswordPending: boolean,
) {
  if (status === "disabled" && temporaryPasswordPending) {
    return "Temporary password expired";
  }
  if (temporaryPasswordPending) return "Password change due";
  return status;
}

function statusClass(status: StaffAccountStatus) {
  if (status === "active") {
    return "rounded-full bg-green-50 px-3 py-1 text-sm font-bold text-green-800";
  }
  if (status === "suspended" || status === "disabled") {
    return "rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-800";
  }
  return "rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-900";
}
