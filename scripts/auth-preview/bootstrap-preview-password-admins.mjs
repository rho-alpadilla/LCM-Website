import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const confirmationFlag = "--confirm-preview-password-bootstrap";
const operatorDirectory = join(repositoryRoot, ".local-operator");
const enrollmentPath = join(operatorDirectory, "preview-password-admins.json");
const credentialsPath = join(
  operatorDirectory,
  "preview-password-admin-credentials.txt",
);
const sqlPath = join(
  operatorDirectory,
  "bootstrap-preview-password-admins.sql",
);
const previewEnvironment = "preview";
const temporaryPasswordGracePeriodMilliseconds = 3 * 24 * 60 * 60 * 1_000;

if (!process.argv.includes(confirmationFlag)) {
  throw new Error(
    `Refusing to run. Re-run with ${confirmationFlag} after confirming the preview database backup and administrator mapping.`,
  );
}

await assertPreviewConfiguration();
await mkdir(operatorDirectory, { recursive: true });
const enrollment = await readEnrollment();
const existingAdministrator = await findExistingAdministrator(enrollment);
await assertNoExistingPasswordEnrollment(enrollment);

const now = new Date();
const createdAt = now.toISOString();
const expiresAt = new Date(
  now.getTime() + temporaryPasswordGracePeriodMilliseconds,
).toISOString();
const secondAdministratorId = randomUUID();
const passwords = {
  existing: createTemporaryPassword(),
  second: createTemporaryPassword(),
};
const existingCredential = createPasswordCredential(passwords.existing);
const secondCredential = createPasswordCredential(passwords.second);

await writeFile(
  sqlPath,
  buildBootstrapSql({
    enrollment,
    existingAdministratorId: existingAdministrator.id,
    secondAdministratorId,
    existingCredential,
    secondCredential,
    createdAt,
    expiresAt,
  }),
  { encoding: "utf8", mode: 0o600 },
);

try {
  await runWrangler([
    "d1",
    "execute",
    "DB",
    "--remote",
    "--env",
    previewEnvironment,
    "--file",
    sqlPath,
  ]);
} catch (error) {
  await writeFile(
    credentialsPath,
    "No password accounts were confirmed. The one-time preview enrollment did not complete.\n",
    { encoding: "utf8", mode: 0o600 },
  );
  throw error;
}

await writeFile(
  credentialsPath,
  [
    "LCM PREVIEW — INITIAL PASSWORD ADMINISTRATORS",
    "Keep this file private. Hand each temporary password directly to its owner, then delete this file after both people finish first-password setup.",
    "These are preview credentials only. Do not reuse them in production.",
    "",
    `Temporary passwords expire: ${expiresAt}`,
    "",
    enrollment.existing.displayName,
    `Username: ${enrollment.existing.username}`,
    `Temporary password: ${passwords.existing}`,
    "",
    enrollment.second.displayName,
    `Username: ${enrollment.second.username}`,
    `Temporary password: ${passwords.second}`,
  ].join("\n"),
  { encoding: "utf8", mode: 0o600 },
);

console.info(
  `Preview password administrators were enrolled. Temporary credentials were written only to ${credentialsPath}.`,
);

async function readEnrollment() {
  let raw;
  try {
    raw = JSON.parse(await readFile(enrollmentPath, "utf8"));
  } catch {
    throw new Error(
      `Could not read the private enrollment file at ${enrollmentPath}.`,
    );
  }

  const enrollment = {
    existing: parseAdministrator(raw?.existing, "existing"),
    second: parseAdministrator(raw?.second, "second"),
    assignmentReason: String(raw?.assignmentReason ?? "").trim(),
  };
  if (enrollment.assignmentReason.length < 10) {
    throw new Error(
      "The private assignment reason must be at least 10 characters.",
    );
  }
  if (enrollment.existing.email === enrollment.second.email) {
    throw new Error("The two System Administrators must use different emails.");
  }
  if (enrollment.existing.username === enrollment.second.username) {
    throw new Error(
      "The two System Administrators must use different usernames.",
    );
  }
  return enrollment;
}

