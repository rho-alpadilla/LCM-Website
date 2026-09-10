import Link from "next/link";

import { AuthCard } from "@/components/admin/auth-card";
import { loginAction } from "@/features/auth/actions";
import { isSupabaseConfigured } from "@/lib/config/env";

const errorMessages: Record<string, string> = {
  account_disabled: "This staff account is suspended or disabled.",
  configuration: "Authentication is not configured in this environment yet.",
  invalid_credentials: "The email or password is incorrect.",
  invalid_input: "Enter a valid email address and password.",
  invalid_link: "That sign-in link is invalid or has expired.",
  session: "Your session could not be started. Please try again.",
};

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const parameters = await searchParams;
  const errorCode =
    typeof parameters.error === "string" ? parameters.error : "";
  const messageCode =
    typeof parameters.message === "string" ? parameters.message : "";

  return (
    <AuthCard
      description="This area is only for authorized church staff. Public visitors do not need an account."
      eyebrow="Staff access"
      title="Welcome back"
    >
      {errorCode ? (
        <p
          className="mb-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800"
          role="alert"
        >
          {errorMessages[errorCode] ?? "Sign-in could not be completed."}
        </p>
      ) : null}
      {messageCode === "signed_out" ? (
        <p
          className="mb-5 rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-800"
          role="status"
        >
          You have been signed out safely.
        </p>
      ) : null}
      {!isSupabaseConfigured ? (
        <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Development notice: add the Supabase values from{" "}
          <code>.env.example</code> to enable sign-in.
        </p>
      ) : null}
      <form action={loginAction} className="space-y-5">
        <fieldset className="space-y-5" disabled={!isSupabaseConfigured}>
          <div>
            <label className="font-semibold text-slate-900" htmlFor="email">
              Email address
            </label>
            <input
              autoComplete="email"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
              id="email"
              maxLength={254}
              name="email"
              required
              type="email"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-900" htmlFor="password">
              Password
            </label>
            <input
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
              id="password"
              maxLength={128}
              name="password"
              required
              type="password"
            />
          </div>
          <button
            className="w-full rounded-xl bg-blue-800 px-5 py-3 font-bold text-white"
            type="submit"
          >
            Sign in
          </button>
        </fieldset>
      </form>
      <Link className="mt-6 inline-block font-semibold text-blue-800" href="/">
        Return to the public website
      </Link>
    </AuthCard>
  );
}
