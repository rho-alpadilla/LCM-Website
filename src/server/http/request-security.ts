import { ApplicationError } from "@/lib/errors/application-error";

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");

  let matches = false;
  try {
    matches = Boolean(
      origin && new URL(origin).origin === new URL(request.url).origin,
    );
  } catch {
    matches = false;
  }

  if (!matches) {
    throw new ApplicationError(
      "FORBIDDEN",
      "This request must come from the administration website.",
    );
  }
}

/**
 * Keeps externally hosted checkout return URLs on a hostname the church has
 * explicitly configured. This avoids trusting a user-controlled Host header.
 */
export function requireConfiguredRequestHostname(
  request: Request,
  allowedHostnames: string | undefined,
) {
  const hostnames = new Set(
    (allowedHostnames ?? "")
      .split(",")
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean),
  );
  const hostname = new URL(request.url).hostname.toLowerCase();

  if (!hostnames.has(hostname)) {
    throw new ApplicationError(
      "FORBIDDEN",
      "This request hostname is not configured for secure checkout.",
    );
  }
}

export async function readLimitedJson(
  request: Request,
  maximumBytes = 8_192,
): Promise<unknown> {
  if (!request.body) {
    throw new ApplicationError(
      "VALIDATION_FAILED",
      "A request body is required.",
    );
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw new ApplicationError(
          "VALIDATION_FAILED",
          "The request body is too large.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  try {
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        concatenateChunks(chunks, totalBytes),
      ),
    );
  } catch {
    throw new ApplicationError(
      "VALIDATION_FAILED",
      "The request body must contain valid JSON.",
    );
  }
}

export async function readLimitedText(
  request: Request,
  maximumBytes = 8_192,
): Promise<string> {
  if (!request.body) {
    throw new ApplicationError(
      "VALIDATION_FAILED",
      "A request body is required.",
    );
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw new ApplicationError(
          "VALIDATION_FAILED",
          "The request body is too large.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(
      concatenateChunks(chunks, totalBytes),
    );
  } catch {
    throw new ApplicationError(
      "VALIDATION_FAILED",
      "The request body must be valid UTF-8.",
    );
  }
}

function concatenateChunks(chunks: Uint8Array[], totalBytes: number) {
  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
