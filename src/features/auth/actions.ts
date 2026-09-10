"use server";

import { redirect } from "next/navigation";

import {
  bootstrapSchema,
  loginSchema,
  passwordSetupSchema,
} from "@/features/auth/schemas";
import { getStaffAuthState } from "@/features/auth/staff-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const values = (formData: FormData) => Object.fromEntries(formData.entries());

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse(values(formData));
  if (!parsed.success) redirect("/admin/login?error=invalid_input");

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect("/admin/login?error=invalid_credentials");

  const state = await getStaffAuthState();
  if (state.kind !== "authenticated") {
    redirect("/admin/login?error=session");
  }
  if (!state.context) redirect("/admin/bootstrap");
  if (state.context.account_status === "invited") {
    redirect("/admin/set-password");
  }
  if (state.context.account_status !== "active") {
    await state.supabase.auth.signOut();
    redirect("/admin/login?error=account_disabled");
  }
  if (state.assuranceLevel !== "aal2" || state.context.must_enroll_mfa) {
    redirect("/admin/mfa");
  }

  redirect("/admin");
}

export async function logoutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/admin/login?message=signed_out");
}

export async function setPasswordAction(formData: FormData) {
  const parsed = passwordSetupSchema.safeParse(values(formData));
  if (!parsed.success) {
    redirect("/admin/set-password?error=password_requirements");
  }

  const state = await getStaffAuthState();
  if (state.kind !== "authenticated") redirect("/admin/login");

  const { error } = await state.supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) redirect("/admin/set-password?error=update_failed");

  redirect("/admin/mfa");
}

export async function bootstrapAdministratorAction(formData: FormData) {
  const parsed = bootstrapSchema.safeParse(values(formData));
  if (!parsed.success) redirect("/admin/bootstrap?error=invalid_input");

  const state = await getStaffAuthState();
  if (state.kind !== "authenticated") redirect("/admin/login");
  if (state.context) redirect("/admin");
  if (state.assuranceLevel !== "aal2") redirect("/admin/mfa");

  const { error } = await state.supabase.rpc(
    "bootstrap_first_system_administrator",
    {
      requested_display_name: parsed.data.displayName,
      requested_reason: parsed.data.reason,
    },
  );
  if (error) redirect("/admin/bootstrap?error=bootstrap_failed");

  redirect("/admin?message=bootstrap_complete");
}

export async function activateInvitedStaffAction() {
  const state = await getStaffAuthState();
  if (state.kind !== "authenticated") redirect("/admin/login");
  if (state.assuranceLevel !== "aal2") redirect("/admin/mfa");

  const { error } = await state.supabase.rpc("activate_invited_staff_account");
  if (error) redirect("/admin/mfa?error=activation_failed");

  redirect("/admin?message=account_activated");
}
