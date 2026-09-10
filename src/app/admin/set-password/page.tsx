import { redirect } from "next/navigation";

import { AuthCard } from "@/components/admin/auth-card";
import { setPasswordAction } from "@/features/auth/actions";
import { getStaffAuthState } from "@/features/auth/staff-context";

type PasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SetPasswordPage({
  searchParams,
}: PasswordPageProps) {
  const state = await getStaffAuthState();
  if (state.kind !== "authenticated") redirect("/admin/login");
  if (!state.context) redirect("/admin/bootstrap");
  if (state.context.account_status !== "invited") redirect("/admin");
  const parameters = await searchParams;

  return (
    <AuthCard
      description="Choose a private password before setting up your second security step."
      eyebrow="Invitation accepted"
      title="Create your password"
    >
      {parameters.error ? (
        <p
          className="mb-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800"
          role="alert"
        >
          Use at least 12 characters with uppercase, lowercase, and a number.
          Both entries must match.
        </p>
      ) : null}
      <form action={setPasswordAction} className="space-y-5">
        <div>
          <label className="font-semibold" htmlFor="password">
            New password
          </label>
          <input
            autoComplete="new-password"
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
            id="password"
            maxLength={128}
            minLength={12}
            name="password"
            required
            type="password"
          />
        </div>
        <div>
          <label className="font-semibold" htmlFor="confirmPassword">
            Confirm password
          </label>
          <input
            autoComplete="new-password"
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
            id="confirmPassword"
            maxLength={128}
            name="confirmPassword"
            required
            type="password"
          />
        </div>
        <button
          className="w-full rounded-xl bg-blue-800 px-5 py-3 font-bold text-white"
          type="submit"
        >
          Save password
        </button>
      </form>
    </AuthCard>
  );
}
