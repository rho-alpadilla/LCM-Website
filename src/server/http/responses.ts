import { ApplicationError } from "@/lib/errors/application-error";

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
} as const;

export function privateJsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: noStoreHeaders });
}

export function applicationErrorResponse(error: unknown) {
  if (error instanceof ApplicationError) {
    const status =
      error.code === "AUTHENTICATION_REQUIRED"
        ? 401
        : error.code === "FORBIDDEN"
          ? 403
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
