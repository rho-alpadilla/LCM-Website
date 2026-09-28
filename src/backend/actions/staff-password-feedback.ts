import { ApplicationError } from "@/shared/errors/application-error";
import { z } from "zod";

export type PasswordStaffCreationFailureCode =
  | "password_staff_admin_password_invalid"
  | "password_staff_email_exists"
  | "password_staff_username_exists"
  | "password_staff_elevated_reason_required"
  | "password_staff_rate_limited"
  | "password_staff_invalid_input"
  | "password_staff_creation_failed";

export function getPasswordStaffCreationFailureCode(
  error: unknown,
): PasswordStaffCreationFailureCode {
  if (error instanceof z.ZodError) {
    return "password_staff_invalid_input";
  }
  if (!(error instanceof ApplicationError)) {
    return "password_staff_creation_failed";
  }
  if (error.code === "AUTHENTICATION_REQUIRED") {
    return "password_staff_admin_password_invalid";
  }
  if (error.code === "RATE_LIMITED") return "password_staff_rate_limited";
  if (error.message === "That email already has a staff account.") {
    return "password_staff_email_exists";
  }
  if (error.message === "That username is already in use.") {
    return "password_staff_username_exists";
  }
  if (
    error.message ===
    "Elevated roles require a reason of at least 10 characters."
  ) {
    return "password_staff_elevated_reason_required";
  }
  if (error.code === "VALIDATION_FAILED") {
    return "password_staff_invalid_input";
  }
  return "password_staff_creation_failed";
}

export function logPasswordStaffCreationFailure(error: unknown) {
  console.error("Password staff account creation failed.", {
    failure: getPasswordStaffCreationFailureCode(error),
    applicationErrorCode:
      error instanceof ApplicationError ? error.code : "UNEXPECTED_ERROR",
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
}
