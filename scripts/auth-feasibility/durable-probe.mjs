// Synthetic coordination experiment only. No website bindings or real accounts.
import { DurableObject } from "cloudflare:workers";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { argon2id } from "@noble/hashes/argon2";
import probe from "./probe.mjs";

export class SyntheticHashCoordinator extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS probe_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        attempts INTEGER NOT NULL CHECK (attempts BETWEEN 0 AND 32),
        salt BLOB, hash BLOB
      );
      INSERT OR IGNORE INTO probe_state (id, attempts) VALUES (1, 0);
    `);
  }

  run(operation, algorithm) {
    if (!["create", "correct", "incorrect"].includes(operation)) {
      throw new Error("Invalid synthetic operation");
    }
    if (!["argon2id", "scrypt"].includes(algorithm))
      throw new Error("Invalid synthetic algorithm");
    const admitted = this.ctx.storage.sql
      .exec(
        "UPDATE probe_state SET attempts = attempts + 1 WHERE id = 1 AND attempts < 32 RETURNING attempts",
      )
      .toArray();
    if (!admitted.length) throw new Error("Synthetic request budget exhausted");
    const password = "SYNTHETIC feasibility sample only 2026";
    const parameters = { m: 19_456, t: 2, p: 1, dkLen: 32 };
    const derive = (value, salt) =>
      algorithm === "scrypt"
        ? scryptSync(value, salt, 32, {
            N: 65_536,
            r: 8,
            p: 2,
            maxmem: 80 * 1024 * 1024,
          })
        : argon2id(value, salt, parameters);
    let matches;
    if (operation === "create") {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const hash = derive(password, salt);
      this.ctx.storage.sql.exec(
        "UPDATE probe_state SET salt = ?, hash = ? WHERE id = 1",
        salt,
        hash,
      );
      matches = null;
    } else {
      const stored = this.ctx.storage.sql
        .exec("SELECT salt, hash FROM probe_state WHERE id = 1")
        .one();
      if (!stored.hash || !stored.salt)
        throw new Error("Synthetic setup required");
      const candidate = derive(
        operation === "correct" ? password : `${password} incorrect`,
        new Uint8Array(stored.salt),
      );
      matches = timingSafeEqual(candidate, new Uint8Array(stored.hash));
    }
    console.log(
      JSON.stringify({
        syntheticOperation: operation,
        algorithm,
        attempt: admitted[0].attempts,
      }),
    );
    return { operation, algorithm, matches, attempt: admitted[0].attempts };
  }
}

const durableHashingProbe = {
  async fetch(request, env) {
    const gateUrl = new URL(request.url);
    gateUrl.pathname = "/baseline";
    const gate = await probe.fetch(new Request(gateUrl, request), env);
    if (gate.status !== 200) return gate;
    const operation = new URL(request.url).pathname.slice(1);
    if (operation === "baseline") return gate;
    if (!["create", "correct", "incorrect"].includes(operation)) {
      return new Response(null, { status: 400 });
    }
    const algorithm = request.headers.get("x-probe-algorithm") ?? "argon2id";
    if (!["argon2id", "scrypt"].includes(algorithm))
      return new Response(null, { status: 400 });
    const result = await env.SYNTHETIC_HASH.getByName(
      `synthetic-staff-${algorithm}`,
    ).run(operation, algorithm);
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  },
};

export default durableHashingProbe;
