import { NextResponse } from "next/server";
import { z } from "zod";

import { staffPasswordCookieName } from "@/shared/auth/password-authentication";
import { authenticateStaffPassword } from "@/backend/auth/password-authentication";
import { requireStaffPasswordCloudflareBindings } from "@/backend/cloudflare/bindings";
import { applicationErrorResponse } from "@/backend/http/responses";
import {
  readLimitedJson,
  requireSameOrigin,
} from "@/backend/http/request-security";

const loginRequestSchema = z.object({
  username: z.string().max(128),
  password: z.string().max(128),
});

export async function POST(request: Request) {
  let stage = "same_origin";
  try {
    requireSameOrigin(request);
    stage = "bindings";
    const environment = await requireStaffPasswordCloudflareBindings();
    stage = "request";
    const body = loginRequestSchema.parse(
      await readLimitedJson(request, 1_024),
    );
    stage = "authentication";
    const result = await authenticateStaffPassword(
      {
        ...body,
        sourceIdentifier: request.headers.get("cf-connecting-ip") ?? "unknown",
      },
      environment,
    );
    stage = "session_response";
    const response = NextResponse.json(
      { authenticated: true },
      {
        status: 200,
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      },
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
    console.error(
      JSON.stringify({
        event: "staff_password_login_failed",
        stage,
        errorName: error instanceof Error ? error.name : "UnknownError",
      }),
    );
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Enter a valid username and password.",
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
