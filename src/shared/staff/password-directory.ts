import type { RoleCode } from "./roles";
import type { StaffAccountStatus } from "./types";

export type PasswordStaffDirectoryEntry = {
  id: string;
  email: string;
  displayName: string;
  phone: string | null;
  jobTitle: string | null;
  accountStatus: StaffAccountStatus;
  username: string | null;
  temporaryPasswordPending: boolean;
  temporaryPasswordExpiresAt: string | null;
  roles: { assignmentId: string; code: string; name: string }[];
};

export type PasswordStaffDirectoryFilters = {
  search: string;
  accountStatus: StaffAccountStatus | "all";
  roleCode: RoleCode | "all";
  page: number;
  pageSize: number;
};

export type PasswordStaffDirectoryPage = {
  entries: PasswordStaffDirectoryEntry[];
  total: number;
  page: number;
};
