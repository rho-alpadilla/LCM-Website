import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { architectureRule } from "./scripts/eslint-architecture.mjs";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { architecture: { rules: { boundaries: architectureRule } } },
    rules: { "architecture/boundaries": "error" },
  },
  globalIgnores([
    ".next/**",
    ".open-next/**",
    "coverage/**",
    "cloudflare-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);
