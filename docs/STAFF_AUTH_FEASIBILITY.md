# Staff Password Hashing: Feasibility Results

Date: 2026-09-22. Scope: synthetic hashing experiments, not a login release.

## Outcome

**Direct hashing inside the ordinary free Worker: no-go for the tested options.**
**An internal SQLite-backed Durable Object coordinator: technically feasible
on the existing Free account.** Recommend native scrypt there, subject to the
full authentication implementation and release tests in
[ADR 0003](decisions/0003-staff-password-authentication.md).

The Workers plan page showed **Free / Current plan**, with a 10 ms CPU limit.
No subscription, billing setting, website Worker, Access policy, account,
website D1 database or R2 bucket was changed. Temporary diagnostic Workers
and their synthetic Durable Object namespaces were removed after testing.

## Measurements

CPU figures below come from Cloudflare live-tail events, not JavaScript timers
or client response time. A successful request alone does not prove compliance:
the runtime sometimes allows an occasional CPU overrun.

| Candidate                                                 | Hosted result                                                                                                                                                                                    | Interpretation                                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Web Crypto PBKDF2-HMAC-SHA-256, 600,000 iterations        | Both attempts rejected: hosted runtime caps the requested iteration count at 100,000.                                                                                                            | Cannot use the tested native Web Crypto path at the required work factor.        |
| Native scrypt, N=65,536, r=8, p=2, directly in Worker     | 455 and 583 ms CPU; both returned a result.                                                                                                                                                      | Far above 10 ms. Successful responses do not make this reliable on Workers Free. |
| JavaScript Argon2id, 19 MiB, t=2, p=1, directly in Worker | One request used 943 ms CPU; another was terminated with `exceededCpu` / HTTP 503 / error 1102.                                                                                                  | Direct implementation fails the free-tier requirement.                           |
| Same Argon2id in Durable Object                           | Three create/correct/incorrect rounds passed. Nine object CPU samples: 1,309–1,689 ms; calling Worker: 1–3 ms.                                                                                   | Supported within the object's larger CPU allowance, but relatively slow.         |
| Native scrypt in Durable Object                           | Three create/correct/incorrect rounds plus two concurrent correct/incorrect attempts passed: 11 operations. Seven captured object CPU samples: 432–538 ms; captured calling-Worker sample: 1 ms. | Preferred tested candidate; no additional production hashing package required.   |

