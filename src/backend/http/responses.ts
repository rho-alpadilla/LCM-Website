import { ApplicationError } from "@/shared/errors/application-error";

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
} as const;

export function privateJsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: noStoreHeaders });
}

export function applicationErrorResponse(error: unknown) {
  // Errors are kept generic for visitors, but a compact server-side record makes
  // deployment issues diagnosable without logging request bodies or credentials.
  console.error(
    JSON.stringify({
      event: "website_request_failed",
      errorCode:
        error instanceof ApplicationError ? error.code : "INTERNAL_ERROR",
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage:
        error instanceof ApplicationError ? error.message : undefined,
    }),
  );

  if (error instanceof ApplicationError) {
    const status =
      error.code === "AUTHENTICATION_REQUIRED"
        ? 401
        : error.code === "FORBIDDEN"
          ? 403
          : error.code === "RATE_LIMITED"
            ? 429
            : error.code === "VALIDATION_FAILED"
              ? 400
              : 500;
    const message =
      status === 500 ? "The request could not be completed." : error.message;

    return privateJsonResponse(
      { error: { code: error.code, message } },
      status,
    );
  }

  return privateJsonResponse(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "The request could not be completed.",
      },
    },
    500,
  );
}
