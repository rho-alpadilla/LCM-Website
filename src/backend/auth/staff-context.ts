import "server-only";

import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ApplicationError } from "@/shared/errors/application-error";
import { verifyCloudflareAccessHeaders } from "@/backend/auth/cloudflare-access";
import { requireCloudflareBindings } from "@/backend/cloudflare/bindings";
import {
  staffAuthenticationMode,
  type StaffPasswordCloudflareBindings,
} from "@/backend/cloudflare/bindings";
import {
  AccessControlRepository,
  type StaffContext,
} from "@/backend/repositories/staff/access-control-repository";
import { AccessControlService } from "@/backend/services/staff/access-control-service";
import { localDevelopmentAdministrator } from "@/backend/development/local-administrator";
import { findPasswordStaffContext } from "@/backend/auth/password-authentication";

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
  const passwordEnvironment = environment as StaffPasswordCloudflareBindings;
  if (staffAuthenticationMode(passwordEnvironment) === "password") {
    if (
      !passwordEnvironment.STAFF_AUTHENTICATION ||
      !passwordEnvironment.STAFF_AUTH_RATE_LIMIT_SECRET
    ) {
      return { kind: "unconfigured" as const };
    }
    const authenticatedStaff = await findPasswordStaffContext(
      requestHeaders,
      passwordEnvironment,
    );
    const context = authenticatedStaff?.context ?? null;
    return {
      kind: context ? ("verified" as const) : ("anonymous" as const),
      environment,
      identity: null,
      context,
      bootstrapAvailable: false,
      pendingInvitation: null,
      authenticationMethod: "password" as const,
      temporaryPasswordExpiresAt:
        authenticatedStaff?.temporaryPasswordExpiresAt ?? null,
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
      return {
        kind: "anonymous" as const,
        authenticationMethod: "access" as const,
      };
    }
    throw error;
  }

  const repository = new AccessControlRepository(environment.DB);
  let context = await repository.findStaffContextByAccessSubject(
    identity.accessSubject,
  );
  if (context && context.email.toLowerCase() !== identity.email) {
    return {
      kind: "denied" as const,
      identity,
      authenticationMethod: "access" as const,
    };
  }

  let pendingInvitation = await repository.findPendingInvitationByEmail(
    identity.email,
  );
  if (!context && pendingInvitation?.accessProvisioningStatus === "ready") {
    try {
      await new AccessControlService(repository).activatePendingInvitation(
        identity,
      );
    } catch (error) {
      context = await repository.findStaffContextByAccessSubject(
        identity.accessSubject,
      );
      if (!context) throw error;
    }
    context = await repository.findStaffContextByAccessSubject(
      identity.accessSubject,
    );
    pendingInvitation = null;
  }

  return {
    kind: "verified" as const,
    environment,
    identity,
    context,
    bootstrapAvailable: await repository.isBootstrapAvailable(),
    pendingInvitation,
    authenticationMethod: "access" as const,
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
    if (state.pendingInvitation?.accessProvisioningStatus === "ready") {
      redirect("/admin/activate" as Route);
    }
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
