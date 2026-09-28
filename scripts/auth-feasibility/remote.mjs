// Creates and removes ONLY a uniquely named synthetic diagnostic Worker.
// Run only after verifying that the selected account is on Workers Free.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

if (!process.argv.includes("--confirmed-free-plan")) {
  throw new Error("Verify Workers Free in the account dashboard first.");
}
const wrangler = fileURLToPath(
  new URL("../../node_modules/wrangler/bin/wrangler.js", import.meta.url),
);
const directory = fileURLToPath(new URL(".", import.meta.url));
const name = `lcm-auth-probe-${randomBytes(6).toString("hex")}`;
const secret = randomBytes(32).toString("hex");
const durable = process.argv.includes("--durable");
const config = durable ? "durable.wrangler.jsonc" : "wrangler.jsonc";
const common = ["--config", config, "--name", name];
const requestHeaders = {
  authorization: `Bearer ${secret}`,
  "x-probe-algorithm": process.argv.includes("--scrypt")
    ? "scrypt"
    : "argon2id",
};

async function command(args, input = "") {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [wrangler, ...args], {
      cwd: directory,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    });
    let output = "";
    const timeout = setTimeout(() => child.kill(), 120_000);
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.once("error", reject);
    child.once("close", (code) => {
      clearTimeout(timeout);
      // Never print stdin (contains the temporary diagnostic secret).
      const safe = output.replaceAll(secret, "[REDACTED]");
      if (code !== 0) reject(new Error(`Wrangler failed (${code}): ${safe}`));
      else resolve(safe);
    });
    child.stdin.end(input);
  });
}

let deployed = false;
let tail;
let tailOutput = "";
try {
  await command(["deploy", ...common, "--dry-run"]);
  console.log("Isolated Worker dry run: PASS");
  const deployedOutput = await command(["deploy", ...common]);
  deployed = true;
  const match = deployedOutput.match(
    new RegExp(`https://${name}\\.[a-z0-9-]+\\.workers\\.dev`),
  );
  assert.ok(match, "Expected diagnostic URL not returned by Wrangler.");
  const base = match[0];
  console.log(JSON.stringify({ diagnosticWorker: name, url: base }));
  const before = await fetch(`${base}/baseline`, {
    method: "POST",
    signal: AbortSignal.timeout(20_000),
  });
  if (before.status !== 404) {
    const text = await before.text();
    console.log(
      JSON.stringify({
        initialStatus: before.status,
        runtimeError1102: text.includes("1102"),
        runtimeError1101: text.includes("1101"),
      }),
    );
  }
  assert.equal(before.ok, false, "Probe must fail closed without secrets.");
  await command(
    ["secret", "bulk", ...common],
    JSON.stringify({
      PROBE_TOKEN: secret,
      PROBE_EXPIRES_AT: String(Date.now() + 5 * 60_000),
    }),
  );
  console.log("Temporary probe authorization configured (five-minute expiry).");
  // Deployment and secret updates propagate separately. Readiness is a cheap
  // baseline request; do not mislabel propagation failures as hashing failures.
  let ready = false;
  for (let attempt = 0; attempt < 15; attempt++) {
    const response = await fetch(`${base}/baseline`, {
      method: "POST",
      headers: requestHeaders,
      signal: AbortSignal.timeout(20_000),
    });
    if (response.status === 200) {
      ready = true;
      break;
    }
    console.log(
      JSON.stringify({
        readinessAttempt: attempt + 1,
        http: response.status,
        gate: response.headers.get("x-probe-result"),
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  assert.ok(ready, "Diagnostic deployment did not become ready.");
  const unauthenticated = await fetch(`${base}/baseline`, {
    method: "POST",
    signal: AbortSignal.timeout(20_000),
  });
  assert.equal(
    unauthenticated.status,
    404,
    "Ready probe must deny missing authorization.",
  );
  tail = spawn(
    process.execPath,
    [wrangler, "tail", name, "--config", config, "--format", "json"],
    {
      cwd: directory,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    },
  );
  tail.stdout.on("data", (chunk) => {
    tailOutput += chunk;
  });
  await new Promise((resolve) => setTimeout(resolve, 5000));
  const selectedCases = durable
    ? ["baseline", "create", "correct", "incorrect"]
    : [
        "baseline",
        "webcrypto-pbkdf2-600k",
        "node-pbkdf2-600k",
        "node-scrypt-64m",
        "argon2id-19m",
      ];
  for (let repetition = 1; repetition <= (durable ? 3 : 2); repetition++) {
    for (const testCase of selectedCases) {
      const response = await fetch(`${base}/${testCase}`, {
        method: "POST",
        headers: requestHeaders,
        signal: AbortSignal.timeout(20_000),
      });
      const contentType = response.headers.get("content-type") ?? "";
      const body = contentType.includes("application/json")
        ? await response.json()
        : { runtimeError1102: (await response.text()).includes("1102") };
      console.log(
        JSON.stringify({
          repetition,
          case: testCase,
          http: response.status,
          gate: response.headers.get("x-probe-result"),
          ...body,
        }),
      );
      if (durable) {
        assert.equal(response.status, 200);
        if (testCase === "correct") assert.equal(body.matches, true);
        if (testCase === "incorrect") assert.equal(body.matches, false);
      }
    }
  }
  if (durable) {
    await Promise.all(
      ["correct", "incorrect"].map(async (operation) => {
        const response = await fetch(`${base}/${operation}`, {
          method: "POST",
          headers: requestHeaders,
          signal: AbortSignal.timeout(20_000),
        });
        assert.equal(response.status, 200);
        const result = await response.json();
        assert.equal(result.matches, operation === "correct");
        console.log(JSON.stringify({ concurrent: true, ...result }));
      }),
    );
  }
} finally {
  if (tail) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    tail.kill();
    // Live-tail output includes request headers. Print only safe diagnostic fields.
    let start = -1,
      depth = 0,
      quoted = false,
      escaped = false;
    for (let i = 0; i < tailOutput.length; i++) {
      const char = tailOutput[i];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === "{") {
        if (depth++ === 0) start = i;
      } else if (char === "}" && --depth === 0 && start >= 0) {
        try {
          const event = JSON.parse(tailOutput.slice(start, i + 1));
          console.log(
            JSON.stringify({
              trace: event.event?.request?.url?.split("/").pop(),
              outcome: event.outcome,
              cpuTime: event.cpuTime,
              wallTime: event.wallTime,
              executionModel: event.executionModel,
              operations: event.logs?.flatMap((entry) => entry.message ?? []),
              exceptions: event.exceptions?.map(({ name, message }) => ({
                name,
                message,
              })),
            }).replaceAll(secret, "[REDACTED]"),
          );
        } catch {
          console.log("Diagnostic trace could not be parsed.");
        }
        start = -1;
      }
    }
  }
  if (deployed) {
    // This exact random name was created above; no website resource is targeted.
    if (durable) {
      await command([
        "deploy",
        "--config",
        "cleanup.wrangler.jsonc",
        "--name",
        name,
      ]);
      console.log(
        "Removed synthetic Durable Object namespace and its test-only rows.",
      );
    }
    await command(["delete", ...common, "--force"]);
    console.log(`Removed temporary diagnostic Worker: ${name}`);
  }
}
