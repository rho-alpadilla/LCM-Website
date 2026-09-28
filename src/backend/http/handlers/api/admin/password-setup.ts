import { NextResponse } from "next/server";
import { z } from "zod";

import { staffPasswordCookieName } from "@/shared/auth/password-authentication";
import { requireStaffPasswordCloudflareBindings } from "@/backend/cloudflare/bindings";
import { applicationErrorResponse } from "@/backend/http/responses";
import {
  readLimitedJson,
  requireSameOrigin,
} from "@/backend/http/request-security";
import { getPasswordAuthenticationService } from "@/backend/auth/password-authentication";

const requestSchema = z.object({
  username: z.string().max(128),
  temporaryPassword: z.string().max(128),
  newPassword: z.string().max(128),
});

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const environment = await requireStaffPasswordCloudflareBindings();
    const input = requestSchema.parse(await readLimitedJson(request, 1_024));
    const result = await getPasswordAuthenticationService(
      environment,
    ).completeTemporaryPassword({
      ...input,
      sourceIdentifier: request.headers.get("cf-connecting-ip") ?? "unknown",
    });
    const response = NextResponse.json(
      { authenticated: true },
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
            message: "Enter valid password details.",
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
