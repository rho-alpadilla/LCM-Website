import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/frontend/components/admin/auth-card";
import { PasswordLoginForm } from "@/frontend/components/admin/password-login-form";
import { getStaffAuthState } from "@/backend/auth/staff-context";

export default async function LoginPage() {
  const state = await getStaffAuthState();
  if (state.kind === "verified" || state.kind === "development") {
    if (state.context?.accountStatus === "active") redirect("/admin");
    if (state.context) redirect("/admin/access-denied");
    if (state.bootstrapAvailable) redirect("/admin/bootstrap");
    if (state.pendingInvitation) redirect("/admin/activate" as Route);
    redirect("/admin/access-denied");
  }
  if (state.kind === "denied") redirect("/admin/access-denied");

  if (
    "authenticationMethod" in state &&
    state.authenticationMethod === "password"
  ) {
    return (
      <AuthCard
        description="Use the username and password issued by your System Administrator. The public website never requires an account."
        eyebrow="Staff access"
        title="Sign in"
      >
        <PasswordLoginForm />
        <Link
          className="mt-6 inline-block font-semibold text-blue-800"
          href="/"
        >
          Return to the public website
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      description="Staff authentication is handled by Cloudflare Access. The public website never requires an account."
      eyebrow="Staff access"
      title="Secure sign-in"
    >
      {state.kind === "unconfigured" ? (
        <p
          className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
          role="status"
        >
          Configuration notice: Cloudflare Access is not configured for this
          environment. The public website remains open, and no password fallback
          is enabled.
        </p>
      ) : (
        <p
          className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800"
          role="alert"
        >
          A valid Cloudflare Access session is required. Please open the
          protected admin address again and complete Access sign-in.
        </p>
      )}
      <Link className="mt-6 inline-block font-semibold text-blue-800" href="/">
        Return to the public website
      </Link>
    </AuthCard>
  );
}
