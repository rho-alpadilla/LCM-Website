import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getPasswordAuthenticationService,
  readPasswordSessionToken,
} from "@/backend/auth/password-authentication";
import { requireStaffPasswordCloudflareBindings } from "@/backend/cloudflare/bindings";
import { applicationErrorResponse } from "@/backend/http/responses";
import {
  readLimitedJson,
  requireSameOrigin,
} from "@/backend/http/request-security";
import { staffPasswordCookieName } from "@/shared/auth/password-authentication";

const requestSchema = z.object({
  newPassword: z.string().max(128),
});

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const environment = await requireStaffPasswordCloudflareBindings();
    const service = getPasswordAuthenticationService(environment);
    const sessionToken = readPasswordSessionToken(request.headers, environment);
    const session = sessionToken
      ? await service.resolveSession(sessionToken)
      : null;
    if (!session?.mustChangePassword) {
      return NextResponse.json(
        {
          error: {
            code: "AUTHENTICATION_REQUIRED",
            message: "Sign in with a temporary password to complete setup.",
          },
        },
        {
          status: 401,
          headers: { "Cache-Control": "private, no-store, max-age=0" },
        },
      );
    }

    const input = requestSchema.parse(await readLimitedJson(request, 1_024));
    const result = await service.completeTemporaryPasswordFromSession({
      ...input,
      staffId: session.staffId,
      passwordVersion: session.passwordVersion,
    });
    const response = NextResponse.json(
      { completed: true },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
    response.cookies.set({
      name: staffPasswordCookieName(environment),
      value: result.sessionToken,
      httpOnly: true,
      sameSite: "strict",
      secure: environment.APP_ENVIRONMENT !== "local",
      path: "/",
      expires: result.expiresAt,
      priority: "high",
    });
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Use a personal password of at least 15 characters.",
          },
        },
        {
          status: 400,
          headers: { "Cache-Control": "private, no-store, max-age=0" },
        },
      );
    }
    return applicationErrorResponse(error);
  }
}
