// Isolated synthetic experiment, NOT a login endpoint or password implementation.
import { pbkdf2Sync, scryptSync, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import { argon2id } from "@noble/hashes/argon2";

export const cases = [
  "baseline",
  "webcrypto-pbkdf2-600k",
  "node-pbkdf2-600k",
  "node-scrypt-64m",
  "argon2id-19m",
];

const hashingProbe = {
  async fetch(request, env) {
    // A missing secret closes the experiment, including the initial deployment.
    const supplied = Buffer.from(request.headers.get("authorization") ?? "");
    const expected = Buffer.from(`Bearer ${env.PROBE_TOKEN ?? ""}`);
    const expiresAt = Number(env.PROBE_EXPIRES_AT);
    if (
      !env.PROBE_TOKEN ||
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected) ||
      !Number.isFinite(expiresAt) ||
      Date.now() >= expiresAt
    ) {
      return new Response(null, {
        status: 404,
        headers: { "cache-control": "no-store", "x-probe-result": "closed" },
      });
    }
    const name = new URL(request.url).pathname.slice(1);
    if (
      request.method !== "POST" ||
      !cases.includes(name) ||
      Number(request.headers.get("content-length") ?? 0) !== 0 ||
      request.headers.has("transfer-encoding")
    ) {
      return new Response(null, { status: 400 });
    }
    // No caller-supplied credentials, parameters or salts are accepted.
    const password = "SYNTHETIC feasibility sample only 2026";
    const salt = new TextEncoder().encode("SYNTHETIC salt!!");
    try {
      let derived;
      switch (name) {
        case "baseline":
          derived = new Uint8Array(32);
          break;
        case "webcrypto-pbkdf2-600k": {
          const key = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(password),
            "PBKDF2",
            false,
            ["deriveBits"],
          );
          derived = new Uint8Array(
            await crypto.subtle.deriveBits(
              { name: "PBKDF2", hash: "SHA-256", salt, iterations: 600_000 },
              key,
              256,
            ),
          );
          break;
        }
        case "node-pbkdf2-600k":
          derived = pbkdf2Sync(password, salt, 600_000, 32, "sha256");
          break;
        case "node-scrypt-64m":
          derived = scryptSync(password, salt, 32, {
            N: 65_536,
            r: 8,
            p: 2,
            maxmem: 80 * 1024 * 1024,
          });
          break;
        case "argon2id-19m":
          derived = argon2id(password, salt, {
            m: 19_456,
            t: 2,
            p: 1,
            dkLen: 32,
          });
          break;
      }
      return Response.json(
        { case: name, status: "supported", outputBytes: derived.length },
        { headers: { "cache-control": "no-store" } },
      );
    } catch (error) {
      // Only fixed synthetic inputs are processed; runtime errors contain no PII.
      return Response.json(
        { case: name, status: "rejected", error: String(error.message) },
        { status: 422, headers: { "cache-control": "no-store" } },
      );
    }
  },
};

export default hashingProbe;
