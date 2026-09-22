import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createStaffAccessDirectory,
  type StaffAccessDirectoryEnvironment,
} from "./staff-access-directory";

const configuredEnvironment: StaffAccessDirectoryEnvironment = {
  APP_ENVIRONMENT: "preview",
  CLOUDFLARE_ACCESS_ACCOUNT_ID: "a".repeat(32),
  CLOUDFLARE_ACCESS_POLICY_ID: "11111111-1111-4111-8111-111111111111",
  CLOUDFLARE_ACCESS_API_TOKEN: "test-token-that-is-never-a-real-secret",
};

function policyResponse(emails: string[]) {
  return Response.json({
    success: true,
    result: {
      name: "LCM Website Staff",
      decision: "allow",
      include: emails.map((email) => ({ email: { email } })),
    },
  });
}

describe("Cloudflare staff Access directory", () => {
  it("never calls Cloudflare while running locally", async () => {
    const fetcher = vi.fn();
    const directory = createStaffAccessDirectory(
      { APP_ENVIRONMENT: "local" },
      fetcher as typeof fetch,
    );

    await directory.allowEmail("person@example.com");
    await directory.removeEmail("person@example.com");

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("adds an email to the dedicated Access policy", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(policyResponse(["admin@example.com"]))
      .mockResolvedValueOnce(Response.json({ success: true, result: {} }));
    const directory = createStaffAccessDirectory(
      configuredEnvironment,
      fetcher as typeof fetch,
    );

    await directory.allowEmail("PASTOR@EXAMPLE.COM");

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]?.[0]).toContain(
      "/accounts/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/access/policies/11111111-1111-4111-8111-111111111111",
    );
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
      method: "PUT",
      body: JSON.stringify({
        name: "LCM Website Staff",
        decision: "allow",
        include: [
          { email: { email: "admin@example.com" } },
          { email: { email: "pastor@example.com" } },
        ],
      }),
    });
  });

  it("removes a suspended staff email from the Access policy", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        policyResponse(["admin@example.com", "pastor@example.com"]),
      )
      .mockResolvedValueOnce(Response.json({ success: true, result: {} }));
    const directory = createStaffAccessDirectory(
      configuredEnvironment,
      fetcher as typeof fetch,
    );

    await expect(directory.removeEmail("pastor@example.com")).resolves.toEqual({
      removed: true,
    });

    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
      body: JSON.stringify({
        name: "LCM Website Staff",
        decision: "allow",
        include: [{ email: { email: "admin@example.com" } }],
      }),
    });
  });

  it("preserves supported policy controls while changing only the email list", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          success: true,
          result: {
            name: "LCM Website Staff",
            decision: "allow",
            include: [{ email: { email: "admin@example.com" } }],
            require: [{ login_method: { id: "otp-method-id" } }],
            session_duration: "24h",
          },
        }),
      )
      .mockResolvedValueOnce(Response.json({ success: true, result: {} }));
    const directory = createStaffAccessDirectory(
      configuredEnvironment,
      fetcher as typeof fetch,
    );

    await directory.allowEmail("pastor@example.com");

    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
      body: JSON.stringify({
        name: "LCM Website Staff",
        decision: "allow",
        include: [
          { email: { email: "admin@example.com" } },
          { email: { email: "pastor@example.com" } },
        ],
        require: [{ login_method: { id: "otp-method-id" } }],
        session_duration: "24h",
      }),
    });
  });

  it("fails closed when the policy includes a non-email rule", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        success: true,
        result: {
          name: "LCM Website Staff",
          decision: "allow",
          include: [{ everyone: {} }],
        },
      }),
    );
    const directory = createStaffAccessDirectory(
      configuredEnvironment,
      fetcher as typeof fetch,
    );

    await expect(directory.allowEmail("person@example.com")).rejects.toThrow(
      /must contain only staff email rules/i,
    );
  });

  it("requires the one-time Access automation configuration outside local development", () => {
    expect(() =>
      createStaffAccessDirectory({ APP_ENVIRONMENT: "preview" }),
    ).toThrow(/automation is not configured/i);
  });

  it("reports rejected Access policy credentials without exposing provider details", async () => {
    const directory = createStaffAccessDirectory(
      configuredEnvironment,
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ success: false }, { status: 403 }),
        ) as typeof fetch,
    );

    await expect(directory.allowEmail("person@example.com")).rejects.toThrow(
      /rejected the staff policy credentials/i,
    );
  });
});
