import { describe, expect, it } from "vitest";

import {
  readLimitedJson,
  requireConfiguredRequestHostname,
  requireSameOrigin,
} from "./request-security";

describe("administrative request security", () => {
  it("allows only a matching request origin", () => {
    const sameOriginRequest = new Request(
      "https://church.example/api/admin/bootstrap",
      { headers: { origin: "https://church.example" } },
    );
    const crossOriginRequest = new Request(
      "https://church.example/api/admin/bootstrap",
      { headers: { origin: "https://attacker.example" } },
    );
    const malformedOriginRequest = new Request(
      "https://church.example/api/admin/bootstrap",
      { headers: { origin: "not a valid origin" } },
    );

    expect(() => requireSameOrigin(sameOriginRequest)).not.toThrow();
    expect(() => requireSameOrigin(crossOriginRequest)).toThrow(
      /administration website/i,
    );
    expect(() => requireSameOrigin(malformedOriginRequest)).toThrow(
      /administration website/i,
    );
  });

  it("allows configured checkout hostnames only", () => {
    const request = new Request("https://church.example/api/giving/checkout");

    expect(() =>
      requireConfiguredRequestHostname(request, "church.example,www.church.example"),
    ).not.toThrow();
    expect(() =>
      requireConfiguredRequestHostname(request, "www.church.example"),
    ).toThrow(/not configured/i);
  });

  it("reads valid JSON within the configured size limit", async () => {
    const request = new Request("https://church.example/api/admin/bootstrap", {
      method: "POST",
      body: JSON.stringify({ displayName: "Administrator" }),
    });

    await expect(readLimitedJson(request, 100)).resolves.toEqual({
      displayName: "Administrator",
    });
  });

  it("rejects an oversized body before parsing it", async () => {
    const request = new Request("https://church.example/api/admin/bootstrap", {
      method: "POST",
      body: JSON.stringify({ value: "x".repeat(100) }),
    });

    await expect(readLimitedJson(request, 20)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });
});