function parseAdministrator(value, label) {
  const administrator = {
    displayName: String(value?.displayName ?? "").trim(),
    email: String(value?.email ?? "")
      .trim()
      .toLowerCase(),
    username: String(value?.username ?? "")
      .trim()
      .toLowerCase(),
  };
  if (
    administrator.displayName.length < 2 ||
    administrator.displayName.length > 120
  ) {
    throw new Error(`The ${label} administrator name is invalid.`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(administrator.email)) {
    throw new Error(`The ${label} administrator email is invalid.`);
  }
  if (!/^[a-z][a-z0-9._-]{2,63}$/.test(administrator.username)) {
    throw new Error(`The ${label} administrator username is invalid.`);
  }
  return administrator;
}

async function findExistingAdministrator(enrollment) {
  const rows = await executeJson(
    `SELECT profile.id
     FROM staff_profiles AS profile
     JOIN staff_roles AS assignment ON assignment.staff_id = profile.id
     WHERE profile.email = ${sql(enrollment.existing.email)} COLLATE NOCASE
       AND profile.account_status = 'active'
       AND assignment.role_code = 'system_admin'
       AND assignment.revoked_at IS NULL`,
  );
  if (rows.length !== 1 || typeof rows[0]?.id !== "string") {
    throw new Error(
      "The approved existing System Administrator could not be verified. No changes were made.",
    );
  }
  return { id: rows[0].id };
}

async function assertNoExistingPasswordEnrollment(enrollment) {
  const rows = await executeJson(
    `SELECT username
     FROM staff_password_credentials
     WHERE username IN (${sql(enrollment.existing.username)}, ${sql(enrollment.second.username)})
     UNION ALL
     SELECT username
     FROM staff_password_enrollments
     WHERE username IN (${sql(enrollment.existing.username)}, ${sql(enrollment.second.username)})
       AND status = 'pending_setup'
     UNION ALL
     SELECT email AS username
     FROM staff_profiles
     WHERE email = ${sql(enrollment.second.email)} COLLATE NOCASE`,
  );
  if (rows.length > 0) {
    throw new Error(
      "A requested username or the second administrator email is already in use. No changes were made.",
    );
  }
}

function createTemporaryPassword() {
  return `Lcm!${randomBytes(14).toString("base64url")}#${randomBytes(4).toString("hex")}`;
}

function createPasswordCredential(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32, {
    N: 65_536,
    r: 8,
    p: 2,
    maxmem: 80 * 1024 * 1024,
  });
  return {
    passwordHash: hash.toString("base64url"),
    passwordSalt: salt.toString("base64url"),
  };
}

