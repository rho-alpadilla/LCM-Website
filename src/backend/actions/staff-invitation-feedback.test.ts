import { describe, expect, it } from "vitest";

import { ApplicationError } from "@/shared/errors/application-error";

import { getStaffInvitationFailureCode } from "./staff-invitation-feedback";

describe("staff invitation feedback", () => {
  it("gives an administrator a safe next step when the email is already pending", () => {
    expect(
      getStaffInvitationFailureCode(
        new ApplicationError(
          "VALIDATION_FAILED",
          "That email already has an account or pending invitation.",
        ),
      ),
    ).toBe("staff_email_exists");
  });

  it("identifies restricted Cloudflare Access token failures", () => {
    expect(
      getStaffInvitationFailureCode(
        new ApplicationError(
          "INTERNAL_ERROR",
          "Cloudflare Access rejected the staff policy credentials.",
        ),
      ),
    ).toBe("staff_access_authorization_failed");
  });

  it("identifies an unsafe Cloudflare Access policy shape", () => {
    expect(
      getStaffInvitationFailureCode(
        new ApplicationError(
          "INTERNAL_ERROR",
          "The configured Cloudflare Access policy must contain only staff email rules.",
        ),
      ),
    ).toBe("staff_access_policy_invalid");
  });

  it("keeps unexpected errors generic", () => {
    expect(getStaffInvitationFailureCode(new Error("database details"))).toBe(
      "invitation_failed",
    );
  });
});
