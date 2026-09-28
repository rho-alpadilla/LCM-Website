"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type FormState = "idle" | "submitting" | "error";

export function PasswordLoginForm() {
  const router = useRouter();
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/auth/password/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
      }),
    });
    if (response.ok) {
      router.push("/admin");
      router.refresh();
      return;
    }
    setState("error");
    setMessage("We could not sign you in. Check your details and try again.");
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      {state === "error" ? (
        <p
          className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800"
          role="alert"
        >
          {message}
        </p>
      ) : null}
      <label className="block font-semibold text-slate-900">
        Username
        <input
          autoCapitalize="none"
          autoComplete="username"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 transition outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
          maxLength={64}
          name="username"
          required
        />
      </label>
      <label className="block font-semibold text-slate-900">
        Password
        <input
          autoComplete="current-password"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 transition outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
          maxLength={128}
          name="password"
          required
          type="password"
        />
      </label>
      <button
        className="w-full rounded-xl bg-blue-800 px-5 py-3 font-bold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={state === "submitting"}
        type="submit"
      >
        {state === "submitting" ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-sm leading-6 text-slate-600">
        If you cannot sign in, ask a System Administrator for help. Password
        recovery is handled in person; this website does not send reset emails.
      </p>
      <a
        className="block text-sm font-semibold text-blue-800"
        href="/admin/first-password"
      >
        First time signing in? Set your personal password.
      </a>
    </form>
  );
}
