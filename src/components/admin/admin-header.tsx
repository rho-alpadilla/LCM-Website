import Link from "next/link";

import { logoutAction } from "@/features/auth/actions";
import type { StaffContext } from "@/features/auth/staff-context";

export function AdminHeader({ context }: { context: StaffContext }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div>
          <Link className="font-black text-slate-950" href="/admin">
            Lifechangers Admin
          </Link>
          <p className="text-sm text-slate-600">
            Signed in as {context.display_name}
          </p>
        </div>
        <nav aria-label="Administration" className="flex items-center gap-4">
          <Link className="font-semibold text-blue-800" href="/admin">
            Dashboard
          </Link>
          {context.permissions.includes("staff.read") ? (
            <Link className="font-semibold text-blue-800" href="/admin/staff">
              Staff
            </Link>
          ) : null}
          <form action={logoutAction}>
            <button
              className="rounded-full border border-slate-300 px-4 py-2 font-semibold text-slate-800"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
