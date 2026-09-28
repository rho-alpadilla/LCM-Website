import Link from "next/link";
import { redirect } from "next/navigation";

import { FirstPasswordForm } from "@/frontend/components/admin/first-password-form";
import { AuthCard } from "@/frontend/components/admin/auth-card";
import { getStaffAuthState } from "@/backend/auth/staff-context";

export default async function FirstPasswordPage() {
  const state = await getStaffAuthState();
  if (
    !("authenticationMethod" in state) ||
    state.authenticationMethod !== "password"
  ) {
    redirect("/admin/login");
  }
  return (
    <AuthCard
      eyebrow="Staff access"
      title="Set your password"
      description="Use the temporary password given privately by a System Administrator to choose your personal password. You can also sign in first and change it from My account within three days."
    >
      <FirstPasswordForm />
      <Link
        className="mt-6 inline-block font-semibold text-blue-800"
        href="/admin/login"
      >
        Return to sign in
      </Link>
    </AuthCard>
  );
}
