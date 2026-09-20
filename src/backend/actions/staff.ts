"use server";

import { redirect } from "next/navigation";

import { requireActiveStaffSession } from "@/backend/auth/staff-context";
import {
  invitationSchema,
  roleChangeSchema,
  suspensionSchema,
} from "@/shared/staff/schemas";
import {
  createStaffAccessDirectory,
  type StaffAccessDirectory,
} from "@/backend/integrations/cloudflare/staff-access-directory";
import { AccessControlRepository } from "@/backend/repositories/staff/access-control-repository";
import { AccessControlService } from "@/backend/services/staff/access-control-service";
import {
  getStaffInvitationFailureCode,
  logStaffInvitationFailure,
} from "./staff-invitation-feedback";

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
  let directory: StaffAccessDirectory | null = null;
  let accessWasAdded = false;
  try {
    await service.validateStaffAccountCreation({
      actorStaffId: state.context.id,
      ...parsed.data,
    });
    directory = createStaffAccessDirectory(state.environment);
    ({ added: accessWasAdded } = await directory.allowEmail(parsed.data.email));
    await service.createInvitation({
      actorStaffId: state.context.id,
      ...parsed.data,
    });
  } catch (error) {
    if (accessWasAdded && directory) {
      try {
        await directory.removeEmail(parsed.data.email);
      } catch {
        // D1 never activates without a matching record, so this remains safe.
        console.error("Failed to undo a Cloudflare Access staff email change.");
      }
    }
    logStaffInvitationFailure(error);
    redirect(`/admin/staff?error=${getStaffInvitationFailureCode(error)}`);
  }
  redirect("/admin/staff?message=account_created");
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
    const repository = new AccessControlRepository(state.environment.DB);
    const person = await repository.findStaffById(parsed.data.staffId);
    if (!person) redirect("/admin/staff?error=suspension_failed");

    await new AccessControlService(repository).suspendStaff({
      actorStaffId: state.context.id,
      ...parsed.data,
    });
    try {
      await createStaffAccessDirectory(state.environment).removeEmail(
        person.email,
      );
    } catch {
      // A suspended D1 profile is denied by the website even if provider cleanup
      // needs a later retry. Do not falsely report the suspension as failed.
      console.error(
        "Failed to remove a suspended staff email from Cloudflare Access.",
      );
    }
  } catch {
    redirect("/admin/staff?error=suspension_failed");
  }
  redirect("/admin/staff?message=account_suspended");
}
