import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/frontend/components/admin/auth-card";
import { getStaffAuthState } from "@/backend/auth/staff-context";

export default async function LoginPage() {
  const state = await getStaffAuthState();
  if (state.kind === "verified") {
    if (state.context?.accountStatus === "active") redirect("/admin");
    if (state.context) redirect("/admin/access-denied");
    if (state.bootstrapAvailable) redirect("/admin/bootstrap");
    if (state.pendingInvitation) redirect("/admin/activate" as Route);
    redirect("/admin/access-denied");
  }
  if (state.kind === "denied") redirect("/admin/access-denied");

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
          Development notice: Cloudflare Access is intentionally not active
          until the church domain and Access application are configured. No
          password fallback is enabled.
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
