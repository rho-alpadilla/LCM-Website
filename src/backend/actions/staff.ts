"use server";

import { redirect } from "next/navigation";

import { requireActiveStaffSession } from "@/backend/auth/staff-context";
import {
  invitationCancellationSchema,
  invitationProvisioningRetrySchema,
  invitationSchema,
  roleChangeSchema,
  suspensionSchema,
} from "@/shared/staff/schemas";
import { createStaffAccessDirectory } from "@/backend/integrations/cloudflare/staff-access-directory";
import { AccessControlRepository } from "@/backend/repositories/staff/access-control-repository";
import { NotificationRepository } from "@/backend/repositories/admin/notification-repository";
import { NotificationService } from "@/backend/services/admin/notification-service";
import { AccessControlService } from "@/backend/services/staff/access-control-service";
import {
  getStaffInvitationCancellationFailureCode,
  getStaffInvitationFailureCode,
  logStaffInvitationCancellationFailure,
  logStaffInvitationFailure,
} from "./staff-invitation-feedback";

const values = (formData: FormData) => Object.fromEntries(formData.entries());

function serviceFor(database: D1Database) {
  return new AccessControlService(new AccessControlRepository(database));
}

async function notifyStaffProvisioning(
  database: D1Database,
  recipientStaffId: string,
  status: "ready" | "needs_attention",
) {
  try {
    await new NotificationService(new NotificationRepository(database)).notify({
      recipientStaffId,
      category: "staff",
      title:
        status === "ready"
          ? "Staff sign-in is ready"
          : "Staff sign-in needs attention",
      body:
        status === "ready"
          ? "The staff member can now use the admin link and their email code."
          : "The staff record is saved. Review its setup status and retry securely from Staff & access.",
      href: "/admin/staff",
    });
  } catch {
    // Notifications are a convenience layer. A provisioning result and its
    // security audit are already committed before this best-effort alert.
    console.error("Failed to create a staff provisioning notification.");
  }
}

export async function inviteStaffAction(formData: FormData) {
  const parsed = invitationSchema.safeParse(values(formData));
  if (!parsed.success) {
    redirect("/admin/staff?error=invalid_invitation");
  }
  const state = await requireActiveStaffSession("staff.invite");
  const service = serviceFor(state.environment.DB);
  await service.requirePermission(state.identity, "staff.roles.manage");
  let invitationId: string;
  try {
    ({ invitationId } = await service.createInvitation({
      actorStaffId: state.context.id,
      ...parsed.data,
    }));
  } catch (error) {
    logStaffInvitationFailure(error);
    redirect(`/admin/staff?error=${getStaffInvitationFailureCode(error)}`);
  }

  try {
    await createStaffAccessDirectory(state.environment).allowEmail(
      parsed.data.email,
    );
    await service.recordInvitationProvisioning({
      actorStaffId: state.context.id,
      invitationId,
      status: "ready",
      failureCode: null,
    });
    await notifyStaffProvisioning(
      state.environment.DB,
      state.context.id,
      "ready",
    );
  } catch (error) {
    try {
      await service.recordInvitationProvisioning({
        actorStaffId: state.context.id,
        invitationId,
        status: "needs_attention",
        failureCode: getStaffInvitationFailureCode(error),
      });
    } catch {
      // The invitation remains in its safe setting_up state and can be retried
      // from Staff after a transient D1 issue clears.
      console.error("Failed to record staff Access provisioning status.");
    }
    await notifyStaffProvisioning(
      state.environment.DB,
      state.context.id,
      "needs_attention",
    );
    logStaffInvitationFailure(error);
    redirect("/admin/staff?message=account_created_needs_setup");
  }
  redirect("/admin/staff?message=account_created");
}

export async function retryStaffInvitationAccessAction(formData: FormData) {
  const parsed = invitationProvisioningRetrySchema.safeParse(values(formData));
  if (!parsed.success) redirect("/admin/staff?error=invalid_invitation_retry");

  const state = await requireActiveStaffSession("staff.invite");
  const service = serviceFor(state.environment.DB);
  await service.requirePermission(state.identity, "staff.roles.manage");
  const invitation = await new AccessControlRepository(
    state.environment.DB,
  ).findPendingInvitationById(parsed.data.invitationId);
  if (!invitation) redirect("/admin/staff?error=invitation_not_pending");

  try {
    await createStaffAccessDirectory(state.environment).allowEmail(
      invitation.email,
    );
    await service.recordInvitationProvisioning({
      actorStaffId: state.context.id,
      invitationId: invitation.id,
      status: "ready",
      failureCode: null,
    });
    await notifyStaffProvisioning(
      state.environment.DB,
      state.context.id,
      "ready",
    );
  } catch (error) {
    try {
      await service.recordInvitationProvisioning({
        actorStaffId: state.context.id,
        invitationId: invitation.id,
        status: "needs_attention",
        failureCode: getStaffInvitationFailureCode(error),
      });
    } catch {
      console.error("Failed to record staff Access retry status.");
    }
    await notifyStaffProvisioning(
      state.environment.DB,
      state.context.id,
      "needs_attention",
    );
    logStaffInvitationFailure(error);
    redirect("/admin/staff?message=staff_access_needs_attention");
  }
  redirect("/admin/staff?message=staff_access_ready");
}

export async function cancelStaffInvitationAction(formData: FormData) {
  const parsed = invitationCancellationSchema.safeParse(values(formData));
  if (!parsed.success) {
    redirect("/admin/staff?error=invalid_invitation_cancellation");
  }

  const state = await requireActiveStaffSession("staff.invite");
  const service = serviceFor(state.environment.DB);
  await service.requirePermission(state.identity, "staff.roles.manage");
  try {
    await service.cancelInvitation(
      {
        actorStaffId: state.context.id,
        ...parsed.data,
      },
      createStaffAccessDirectory(state.environment),
    );
  } catch (error) {
    logStaffInvitationCancellationFailure(error);
    redirect(
      `/admin/staff?error=${getStaffInvitationCancellationFailureCode(error)}`,
    );
  }
  redirect("/admin/staff?message=invitation_cancelled");
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
