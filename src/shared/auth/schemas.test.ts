import { describe, expect, it } from "vitest";

import {
  loginSchema,
  passwordSetupSchema,
  safeInternalPath,
} from "@/shared/auth/schemas";
import { invitationSchema } from "@/shared/staff/schemas";

describe("authentication validation", () => {
  it("normalizes staff email addresses", () => {
    const result = loginSchema.parse({
      email: "ADMIN@EXAMPLE.COM",
      password: "not-validated-on-login",
    });

    expect(result.email).toBe("admin@example.com");
  });

  it("requires a strong matching password", () => {
    expect(
      passwordSetupSchema.safeParse({
        password: "Short123",
        confirmPassword: "Short123",
      }).success,
    ).toBe(false);

    expect(
      passwordSetupSchema.safeParse({
        password: "SecurePassword123",
        confirmPassword: "SecurePassword123",
      }).success,
    ).toBe(true);
  });

  it("allows only local callback destinations", () => {
    expect(safeInternalPath("/admin/staff")).toBe("/admin/staff");
    expect(safeInternalPath("https://attacker.example")).toBe("/admin");
    expect(safeInternalPath("//attacker.example")).toBe("/admin");
  });

  it("allows Core Leader to be selected when a System Administrator creates staff", () => {
    const result = invitationSchema.safeParse({
      email: "leader@example.com",
      displayName: "Trusted Leader",
      roleCode: "core_leader",
    });

    expect(result.success).toBe(true);
  });
});
