import { NextResponse } from "next/server";

import { staffPasswordCookieName } from "@/shared/auth/password-authentication";
import { signOutPasswordSession } from "@/backend/auth/password-authentication";
import { requireStaffPasswordCloudflareBindings } from "@/backend/cloudflare/bindings";
import { applicationErrorResponse } from "@/backend/http/responses";
import { requireSameOrigin } from "@/backend/http/request-security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const environment = await requireStaffPasswordCloudflareBindings();
    await signOutPasswordSession(request.headers, environment);
    const response = NextResponse.json(
      { signedOut: true },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
    response.cookies.set({
      name: staffPasswordCookieName(environment),
      value: "",
      httpOnly: true,
      sameSite: "strict",
      secure: environment.APP_ENVIRONMENT !== "local",
      path: "/",
      maxAge: 0,
      priority: "high",
    });
    return response;
  } catch (error) {
    return applicationErrorResponse(error);
  }
}
