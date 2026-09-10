import { redirect } from "next/navigation";

import { AuthCard } from "@/components/admin/auth-card";
import { MfaSetup } from "@/components/admin/mfa-setup";
import { activateInvitedStaffAction } from "@/features/auth/actions";
import { getStaffAuthState } from "@/features/auth/staff-context";

type MfaPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MfaPage({ searchParams }: MfaPageProps) {
  const state = await getStaffAuthState();
  if (state.kind !== "authenticated") redirect("/admin/login");
  if (!state.context) redirect("/admin/bootstrap");
  if (
    state.context.account_status === "suspended" ||
    state.context.account_status === "disabled"
  ) {
    redirect("/admin/access-denied");
  }
  if (
    state.assuranceLevel === "aal2" &&
    state.context.account_status === "active"
  ) {
    redirect("/admin");
  }

  const parameters = await searchParams;
  const needsActivation = state.context.account_status === "invited";

  return (
    <AuthCard
      description="Use an authenticator app for the second security step. This protects church records even if a password is exposed."
      eyebrow="Account security"
      title="Two-step verification"
    >
      {parameters.error ? (
        <p
          className="mb-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800"
          role="alert"
        >
          Account activation could not be completed. Please retry or contact the
          System Administrator.
        </p>
      ) : null}
      {state.assuranceLevel === "aal2" && needsActivation ? (
        <form action={activateInvitedStaffAction}>
          <button
            className="w-full rounded-xl bg-blue-800 px-5 py-3 font-bold text-white"
            type="submit"
          >
            Activate my staff account
          </button>
        </form>
      ) : (
        <MfaSetup
          activateInvitation={needsActivation}
          afterVerificationPath={needsActivation ? "/admin" : "/admin"}
        />
      )}
    </AuthCard>
  );
}
