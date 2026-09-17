// @vitest-environment node
import { Linter } from "eslint";
import { describe, expect, it } from "vitest";
import { architectureRule } from "../scripts/eslint-architecture.mjs";

function check(file, source) {
  return new Linter().verify(
    source,
    [
      {
        files: ["**/*.js"],
        plugins: { architecture: { rules: { boundaries: architectureRule } } },
        rules: { "architecture/boundaries": "error" },
      },
    ],
    { filename: `src/${file}.js` },
  );
}

describe("source architecture boundaries", () => {
  it.each([
    ["shared/model", 'import x from "@/backend/repositories/example";'],
    ["shared/model", 'import x from "next/headers";'],
    [
      "backend/services/example",
      'import x from "@/frontend/components/example";',
    ],
    [
      "backend/services/example",
      'import x from "../../frontend/components/example";',
    ],
    [
      "frontend/components/example",
      'import x from "@/backend/queries/example";',
    ],
    [
      "frontend/screens/example",
      '"use client"; import x from "@/backend/queries/example";',
    ],
    [
      "frontend/screens/example",
      'import x from "@/backend/repositories/example";',
    ],
    ["frontend/screens/example", 'export * from "@/backend/services/example";'],
    ["frontend/screens/example", 'import("@/backend/cloudflare/bindings");'],
    ["frontend/screens/example", 'require("@/backend/integrations/paymongo");'],
    ["app/example", 'import x from "@/legacy/supabase/server";'],
  ])("rejects a forbidden import from %s", (file, source) => {
    expect(check(file, source)).toEqual([
      expect.objectContaining({ ruleId: "architecture/boundaries" }),
    ]);
  });

  it.each([
    ["shared/model", 'import x from "@/shared/content/types";'],
    [
      "backend/services/example",
      'import x from "@/backend/repositories/example";',
    ],
    ["frontend/screens/example", 'import x from "@/backend/queries/example";'],
    [
      "frontend/components/example",
      '"use client"; import x from "@/backend/actions/example";',
    ],
    ["frontend/components/example", 'import x from "@/shared/media/types";'],
    ["app/example", 'export { GET } from "@/backend/http/handlers/example";'],
  ])("allows an intended boundary from %s", (file, source) => {
    expect(check(file, source)).toEqual([]);
  });
});
