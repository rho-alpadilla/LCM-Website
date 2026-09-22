import "server-only";

import { z } from "zod";

import { ApplicationError } from "@/shared/errors/application-error";

const cloudflareApiBaseUrl = "https://api.cloudflare.com/client/v4";
const accountIdPattern = /^[a-f0-9]{32}$/i;
const policyIdPattern =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

const configurationSchema = z.object({
  accountId: z.string().trim().regex(accountIdPattern),
  policyId: z.string().trim().regex(policyIdPattern),
  apiToken: z.string().trim().min(20).max(1024),
});

const emailSchema = z
  .string()
  .trim()
  .max(254)
  .pipe(z.email())
  .transform((email) => email.toLowerCase());

const providerResponseSchema = z.object({
  success: z.boolean(),
  result: z.unknown().optional(),
  errors: z
    .array(
      z.object({
        code: z.number().int().nonnegative().optional(),
      }),
    )
    .optional(),
});

const policySchema = z.object({
  name: z.string().trim().min(1).max(255),
  decision: z.literal("allow"),
  include: z.array(z.unknown()).min(1),
  exclude: z.array(z.unknown()).optional(),
  require: z.array(z.unknown()).optional(),
  session_duration: z.string().trim().min(1).max(255).optional(),
});

export type StaffAccessDirectoryEnvironment = {
  APP_ENVIRONMENT?: unknown;
  CLOUDFLARE_ACCESS_ACCOUNT_ID?: unknown;
  CLOUDFLARE_ACCESS_POLICY_ID?: unknown;
  CLOUDFLARE_ACCESS_API_TOKEN?: unknown;
};

export type StaffAccessDirectory = {
  allowEmail(email: string): Promise<{ added: boolean }>;
  removeEmail(email: string): Promise<{ removed: boolean }>;
};

type Fetcher = typeof fetch;
type Configuration = z.infer<typeof configurationSchema>;
type ManagedPolicy = {
  name: string;
  emails: string[];
  exclude?: unknown[];
  require?: unknown[];
  sessionDuration?: string;
};

/**
 * Local development never calls Cloudflare's control-plane API. Preview and
 * production instead require a dedicated, email-only reusable Access policy.
 */
export function createStaffAccessDirectory(
  environment: StaffAccessDirectoryEnvironment,
  fetcher: Fetcher = fetch,
): StaffAccessDirectory {
  if (environment.APP_ENVIRONMENT === "local") {
    return localDirectory;
  }

  const configuration = configurationSchema.safeParse({
    accountId: environment.CLOUDFLARE_ACCESS_ACCOUNT_ID,
    policyId: environment.CLOUDFLARE_ACCESS_POLICY_ID,
    apiToken: environment.CLOUDFLARE_ACCESS_API_TOKEN,
  });

  if (!configuration.success) {
    throw new ApplicationError(
      "INTERNAL_ERROR",
      "Staff account automation is not configured.",
    );
  }

  return new CloudflareStaffAccessDirectory(configuration.data, fetcher);
}

class CloudflareStaffAccessDirectory implements StaffAccessDirectory {
  constructor(
    private readonly configuration: Configuration,
    private readonly fetcher: Fetcher,
  ) {}

  async allowEmail(rawEmail: string) {
    const email = emailSchema.parse(rawEmail);
    const policy = await this.getManagedPolicy();
    if (policy.emails.includes(email)) return { added: false };

    await this.updateManagedPolicy(policy, [...policy.emails, email]);
    return { added: true };
  }

  async removeEmail(rawEmail: string) {
    const email = emailSchema.parse(rawEmail);
    const policy = await this.getManagedPolicy();
    if (!policy.emails.includes(email)) return { removed: false };

    const remainingEmails = policy.emails.filter((item) => item !== email);
    if (!remainingEmails.length) {
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "The final staff email cannot be removed from Cloudflare Access.",
      );
    }

    await this.updateManagedPolicy(policy, remainingEmails);
    return { removed: true };
  }

  private async getManagedPolicy(): Promise<ManagedPolicy> {
    const result = await this.request(
      "GET",
      `/accounts/${this.configuration.accountId}/access/policies/${this.configuration.policyId}`,
    );
    const parsedPolicy = policySchema.safeParse(result);

    if (!parsedPolicy.success) {
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "The configured Cloudflare Access policy is not a supported staff policy.",
      );
    }

    const emails = parsedPolicy.data.include.map((rule) => {
      const parsedRule = z
        .object({
          email: z.object({ email: emailSchema }),
        })
        .strict()
        .safeParse(rule);
      if (!parsedRule.success) {
        throw new ApplicationError(
          "INTERNAL_ERROR",
          "The configured Cloudflare Access policy must contain only staff email rules.",
        );
      }
      return parsedRule.data.email.email;
    });

    return {
      name: parsedPolicy.data.name,
      emails: [...new Set(emails)].sort(),
      exclude: parsedPolicy.data.exclude,
      require: parsedPolicy.data.require,
      sessionDuration: parsedPolicy.data.session_duration,
    };
  }

  private async updateManagedPolicy(
    policy: ManagedPolicy,
    rawEmails: string[],
  ) {
    const emails = [
      ...new Set(rawEmails.map((email) => emailSchema.parse(email))),
    ].sort();
    await this.request(
      "PUT",
      `/accounts/${this.configuration.accountId}/access/policies/${this.configuration.policyId}`,
      {
        name: policy.name,
        decision: "allow",
        include: emails.map((email) => ({ email: { email } })),
        ...(policy.exclude ? { exclude: policy.exclude } : {}),
        ...(policy.require ? { require: policy.require } : {}),
        ...(policy.sessionDuration
          ? { session_duration: policy.sessionDuration }
          : {}),
      },
    );
  }

  private async request(
    method: "GET" | "PUT",
    path: string,
    body?: Record<string, unknown>,
  ) {
    let response: Response;
    try {
      response = await this.fetcher(`${cloudflareApiBaseUrl}${path}`, {
        method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.configuration.apiToken}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (cause) {
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "Cloudflare Access could not be reached.",
        cause,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (cause) {
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "Cloudflare Access returned an invalid response.",
        cause,
      );
    }

    const parsed = providerResponseSchema.safeParse(payload);
    if (response.status === 401 || response.status === 403) {
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "Cloudflare Access rejected the staff policy credentials.",
      );
    }
    if (response.status === 404) {
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "The configured Cloudflare Access policy could not be found.",
      );
    }
    if (!response.ok || !parsed.success || !parsed.data.success) {
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "Cloudflare Access could not update the staff policy.",
        {
          providerStatus: response.status,
          providerCode: parsed.success
            ? (parsed.data.errors?.[0]?.code ?? null)
            : null,
        },
      );
    }

    return parsed.data.result;
  }
}

const localDirectory: StaffAccessDirectory = {
  async allowEmail() {
    return { added: false };
  },
  async removeEmail() {
    return { removed: false };
  },
};
