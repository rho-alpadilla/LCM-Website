export type StaffAccountStatus =
  "invited" | "active" | "suspended" | "disabled";

export type StaffContext = {
  id: string;
  email: string;
  displayName: string;
  accountStatus: StaffAccountStatus;
  roles: string[];
  permissions: string[];
};
