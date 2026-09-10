import { describe, expect, it, vi } from "vitest";

import { checkD1Connection, validateCloudflareBindings } from "./bindings";

describe("Cloudflare bindings", () => {
  it("accepts the required D1 and R2 bindings", () => {
    expect(() =>
      validateCloudflareBindings({
        DB: {},
        WEBSITE_FILES: {},
      }),
    ).not.toThrow();
  });

  it("rejects an incomplete binding environment without listing internals", () => {
    expect(() => validateCloudflareBindings({ DB: {} })).toThrow(
      "Required Cloudflare bindings are unavailable.",
    );
  });

  it("reports a successful D1 probe", async () => {
    const first = vi.fn().mockResolvedValue({ ready: 1 });
    const prepare = vi.fn().mockReturnValue({ first });

    await expect(checkD1Connection({ prepare })).resolves.toBe(true);
    expect(prepare).toHaveBeenCalledWith("SELECT 1 AS ready");
  });

  it("rejects an unexpected D1 probe result", async () => {
    const prepare = vi.fn().mockReturnValue({
      first: vi.fn().mockResolvedValue(null),
    });

    await expect(checkD1Connection({ prepare })).resolves.toBe(false);
  });
});
