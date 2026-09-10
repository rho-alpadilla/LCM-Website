"use server";

import { redirect } from "next/navigation";

import { requireActiveStaffSession } from "@/features/auth/staff-context";
import {
  invitationSchema,
  roleChangeSchema,
  suspensionSchema,
} from "@/features/staff/schemas";
import { AccessControlRepository } from "@/server/repositories/access-control-repository";
import { AccessControlService } from "@/server/services/access-control-service";

const values = (formData: FormData) => Object.fromEntries(formData.entries());

function serviceFor(database: D1Database) {
  return new AccessControlService(new AccessControlRepository(database));
}

export async function inviteStaffAction(formData: FormData) {
  const parsed = invitationSchema.safeParse(values(formData));
  if (!parsed.success) {
    redirect("/admin/staff?error=invalid_invitation");
  }
  const state = await requireActiveStaffSession("staff.invite");
  const service = serviceFor(state.environment.DB);
  await service.requirePermission(state.identity, "staff.roles.manage");
  try {
    await service.createInvitation({
      actorStaffId: state.context.id,
      ...parsed.data,
    });
  } catch {
    redirect("/admin/staff?error=invitation_failed");
  }
  redirect("/admin/staff?message=invitation_recorded");
}

export async function assignRoleAction(formData: FormData) {
  const parsed = roleChangeSchema.safeParse(values(formData));
  if (!parsed.success) redirect("/admin/staff?error=invalid_role_change");
  const state = await requireActiveStaffSession("staff.roles.manage");
  try {
    await serviceFor(state.environment.DB).assignRole({
      actorStaffId: state.context.id,
      ...parsed.data,
    });
  } catch {
    redirect("/admin/staff?error=role_assignment_failed");
  }
  redirect("/admin/staff?message=role_assigned");
}

export async function revokeRoleAction(formData: FormData) {
  const parsed = roleChangeSchema.safeParse(values(formData));
  if (!parsed.success || parsed.data.reason.length < 10) {
    redirect("/admin/staff?error=invalid_role_change");
  }
  const state = await requireActiveStaffSession("staff.roles.manage");
  try {
    await serviceFor(state.environment.DB).revokeRole({
      actorStaffId: state.context.id,
      ...parsed.data,
    });
  } catch {
    redirect("/admin/staff?error=role_revocation_failed");
  }
  redirect("/admin/staff?message=role_revoked");
}

export async function suspendStaffAction(formData: FormData) {
  const parsed = suspensionSchema.safeParse(values(formData));
  if (!parsed.success) redirect("/admin/staff?error=invalid_suspension");
  const state = await requireActiveStaffSession("staff.suspend");
  try {
    await serviceFor(state.environment.DB).suspendStaff({
      actorStaffId: state.context.id,
      ...parsed.data,
    });
  } catch {
    redirect("/admin/staff?error=suspension_failed");
  }
  redirect("/admin/staff?message=account_suspended");
}