The native scrypt probe used an 80 MiB allocation limit, random 16-byte salts,
32-byte derived values and timing-safe comparison. Its N/r/p combination is
one of the alternatives in the
[OWASP password-storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
No lower-cost password settings were substituted to make the test pass.

Local workerd accepted 600,000 PBKDF2 iterations even though the hosted runtime
rejected that Web Crypto call. This is why a successful local test is not a
deployment certificate. The direct Node PBKDF2 probe returned 404 during the
initial run; that result is inconclusive and is not used to judge the algorithm.
Subsequent runs added readiness polling after observed deployment/secret
propagation delays. Initial deployment 500s and pre-readiness 404s are not
counted as hashing outcomes.

## Why the Internal Component Works

Cloudflare documents a default **30-second CPU allowance** per Durable Object
invocation. SQLite-backed objects are available on Workers Free. The ordinary
Worker performs request checks, then waits for the internal operation; waiting
does not consume that Worker's CPU budget. See
[Durable Object limits](https://developers.cloudflare.com/durable-objects/platform/limits/)
and [Worker CPU accounting](https://developers.cloudflare.com/workers/platform/limits/#cpu-time).

The proposed production responsibility is **login-attempt coordination and
password verification**, not a public hashing API. Coordinate attempts per
staff identity or bounded shard, enforce persistent limits before expensive
work, and use internal bindings only. Do not put all website requests through
one global object or create unlimited objects from arbitrary submitted usernames.
Keep profiles, roles, prayer data and website records in D1.

This adds an internal Cloudflare component, not another account, a replacement
database provider, Google sign-in or an email service. The inactive password
foundation now declares the component and uses it only through internal Worker
bindings. It is still not enabled for real staff authentication.

## Free-Tier Budget and Availability

Cloudflare lists 100,000 Durable Object requests and 13,000 GB-seconds of
duration per day on Free, plus separate storage/read/write allowances. Free
operations fail when their allowance is exhausted; they do not silently turn
into paid overages. Limits are shared with other applicable account usage.
See [Durable Object pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/).

Planning example, **not a measured production forecast**: 1,000 attempts taking
one second of billable object duration each at 0.128 GB would consume about
128 GB-seconds. Network waiting, object lifecycle, rate-limit/storage work,
attack traffic and the rest of the account's usage must also be included.
Persistent timers or unnecessary long-lived connections can change the cost.

Before release, set an application-wide authentication budget comfortably below
provider quotas, per-source/per-account limits, bounded counter retention and
monitoring. Exhaustion must fail closed with a helpful retry message. Free
hosting cannot guarantee uninterrupted login under attack or unlimited use.
No paid plan or automatic upgrade is authorized by this result.

## Test Isolation and Reproduction

The diagnostic fixtures are under `scripts/auth-feasibility/`; nothing imports
them into the website. No application package or lockfile was changed.

- Local: Node 24.17.0, Wrangler 4.112.0, Miniflare 4.20260714.0,
  workerd 1.20260714.1, compatibility date 2026-07-14.
- Hosted: Cloudflare's managed runtime, compatibility date 2026-09-22,
  `nodejs_compat`. Actual server binary version was not exposed by the test.
- Argon2 comparison: the already installed transitive `@noble/hashes` 1.8.0.
  Its README excludes Argon2 from the stated audit scope. It was a benchmark
  candidate, **not an approved production dependency**.
- Native candidate: Workers `node:crypto.scryptSync`; no hand-written hashing
  algorithm, no added password-hashing library.

Run local comparisons from the repository root:

```powershell
node scripts/auth-feasibility/local.mjs
node scripts/auth-feasibility/local.mjs --durable
node scripts/auth-feasibility/local.mjs --durable --scrypt
```

Remote runs create external test resources. Verify the account is still on
Workers Free first, and run only with authorization for that experiment:

```powershell
node scripts/auth-feasibility/remote.mjs --confirmed-free-plan
node scripts/auth-feasibility/remote.mjs --confirmed-free-plan --durable
node scripts/auth-feasibility/remote.mjs --confirmed-free-plan --durable --scrypt
```

The remote runner uses a fresh random Worker name, performs a dry run, installs
a generated five-minute diagnostic secret via stdin, waits for readiness,
and sends only fixed synthetic cases. It never accepts user passwords or
caller-selected hashing parameters. It checks unauthenticated denial, prints
only selected non-secret trace fields, and removes its exact Worker in `finally`.
Durable runs first delete their synthetic class/namespace through a migration.
An interrupted process or failed cleanup still requires checking the printed
diagnostic name manually; the secret's expiry is defense in depth.

The diagnostic object stores only a synthetic hash, salt and a bounded attempt
counter. It admits at most 32 operations per synthetic identity. Its test
temporary passwords are not staff credentials. Do not deploy these fixtures as
the application's authentication service or use their static synthetic inputs
for real accounts.

## What This Does Not Prove

Validation completed: isolated local/hosted probes, diagnostic-script lint,
formatting and whitespace checks, and all 16 architecture tests through Vitest.
A final read-only Cloudflare inventory found zero remaining diagnostic Workers
and zero diagnostic namespaces; the original `lcm-website` Worker remained.
No full website E2E or production build was run for this isolated experiment.

This is a **conditional feasibility pass**, not completion of ADR 0003's release
gate. Not yet tested: the complete Next/OpenNext login handler with D1, sessions,
CSRF, password reset, account migration, all six roles, distributed attack
limits, multi-object load, peak memory instrumentation, quota-exhaustion behavior
and recovery. Only two concurrent attempts against one test identity were run;
this was not a load test or a penetration test.

Next: build staff credential enrollment, temporary-password setup, manual
recovery and end-to-end verification while preserving live Cloudflare Access.
The new login must remain unavailable until the whole flow, not only hashing,
passes its security and budget checks.
