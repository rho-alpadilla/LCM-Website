import { describe, expect, it, vi } from "vitest";

import {
  anonymousRateLimitKey,
  verifyTurnstile,
} from "@/server/security/turnstile";

const validInput = {
  token: "synthetic-token",
  remoteIp: "192.0.2.10",
  secret: "synthetic-secret",
  allowedHostnames: "church.example,localhost",
  expectedAction: "prayer_request",
};

describe("Turnstile verification", () => {
  it("accepts a successful response with the expected action and hostname", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        success: true,
        hostname: "church.example",
        action: "prayer_request",
      }),
    );
    await expect(
      verifyTurnstile({ ...validInput, fetcher }),
    ).resolves.toBeUndefined();
    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(String(request.body)).toContain("remoteip=192.0.2.10");
  });

  it.each([
    { success: false, hostname: "church.example", action: "prayer_request" },
    { success: true, hostname: "wrong.example", action: "prayer_request" },
    { success: true, hostname: "church.example", action: "another_action" },
  ])("fails closed for an invalid verification result", async (result) => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(result));
    await expect(
      verifyTurnstile({ ...validInput, fetcher }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("fails closed when required configuration is missing", async () => {
    await expect(
      verifyTurnstile({ ...validInput, secret: undefined }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      verifyTurnstile({ ...validInput, allowedHostnames: "" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("creates a stable rate-limit key without returning the source address", async () => {
    const headers = new Headers({
      "cf-connecting-ip": "192.0.2.10",
      "user-agent": "Synthetic Browser",
    });
    const first = await anonymousRateLimitKey(headers);
    const second = await anonymousRateLimitKey(headers);
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain("192.0.2.10");
  });
});
