import { redirect } from "next/navigation";

import { AuthCard } from "@/components/admin/auth-card";
import { MfaSetup } from "@/components/admin/mfa-setup";
import { bootstrapAdministratorAction } from "@/features/auth/actions";
import { getStaffAuthState } from "@/features/auth/staff-context";

type BootstrapPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BootstrapPage({
  searchParams,
}: BootstrapPageProps) {
  const state = await getStaffAuthState();
  if (state.kind !== "authenticated") redirect("/admin/login");
  if (state.context) redirect("/admin");
  const parameters = await searchParams;

  return (
    <AuthCard
      description="This one-time setup creates the first System Administrator. It closes automatically after the first successful use."
      eyebrow="Initial setup"
      title="Create the first administrator"
    >
      {state.assuranceLevel !== "aal2" ? (
        <MfaSetup afterVerificationPath="/admin/bootstrap" />
      ) : (
        <form action={bootstrapAdministratorAction} className="space-y-5">
          {parameters.error ? (
            <p
              className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800"
              role="alert"
            >
              Setup could not be completed. Confirm no administrator exists and
              retry.
            </p>
          ) : null}
          <div>
            <label className="font-semibold" htmlFor="displayName">
              Your display name
            </label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
              id="displayName"
              maxLength={120}
              minLength={2}
              name="displayName"
              required
            />
          </div>
          <div>
            <label className="font-semibold" htmlFor="reason">
              Setup reason
            </label>
            <textarea
              className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 px-4 py-3"
              id="reason"
              maxLength={500}
              minLength={10}
              name="reason"
              placeholder="Example: Initial administrator approved for website launch"
              required
            />
          </div>
          <button
            className="w-full rounded-xl bg-blue-800 px-5 py-3 font-bold text-white"
            type="submit"
          >
            Complete secure setup
          </button>
        </form>
      )}
    </AuthCard>
  );
}
