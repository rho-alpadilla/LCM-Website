"use server";

import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { bootstrapSchema } from "@/shared/auth/schemas";
import { getStaffAuthState } from "@/backend/auth/staff-context";
import {
  parseCloudflareAccessConfiguration,
  verifyCloudflareAccessHeaders,
} from "@/backend/auth/cloudflare-access";
import { requireCloudflareBindings } from "@/backend/cloudflare/bindings";
import { AccessControlRepository } from "@/backend/repositories/access-control-repository";
import { AccessControlService } from "@/backend/services/access-control-service";

const values = (formData: FormData) => Object.fromEntries(formData.entries());

export async function loginAction() {
  redirect("/admin/login?error=access_only");
}

export async function setPasswordAction() {
  redirect("/admin");
}

export async function bootstrapAdministratorAction(formData: FormData) {
  const parsed = bootstrapSchema.safeParse(values(formData));
  if (!parsed.success) redirect("/admin/bootstrap?error=invalid_input");

  try {
    const environment = await requireCloudflareBindings();
    const identity = await verifyCloudflareAccessHeaders(
      await headers(),
      environment,
    );
    const service = new AccessControlService(
      new AccessControlRepository(environment.DB),
    );
    await service.bootstrapFirstSystemAdministrator({
      ...identity,
      ...parsed.data,
    });
  } catch {
    redirect("/admin/bootstrap?error=bootstrap_failed");
  }
  redirect("/admin?message=bootstrap_complete");
}

export async function activateInvitedStaffAction() {
  try {
    const environment = await requireCloudflareBindings();
    const identity = await verifyCloudflareAccessHeaders(
      await headers(),
      environment,
    );
    const service = new AccessControlService(
      new AccessControlRepository(environment.DB),
    );
    await service.activatePendingInvitation(identity);
  } catch {
    redirect("/admin/activate?error=activation_failed" as Route);
  }
  redirect("/admin?message=account_activated");
}

export async function logoutAction() {
  const state = await getStaffAuthState();
  if (state.kind === "unconfigured") redirect("/");
  const environment = await requireCloudflareBindings();
  const { teamDomain } = parseCloudflareAccessConfiguration(environment);
  redirect(`${teamDomain}/cdn-cgi/access/logout` as Route);
}
