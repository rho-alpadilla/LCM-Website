import { describe, expect, it } from "vitest";

import { ApplicationError } from "@/lib/errors/application-error";

import { applicationErrorResponse, privateJsonResponse } from "./responses";

describe("private HTTP responses", () => {
  it("prevents protected JSON from being cached", async () => {
    const response = privateJsonResponse({ ready: true });

    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    await expect(response.json()).resolves.toEqual({ ready: true });
  });

  it("does not expose internal error details", async () => {
    const response = applicationErrorResponse(
      new ApplicationError(
        "INTERNAL_ERROR",
        "Database account identifier should stay private.",
      ),
    );
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(body).not.toContain("Database account identifier");
    expect(body).toContain("The request could not be completed.");
  });
});
