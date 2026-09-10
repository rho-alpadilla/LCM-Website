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

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
  } catch {
    throw new ApplicationError(
      "VALIDATION_FAILED",
      "The request body must contain valid JSON.",
    );
  }
}
