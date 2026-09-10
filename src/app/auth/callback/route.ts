import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { safeInternalPath } from "@/features/auth/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const supportedOtpTypes = new Set<EmailOtpType>([
  "invite",
  "recovery",
  "email",
  "email_change",
]);

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const rawType = request.nextUrl.searchParams.get(
    "type",
  ) as EmailOtpType | null;
  const nextPath = safeInternalPath(request.nextUrl.searchParams.get("next"));
  const supabase = await createServerSupabaseClient();

  let error: Error | null = null;

  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && rawType && supportedOtpTypes.has(rawType)) {
    ({ error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: rawType,
    }));
  } else {
    error = new Error("Missing or unsupported authentication callback values");
  }

  if (error) {
    return NextResponse.redirect(
      new URL("/admin/login?error=invalid_link", request.url),
    );
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
