import "server-only";

import { requireActiveStaffSession } from "@/backend/auth/staff-context";
import { PasswordAuthenticationRepository } from "@/backend/repositories/staff/password-authentication-repository";

export async function getPasswordStaffWorkspace() {
  const { context, environment } =
    await requireActiveStaffSession("staff.read");
  const staff = await new PasswordAuthenticationRepository(
    environment.DB,
  ).listPasswordStaffDirectory();
  return { context, staff };
}
