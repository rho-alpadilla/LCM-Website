import { redirect } from "next/navigation";

import { AuthCard } from "@/components/admin/auth-card";
import { activateInvitedStaffAction } from "@/features/auth/actions";
import { getStaffAuthState } from "@/features/auth/staff-context";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ActivatePage({ searchParams }: Props) {
  const state = await getStaffAuthState();
  if (state.kind === "unconfigured" || state.kind === "anonymous")
    redirect("/admin/login");
  if (state.kind === "denied") redirect("/admin/access-denied");
  if (state.context) redirect("/admin");
  if (!state.pendingInvitation) redirect("/admin/access-denied");
  const parameters = await searchParams;

  return (
    <AuthCard
      description={`Your verified email, ${state.identity.email}, matches a pending staff invitation.`}
      eyebrow="Staff invitation"
      title="Activate your account"
    >
      {parameters.error ? (
        <p
          className="mb-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800"
          role="alert"
        >
          Activation could not be completed. Ask a System Administrator to check
          the invitation.
        </p>
      ) : null}
      <dl className="mb-6 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
        <div>
          <dt className="font-bold">Name</dt>
          <dd>{state.pendingInvitation.displayName}</dd>
        </div>
        <div>
          <dt className="font-bold">Initial role</dt>
          <dd>{state.pendingInvitation.initialRoleName}</dd>
        </div>
      </dl>
      <form action={activateInvitedStaffAction}>
        <button
          className="w-full rounded-xl bg-blue-800 px-5 py-3 font-bold text-white"
          type="submit"
        >
          Activate staff account
        </button>
      </form>
    </AuthCard>
  );
}
