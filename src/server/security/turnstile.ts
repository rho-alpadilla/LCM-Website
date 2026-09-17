import { z } from "zod";

import { ApplicationError } from "@/lib/errors/application-error";

const verificationSchema = z.object({
  success: z.boolean(),
  hostname: z.string().optional(),
  action: z.string().optional(),
});

type TurnstileVerificationInput = {
  token: string;
  remoteIp: string | null;
  secret: string | undefined;
  allowedHostnames: string | undefined;
  expectedAction: string;
  fetcher?: typeof fetch;
};

export async function verifyTurnstile(input: TurnstileVerificationInput) {
  const hostnames = new Set(
    (input.allowedHostnames ?? "")
      .split(",")
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean),
  );
  if (
    !input.secret ||
    !input.token ||
    input.token.length > 2048 ||
    hostnames.size === 0
  ) {
    throw new ApplicationError(
      "FORBIDDEN",
      "The verification could not be completed.",
    );
  }

  const body = new URLSearchParams({
    secret: input.secret,
    response: input.token,
  });
  if (input.remoteIp) body.set("remoteip", input.remoteIp);

  let response: Response;
  try {
    response = await (input.fetcher ?? fetch)(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch {
    throw new ApplicationError(
      "FORBIDDEN",
      "The verification could not be completed.",
    );
  }
  if (!response.ok)
    throw new ApplicationError(
      "FORBIDDEN",
      "The verification could not be completed.",
    );

  const result = verificationSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (
    !result.success ||
    !result.data.success ||
    result.data.action !== input.expectedAction ||
    !result.data.hostname ||
    !hostnames.has(result.data.hostname.toLowerCase())
  ) {
    throw new ApplicationError(
      "FORBIDDEN",
      "The verification could not be completed.",
    );
  }
}

export async function anonymousRateLimitKey(headers: Headers) {
  const address = headers.get("cf-connecting-ip")?.trim() || "unknown";
  const agent = headers.get("user-agent")?.slice(0, 256) || "unknown";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${address}|${agent}`),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
