import { describe, expect, it } from "vitest";

import { siteConfig } from "./site";

describe("siteConfig", () => {
  it("uses the confirmed church name", () => {
    expect(siteConfig.name).toBe("Lifechangers Ministry Incorporated");
  });

  it("labels all confirmed initial public actions", () => {
    expect(siteConfig.initialActions).toHaveLength(6);
  });
});
