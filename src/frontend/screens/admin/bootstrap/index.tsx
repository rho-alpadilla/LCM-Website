import { redirect } from "next/navigation";

import { AuthCard } from "@/frontend/components/admin/auth-card";
import { bootstrapAdministratorAction } from "@/backend/actions/auth";
import { getStaffAuthState } from "@/backend/auth/staff-context";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BootstrapPage({ searchParams }: Props) {
  const state = await getStaffAuthState();
  if (state.kind === "unconfigured" || state.kind === "anonymous")
    redirect("/admin/login");
  if (state.kind === "denied") redirect("/admin/access-denied");
  if (state.context) redirect("/admin");
  if (!state.bootstrapAvailable) redirect("/admin/access-denied");
  const parameters = await searchParams;

  return (
    <AuthCard
      description="This one-time setup binds your verified Cloudflare Access identity to the first System Administrator account."
      eyebrow="Initial setup"
      title="Create the first administrator"
    >
      <form action={bootstrapAdministratorAction} className="space-y-5">
        {parameters.error ? (
          <p
            className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800"
            role="alert"
          >
            Setup could not be completed. Confirm that no administrator exists,
            then retry.
          </p>
        ) : null}
        <label className="block font-semibold">
          Your display name
          <input
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
            maxLength={120}
            minLength={2}
            name="displayName"
            required
          />
        </label>
        <label className="block font-semibold">
          Setup reason
          <textarea
            className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 px-4 py-3"
            maxLength={500}
            minLength={10}
            name="reason"
            required
          />
        </label>
        <button
          className="w-full rounded-xl bg-blue-800 px-5 py-3 font-bold text-white"
          type="submit"
        >
          Complete secure setup
        </button>
      </form>
    </AuthCard>
  );
}
