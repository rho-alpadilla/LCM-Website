import { ApplicationError } from "@/shared/errors/application-error";

export type StaffInvitationFailureCode =
  | "invalid_invitation"
  | "elevated_role_reason_required"
  | "staff_email_exists"
  | "staff_setup_required"
  | "staff_access_authorization_failed"
  | "staff_access_policy_missing"
  | "staff_access_policy_invalid"
  | "staff_access_unreachable"
  | "staff_access_update_failed"
  | "invitation_failed";

const applicationErrorMessages: Record<string, StaffInvitationFailureCode> = {
  "Elevated roles require a reason of at least 10 characters.":
    "elevated_role_reason_required",
  "That email already has an account or pending invitation.":
    "staff_email_exists",
  "Staff account automation is not configured.": "staff_setup_required",
  "Cloudflare Access rejected the staff policy credentials.":
    "staff_access_authorization_failed",
  "The configured Cloudflare Access policy could not be found.":
    "staff_access_policy_missing",
  "The configured Cloudflare Access policy is not a supported staff policy.":
    "staff_access_policy_invalid",
  "The configured Cloudflare Access policy must contain only staff email rules.":
    "staff_access_policy_invalid",
  "Cloudflare Access could not be reached.": "staff_access_unreachable",
  "Cloudflare Access could not update the staff policy.":
    "staff_access_update_failed",
};

export function getStaffInvitationFailureCode(
  error: unknown,
): StaffInvitationFailureCode {
  if (!(error instanceof ApplicationError)) return "invitation_failed";
  return applicationErrorMessages[error.message] ?? "invitation_failed";
}

/**
 * Records a compact server-side diagnostic without writing form fields,
 * email addresses, token values, or provider responses to the log stream.
 */
export function logStaffInvitationFailure(error: unknown) {
  console.error("Staff account creation failed.", {
    failure: getStaffInvitationFailureCode(error),
    applicationErrorCode:
      error instanceof ApplicationError ? error.code : "UNEXPECTED_ERROR",
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
}
