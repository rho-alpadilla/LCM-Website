"use server";

import type { Route } from "next";
import { headers } from "next/headers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { bootstrapSchema } from "@/shared/auth/schemas";
import { getStaffAuthState } from "@/backend/auth/staff-context";
import {
  parseCloudflareAccessConfiguration,
  verifyCloudflareAccessHeaders,
} from "@/backend/auth/cloudflare-access";
import { requireCloudflareBindings } from "@/backend/cloudflare/bindings";
import { AccessControlRepository } from "@/backend/repositories/staff/access-control-repository";
import { AccessControlService } from "@/backend/services/staff/access-control-service";
import { staffPasswordCookieName } from "@/shared/auth/password-authentication";
import { signOutPasswordSession } from "@/backend/auth/password-authentication";

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
  if (state.kind === "development") redirect("/");
  if (state.kind === "unconfigured") redirect("/");
  if (state.authenticationMethod === "password") {
    const environment = await requireCloudflareBindings();
    await signOutPasswordSession(
      await headers(),
      environment as Parameters<typeof signOutPasswordSession>[1],
    );
    (await cookies()).set({
      name: staffPasswordCookieName(environment),
      value: "",
      httpOnly: true,
      sameSite: "strict",
      secure: environment.APP_ENVIRONMENT !== "local",
      path: "/",
      maxAge: 0,
      priority: "high",
    });
    redirect("/admin/login");
  }
  const environment = await requireCloudflareBindings();
  const { teamDomain } = parseCloudflareAccessConfiguration(environment);
  redirect(`${teamDomain}/cdn-cgi/access/logout` as Route);
}
