import "server-only";

import { requireActiveStaffSession } from "@/backend/auth/staff-context";
import { PasswordAuthenticationRepository } from "@/backend/repositories/staff/password-authentication-repository";
import type { PasswordStaffDirectoryFilters } from "@/shared/staff/password-directory";

export async function getPasswordStaffWorkspace(
  filters: PasswordStaffDirectoryFilters,
) {
  const { context, environment } =
    await requireActiveStaffSession("staff.read");
  const staff = await new PasswordAuthenticationRepository(
    environment.DB,
  ).listPasswordStaffDirectoryPage(filters);
  return { context, staff };
}
