import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
