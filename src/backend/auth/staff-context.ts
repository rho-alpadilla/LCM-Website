import "server-only";

import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ApplicationError } from "@/shared/errors/application-error";
import { verifyCloudflareAccessHeaders } from "@/backend/auth/cloudflare-access";
import { requireCloudflareBindings } from "@/backend/cloudflare/bindings";
import {
  AccessControlRepository,
  type StaffContext,
} from "@/backend/repositories/access-control-repository";
import { localDevelopmentAdministrator } from "@/backend/development/local-administrator";

export type { StaffContext };

export async function getStaffAuthState() {
  const environment = await requireCloudflareBindings();
  const requestHeaders = await headers();
  const development = await localDevelopmentAdministrator(
    requestHeaders,
    environment,
  );
  if (development) {
    return {
      kind: "development" as const,
      environment,
      identity: development.identity,
      context: development.context,
      bootstrapAvailable: false,
      pendingInvitation: null,
    };
  }
  if (
    !environment.ACCESS_TEAM_DOMAIN.trim() ||
    !environment.ACCESS_AUD.trim()
  ) {
    return { kind: "unconfigured" as const };
  }

  let identity;
  try {
    identity = await verifyCloudflareAccessHeaders(requestHeaders, environment);
  } catch (error) {
    if (
      error instanceof ApplicationError &&
      error.code === "AUTHENTICATION_REQUIRED"
    ) {
      return { kind: "anonymous" as const };
    }
    throw error;
  }

  const repository = new AccessControlRepository(environment.DB);
  const context = await repository.findStaffContextByAccessSubject(
    identity.accessSubject,
  );
  if (context && context.email.toLowerCase() !== identity.email) {
    return { kind: "denied" as const, identity };
  }

  return {
    kind: "verified" as const,
    environment,
    identity,
    context,
    bootstrapAvailable: await repository.isBootstrapAvailable(),
    pendingInvitation: await repository.findPendingInvitationByEmail(
      identity.email,
    ),
  };
}

export async function requireActiveStaffSession(
  requiredPermission = "admin.access",
) {
  const state = await getStaffAuthState();
  if (state.kind === "development") {
    if (!state.context.permissions.includes(requiredPermission)) {
      redirect("/admin/access-denied");
    }
    return state;
  }
  if (state.kind === "unconfigured")
    redirect("/admin/login?error=configuration");
  if (state.kind === "anonymous") redirect("/admin/login");
  if (state.kind === "denied") redirect("/admin/access-denied");
  if (!state.context) {
    if (state.bootstrapAvailable) redirect("/admin/bootstrap");
    if (state.pendingInvitation) redirect("/admin/activate" as Route);
    redirect("/admin/access-denied");
  }

  if (
    state.context.accountStatus !== "active" ||
    !state.context.permissions.includes(requiredPermission)
  ) {
    redirect("/admin/access-denied");
  }
  return { ...state, context: state.context };
}
