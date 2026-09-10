"use server";

import { redirect } from "next/navigation";

import { requireActiveStaffSession } from "@/features/auth/staff-context";
import {
  invitationSchema,
  roleChangeSchema,
  suspensionSchema,
} from "@/features/staff/schemas";
import { requireServerEnvironment } from "@/lib/config/env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const values = (formData: FormData) => Object.fromEntries(formData.entries());

function requirePermission(permissions: string[], permission: string) {
  if (!permissions.includes(permission)) {
    redirect("/admin/access-denied");
  }
}

export async function inviteStaffAction(formData: FormData) {
  const parsed = invitationSchema.safeParse(values(formData));
  if (!parsed.success || parsed.data.roleCode === "core_leader") {
    redirect("/admin/staff?error=invalid_invitation");
  }

  const state = await requireActiveStaffSession();
  requirePermission(state.context.permissions, "staff.invite");
  requirePermission(state.context.permissions, "staff.roles.manage");

  const environment = requireServerEnvironment();
  const admin = createAdminSupabaseClient();
  const { data, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      redirectTo: `${environment.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/admin/set-password`,
      data: { display_name: parsed.data.displayName },
    },
  );

  if (inviteError || !data.user) {
    redirect("/admin/staff?error=invite_failed");
  }

  const { error: registrationError } = await admin.rpc(
    "register_invited_staff",
    {
      requested_staff_id: data.user.id,
      requested_display_name: parsed.data.displayName,
      requested_phone: parsed.data.phone,
      requested_job_title: parsed.data.jobTitle,
      requested_role_code: parsed.data.roleCode,
      requested_assigned_by: state.context.id,
      requested_reason: parsed.data.reason,
    },
  );

  if (registrationError) {
    const { error: cleanupError } = await admin.auth.admin.deleteUser(
      data.user.id,
    );
    redirect(
      cleanupError
        ? "/admin/staff?error=registration_cleanup_failed"
        : "/admin/staff?error=registration_failed",
    );
  }

  redirect("/admin/staff?message=invitation_sent");
}

export async function assignRoleAction(formData: FormData) {
  const parsed = roleChangeSchema.safeParse(values(formData));
  if (!parsed.success) redirect("/admin/staff?error=invalid_role_change");

  const state = await requireActiveStaffSession();
  requirePermission(state.context.permissions, "staff.roles.manage");

  const { error } = await state.supabase.rpc("assign_staff_role", {
    requested_staff_id: parsed.data.staffId,
    requested_role_code: parsed.data.roleCode,
    requested_reason: parsed.data.reason,
  });
  if (error) redirect("/admin/staff?error=role_assignment_failed");

  redirect("/admin/staff?message=role_assigned");
}

export async function revokeRoleAction(formData: FormData) {
  const parsed = roleChangeSchema.safeParse(values(formData));
  if (!parsed.success || parsed.data.reason.length < 10) {
    redirect("/admin/staff?error=invalid_role_change");
  }

  const state = await requireActiveStaffSession();
  requirePermission(state.context.permissions, "staff.roles.manage");

  const { error } = await state.supabase.rpc("revoke_staff_role", {
    requested_staff_id: parsed.data.staffId,
    requested_role_code: parsed.data.roleCode,
    requested_reason: parsed.data.reason,
  });
  if (error) redirect("/admin/staff?error=role_revocation_failed");

  redirect("/admin/staff?message=role_revoked");
}

export async function suspendStaffAction(formData: FormData) {
  const parsed = suspensionSchema.safeParse(values(formData));
  if (!parsed.success) redirect("/admin/staff?error=invalid_suspension");

  const state = await requireActiveStaffSession();
  requirePermission(state.context.permissions, "staff.suspend");

  const { error } = await state.supabase.rpc("suspend_staff_account", {
    requested_staff_id: parsed.data.staffId,
    requested_reason: parsed.data.reason,
  });
  if (error) redirect("/admin/staff?error=suspension_failed");

  const admin = createAdminSupabaseClient();
  const { error: banError } = await admin.auth.admin.updateUserById(
    parsed.data.staffId,
    {
      ban_duration: "876000h",
    },
  );

  if (banError) {
    redirect("/admin/staff?error=suspended_but_auth_ban_failed");
  }

  redirect("/admin/staff?message=account_suspended");
}
