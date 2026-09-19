import "server-only";

import { AccessControlRepository } from "@/backend/repositories/staff/access-control-repository";
import {
  localDevelopmentConfiguration,
  type LocalDevelopmentBindings,
} from "@/backend/development/local-mode";
import { ApplicationError } from "@/shared/errors/application-error";

const localAdministrator = {
  id: "11111111-1111-4111-8111-111111111111",
  roleAssignmentId: "21111111-1111-4111-8111-111111111111",
  accessSubject: "local-development:system-admin",
  email: "local-development-admin@lifechangers.test",
  displayName: "LOCAL DEVELOPMENT — System Administrator",
  seededAt: "2000-01-01T00:00:00.000Z",
} as const;

type LocalDevelopmentEnvironment = LocalDevelopmentBindings & {
  DB: D1Database;
};

/**
 * Provides the normal /admin dashboard with one synthetic administrator only
 * while `next dev` runs locally. Deployed authentication never uses this path.
 */
export async function localDevelopmentAdministrator(
  requestHeaders: Pick<Headers, "get">,
  environment: LocalDevelopmentEnvironment,
) {
  if (!localDevelopmentConfiguration(environment, requestHeaders.get("host"))) {
    return null;
  }

  const repository = new AccessControlRepository(environment.DB);
  let context = await repository.findStaffContextByAccessSubject(
    localAdministrator.accessSubject,
  );

  if (!context || context.accountStatus !== "active") {
    await ensureLocalDevelopmentAdministrator(environment.DB);
    context = await repository.findStaffContextByAccessSubject(
      localAdministrator.accessSubject,
    );
  }

  if (!context || context.accountStatus !== "active") {
    throw new ApplicationError(
      "INTERNAL_ERROR",
      "The local development administrator could not be prepared.",
    );
  }

  return {
    context,
    identity: {
      accessSubject: localAdministrator.accessSubject,
      email: localAdministrator.email,
    },
  };
}

async function ensureLocalDevelopmentAdministrator(database: D1Database) {
  await database.batch([
    database
      .prepare(
        `INSERT OR IGNORE INTO staff_profiles
          (id, access_subject, email, display_name, account_status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'active', ?5, ?5)`,
      )
      .bind(
        localAdministrator.id,
        localAdministrator.accessSubject,
        localAdministrator.email,
        localAdministrator.displayName,
        localAdministrator.seededAt,
      ),
    database
      .prepare(
        `INSERT OR IGNORE INTO staff_roles
          (id, staff_id, role_code, assigned_by, assignment_reason, assigned_at)
         VALUES (?1, ?2, 'system_admin', ?2, ?3, ?4)`,
      )
      .bind(
        localAdministrator.roleAssignmentId,
        localAdministrator.id,
        "Local development identity; never deploy this account.",
        localAdministrator.seededAt,
      ),
  ]);
}
