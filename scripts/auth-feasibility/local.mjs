import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const fromWrangler = createRequire(require.resolve("wrangler"));
const { Miniflare } = fromWrangler("miniflare");
const { build } = fromWrangler("esbuild");
// Reuse an already installed candidate without changing application dependencies.
const candidate = fileURLToPath(
  new URL(
    "../../node_modules/.pnpm/@noble+hashes@1.8.0/node_modules/@noble/hashes/esm/argon2.js",
    import.meta.url,
  ),
);
const durable = process.argv.includes("--durable");
const bundled = await build({
  entryPoints: [
    fileURLToPath(
      new URL(durable ? "./durable-probe.mjs" : "./probe.mjs", import.meta.url),
    ),
  ],
  bundle: true,
  write: false,
  format: "esm",
  platform: "browser",
  external: ["node:*", "cloudflare:workers"],
  alias: { "@noble/hashes/argon2": candidate },
});
const secret = randomBytes(32).toString("hex");
const runtime = new Miniflare({
  modules: true,
  script: bundled.outputFiles[0].text,
  compatibilityDate: "2026-07-14",
  compatibilityFlags: ["nodejs_compat"],
  ...(durable
    ? {
        durableObjects: {
          SYNTHETIC_HASH: {
            className: "SyntheticHashCoordinator",
            useSQLite: true,
          },
        },
      }
    : {}),
  bindings: {
    PROBE_TOKEN: secret,
    PROBE_EXPIRES_AT: String(Date.now() + 60_000),
  },
});
try {
  const denied = await runtime.dispatchFetch("http://probe.test/argon2id-19m", {
    method: "POST",
  });
  assert.equal(denied.status, 404);
  console.log("Missing-secret request denied: PASS");
  const headers = {
    authorization: `Bearer ${secret}`,
    "x-probe-algorithm": process.argv.includes("--scrypt")
      ? "scrypt"
      : "argon2id",
  };
  const bad = await runtime.dispatchFetch("http://probe.test/unlisted", {
    method: "POST",
    headers,
  });
  assert.equal(bad.status, 400);
  console.log("Unlisted operation denied: PASS");
  for (const name of durable
    ? ["baseline", "create", "correct", "incorrect"]
    : [
        "baseline",
        "webcrypto-pbkdf2-600k",
        "node-pbkdf2-600k",
        "node-scrypt-64m",
        "argon2id-19m",
      ]) {
    const started = performance.now();
    const response = await runtime.dispatchFetch(`http://probe.test/${name}`, {
      method: "POST",
      headers,
    });
    console.log(
      JSON.stringify({
        ...(await response.json()),
        localWallMs: Math.round(performance.now() - started),
        note: "Local wall time, NOT deployed CPU time or a free-tier verdict",
      }),
    );
  }
} finally {
  await runtime.dispose();
}
