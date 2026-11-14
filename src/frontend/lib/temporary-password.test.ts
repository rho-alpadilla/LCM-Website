import { describe, expect, it } from "vitest";

import { generateTemporaryPassword } from "./temporary-password";

describe("generateTemporaryPassword", () => {
  it("creates a 20-character temporary password with varied character types", () => {
    const password = generateTemporaryPassword((values) => {
      values.set(Array.from({ length: values.length }, (_, index) => index));
      return values;
    });

    expect(password).toHaveLength(20);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[2-9]/);
    expect(password).toMatch(/[!@#$%*+\-_]/);
  });
});