function buildBootstrapSql({
  enrollment,
  existingAdministratorId,
  secondAdministratorId,
  existingCredential,
  secondCredential,
  createdAt,
  expiresAt,
}) {
  const existingAuditLogId = randomUUID();
  const secondRoleAssignmentId = randomUUID();
  const secondAuditLogId = randomUUID();
  const correlationId = randomUUID();
  return `

UPDATE staff_profiles
SET display_name = ${sql(enrollment.existing.displayName)}, updated_at = ${sql(createdAt)}
WHERE id = ${sql(existingAdministratorId)}
  AND email = ${sql(enrollment.existing.email)} COLLATE NOCASE
  AND account_status = 'active';

INSERT INTO staff_password_credentials (
  staff_id, username, password_hash, password_salt, password_version,
  must_change_password, password_expires_at, password_changed_at,
  created_by, created_at, updated_at
) VALUES (
  ${sql(existingAdministratorId)}, ${sql(enrollment.existing.username)},
  ${sql(existingCredential.passwordHash)}, ${sql(existingCredential.passwordSalt)}, 1,
  1, ${sql(expiresAt)}, ${sql(createdAt)}, ${sql(existingAdministratorId)},
  ${sql(createdAt)}, ${sql(createdAt)}
);

INSERT INTO staff_password_enrollments (
  staff_id, email, username, display_name, initial_role_code, issued_by,
  status, expires_at, created_at
) VALUES (
  ${sql(secondAdministratorId)}, ${sql(enrollment.second.email)},
  ${sql(enrollment.second.username)}, ${sql(enrollment.second.displayName)},
  'system_admin', ${sql(existingAdministratorId)}, 'pending_setup',
  ${sql(expiresAt)}, ${sql(createdAt)}
);

INSERT INTO staff_profiles (
  id, access_subject, email, display_name, account_status, created_at, updated_at
) VALUES (
  ${sql(secondAdministratorId)}, ${sql(`password:${secondAdministratorId}`)},
  ${sql(enrollment.second.email)}, ${sql(enrollment.second.displayName)},
  'invited', ${sql(createdAt)}, ${sql(createdAt)}
);

INSERT INTO staff_roles (
  id, staff_id, role_code, assigned_by, assignment_reason, assigned_at
) VALUES (
  ${sql(secondRoleAssignmentId)}, ${sql(secondAdministratorId)}, 'system_admin',
  ${sql(existingAdministratorId)}, ${sql(enrollment.assignmentReason)}, ${sql(createdAt)}
);

INSERT INTO staff_password_credentials (
  staff_id, username, password_hash, password_salt, password_version,
  must_change_password, password_expires_at, password_changed_at,
  created_by, created_at, updated_at
) VALUES (
  ${sql(secondAdministratorId)}, ${sql(enrollment.second.username)},
  ${sql(secondCredential.passwordHash)}, ${sql(secondCredential.passwordSalt)}, 1,
  1, ${sql(expiresAt)}, ${sql(createdAt)}, ${sql(existingAdministratorId)},
  ${sql(createdAt)}, ${sql(createdAt)}
);

INSERT INTO audit_logs (
  id, actor_staff_id, actor_type, action, resource_type, resource_id,
  sensitivity, metadata_json, correlation_id, created_at
) VALUES
  (
    ${sql(existingAuditLogId)}, ${sql(existingAdministratorId)}, 'system',
    'staff.password_initial_enrollment_issued', 'staff_profile',
    ${sql(existingAdministratorId)}, 'security',
    ${sql(JSON.stringify({ username: enrollment.existing.username, path: "controlled_preview_cutover" }))},
    ${sql(correlationId)}, ${sql(createdAt)}
  ),
  (
    ${sql(secondAuditLogId)}, ${sql(existingAdministratorId)}, 'system',
    'staff.password_initial_enrollment_issued', 'staff_profile',
    ${sql(secondAdministratorId)}, 'security',
    ${sql(JSON.stringify({ username: enrollment.second.username, role: "system_admin", path: "controlled_preview_cutover" }))},
    ${sql(correlationId)}, ${sql(createdAt)}
  );

`;
}

function sql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function executeJson(command) {
  const output = await runWrangler([
    "d1",
    "execute",
    "DB",
    "--remote",
    "--env",
    previewEnvironment,
    "--json",
    "--command",
    command,
  ]);
  const parsed = JSON.parse(output.stdout);
  return parsed?.[0]?.results ?? [];
}

async function assertPreviewConfiguration() {
  const configuration = await readFile(
    join(repositoryRoot, "wrangler.jsonc"),
    "utf8",
  );
  const requiredValues = [
    '"preview"',
    '"name": "lcm-website"',
    '"database_name": "lifechangers-ministry-preview"',
    '"STAFF_AUTH_MODE": "password"',
  ];
  if (!requiredValues.every((value) => configuration.includes(value))) {
    throw new Error(
      "The normal preview configuration is missing or is not in the approved password-authentication state.",
    );
  }
}

function runWrangler(argumentsList) {
  const executable = process.execPath;
  const executableArguments = [
    join(repositoryRoot, "node_modules", "wrangler", "bin", "wrangler.js"),
    ...argumentsList,
  ];
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(executable, executableArguments, {
      cwd: repositoryRoot,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.once("error", rejectPromise);
    child.once("exit", (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
      } else {
        rejectPromise(
          new Error(
            `Wrangler exited with code ${code ?? "unknown"}. ${[stderr, stdout]
              .join("\n")
              .trim()}`,
          ),
        );
      }
    });
  });
}
