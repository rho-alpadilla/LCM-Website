"use client";

import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";

export function FirstPasswordForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("newPassword") !== form.get("confirmPassword")) {
      setError("Your new passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/admin/auth/password/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        username: form.get("username"),
        temporaryPassword: form.get("temporaryPassword"),
        newPassword: form.get("newPassword"),
      }),
    });
    if (response.ok) {
      router.push("/admin");
      router.refresh();
      return;
    }
    setSubmitting(false);
    setError(
      "We could not complete setup. Check the temporary password and try again.",
    );
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      {error ? (
        <p
          className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <Field autoComplete="username" label="Username" name="username" />
      <Field
        autoComplete="one-time-code"
        label="Temporary password"
        name="temporaryPassword"
        type="password"
      />
      <Field
        autoComplete="new-password"
        label="Choose a personal password"
        minLength={15}
        name="newPassword"
        type="password"
      />
      <Field
        autoComplete="new-password"
        label="Confirm personal password"
        minLength={15}
        name="confirmPassword"
        type="password"
      />
      <button
        className="w-full rounded-xl bg-blue-800 px-5 py-3 font-bold text-white disabled:opacity-70"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Completing setup…" : "Save password and continue"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  ...props
}: { label: string; name: string; type?: string } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "name" | "type"
>) {
  return (
    <label className="block font-semibold text-slate-900">
      {label}
      <input
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
        name={name}
        required
        type={type}
        {...props}
      />
    </label>
  );
}
