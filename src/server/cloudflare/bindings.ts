import { getCloudflareContext } from "@opennextjs/cloudflare";

import { ApplicationError } from "@/lib/errors/application-error";

const requiredBindingNames = ["DB", "WEBSITE_FILES"] as const;

type RequiredBindingName = (typeof requiredBindingNames)[number];

export type RequiredCloudflareBindings = Pick<
  CloudflareEnv,
  RequiredBindingName
>;

type D1HealthProbe = {
  prepare(query: string): {
    first<Result>(): Promise<Result | null>;
  };
};

export function validateCloudflareBindings(
  environment: Partial<Record<RequiredBindingName, unknown>>,
): asserts environment is RequiredCloudflareBindings {
  const missingBindings = requiredBindingNames.filter(
    (bindingName) => environment[bindingName] === undefined,
  );

  if (missingBindings.length > 0) {
    throw new ApplicationError(
      "INTERNAL_ERROR",
      "Required Cloudflare bindings are unavailable.",
    );
  }
}

export async function requireCloudflareBindings(): Promise<RequiredCloudflareBindings> {
  const { env } = await getCloudflareContext({ async: true });

  validateCloudflareBindings(env);

  return env;
}

export async function checkD1Connection(
  database: D1HealthProbe,
): Promise<boolean> {
  const result = await database
    .prepare("SELECT 1 AS ready")
    .first<{ ready: number }>();

  return result?.ready === 1;
}
