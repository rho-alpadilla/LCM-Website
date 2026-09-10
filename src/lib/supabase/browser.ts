"use client";

import { createBrowserClient } from "@supabase/ssr";

import { requirePublicSupabaseEnvironment } from "@/lib/config/env";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createBrowserSupabaseClient() {
  if (!browserClient) {
    const environment = requirePublicSupabaseEnvironment();
    browserClient = createBrowserClient(
      environment.NEXT_PUBLIC_SUPABASE_URL,
      environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
  }

  return browserClient;
}
