import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/config/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const staffContextSchema = z.object({
  id: z.uuid(),
  display_name: z.string(),
  account_status: z.enum(["invited", "active", "suspended", "disabled"]),
  must_enroll_mfa: z.boolean(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
});

export type StaffContext = z.infer<typeof staffContextSchema>;

export async function getStaffAuthState() {
  if (!isSupabaseConfigured) return { kind: "unconfigured" as const };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { kind: "anonymous" as const, supabase };

  const [{ data: assurance }, { data: context, error: contextError }] =
    await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.rpc("get_my_staff_context"),
    ]);

  const parsedContext = contextError
    ? null
    : (staffContextSchema.safeParse(context).data ?? null);

  return {
    kind: "authenticated" as const,
    supabase,
    user,
    context: parsedContext,
    assuranceLevel: assurance?.currentLevel ?? "aal1",
  };
}

export async function requireActiveStaffSession() {
  const state = await getStaffAuthState();

  if (state.kind === "unconfigured") {
    redirect("/admin/login?error=configuration");
  }
  if (state.kind === "anonymous") redirect("/admin/login");
  const context = state.context;
  if (!context) redirect("/admin/bootstrap");
  if (context.account_status === "invited") {
    redirect("/admin/set-password");
  }
  if (context.account_status !== "active") {
    redirect("/admin/access-denied");
  }
  if (state.assuranceLevel !== "aal2" || context.must_enroll_mfa) {
    redirect("/admin/mfa");
  }
  if (!context.permissions.includes("admin.access")) {
    redirect("/admin/access-denied");
  }

  return { ...state, context };
}
