import { getCloudflareContext } from "@opennextjs/cloudflare";

import { ApplicationError } from "@/shared/errors/application-error";

const requiredBindingNames = [
  "DB",
  "WEBSITE_FILES",
  "ACCESS_TEAM_DOMAIN",
  "ACCESS_AUD",
  "TURNSTILE_HOSTNAMES",
] as const;

type RequiredBindingName = (typeof requiredBindingNames)[number];

export type RequiredCloudflareBindings = Pick<
  CloudflareEnv,
  RequiredBindingName
>;

export type PrayerCloudflareBindings = RequiredCloudflareBindings &
  Pick<CloudflareEnv, "PRAYER_SUBMISSION_RATE_LIMITER"> & {
    TURNSTILE_SECRET?: string;
  };

export type PayMongoCloudflareBindings = RequiredCloudflareBindings &
  Pick<CloudflareEnv, "GIVING_CHECKOUT_RATE_LIMITER"> & {
    TURNSTILE_SECRET?: string;
    PAYMONGO_SECRET_KEY?: string;
    PAYMONGO_WEBHOOK_SECRET?: string;
    PAYMONGO_MODE?: "test" | "live";
  };

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

export async function requirePrayerCloudflareBindings(): Promise<PrayerCloudflareBindings> {
  const { env } = await getCloudflareContext({ async: true });
  validateCloudflareBindings(env);
  if (!env.PRAYER_SUBMISSION_RATE_LIMITER) {
    throw new ApplicationError(
      "INTERNAL_ERROR",
      "Prayer submission protection is unavailable.",
    );
  }
  return env as PrayerCloudflareBindings;
}

export async function requirePayMongoCloudflareBindings(): Promise<PayMongoCloudflareBindings> {
  const { env } = await getCloudflareContext({ async: true });
  validateCloudflareBindings(env);
  if (!env.GIVING_CHECKOUT_RATE_LIMITER) {
    throw new ApplicationError(
      "INTERNAL_ERROR",
      "Giving checkout protection is unavailable.",
    );
  }
  return env as PayMongoCloudflareBindings;
}

export async function checkD1Connection(
  database: D1HealthProbe,
): Promise<boolean> {
  const result = await database
    .prepare("SELECT 1 AS ready")
    .first<{ ready: number }>();

  return result?.ready === 1;
}
