import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getPasswordAuthenticationService,
  readPasswordSessionToken,
} from "@/backend/auth/password-authentication";
import { staffPasswordCookieName } from "@/shared/auth/password-authentication";
import { requireStaffPasswordCloudflareBindings } from "@/backend/cloudflare/bindings";
import { applicationErrorResponse } from "@/backend/http/responses";
import {
  readLimitedJson,
  requireSameOrigin,
} from "@/backend/http/request-security";

const requestSchema = z.object({
  currentPassword: z.string().max(128),
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
    if (!session) {
      return NextResponse.json(
        {
          error: {
            code: "AUTHENTICATION_REQUIRED",
            message: "Sign in again to change your password.",
          },
        },
        {
          status: 401,
          headers: { "Cache-Control": "private, no-store, max-age=0" },
        },
      );
    }
    const input = requestSchema.parse(await readLimitedJson(request, 1_024));
    const result = await service.changeOwnPassword({
      ...input,
      staffId: session.staffId,
      sourceIdentifier: request.headers.get("cf-connecting-ip") ?? "unknown",
    });
    const response = NextResponse.json(
      { changed: true },
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
