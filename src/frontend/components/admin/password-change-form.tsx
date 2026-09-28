"use client";

import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";

export function PasswordChangeForm({
  temporaryPasswordExpiresAt,
}: {
  temporaryPasswordExpiresAt?: string | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("newPassword") !== form.get("confirmPassword")) {
      setMessage("Your new passwords do not match.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    const response = await fetch("/api/admin/auth/password/change", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        currentPassword: form.get("currentPassword"),
        newPassword: form.get("newPassword"),
      }),
    });
    if (response.ok) {
      setMessage(
        "Your password was changed and other website sessions were signed out.",
      );
      setSubmitting(false);
      event.currentTarget.reset();
      router.refresh();
      return;
    }
    setSubmitting(false);
    setMessage(
      "We could not change your password. Check your current password and try again.",
    );
  }

  return (
    <form
      className="mt-8 border-t border-slate-200 pt-7"
      id="change-password"
      onSubmit={submit}
    >
      <h2 className="text-xl font-black text-slate-950">
        {temporaryPasswordExpiresAt
          ? "Set your personal password"
          : "Change password"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {temporaryPasswordExpiresAt
          ? "Use your temporary password as the current password. Your temporary access ends after its three-day setup period."
          : "Use at least 15 characters. Your password is never visible to administrators."}
      </p>
      {message ? (
        <p
          className="mt-4 rounded-xl bg-slate-100 p-3 text-sm font-semibold text-slate-800"
          role="status"
        >
          {message}
        </p>
      ) : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field
          autoComplete="current-password"
          label="Current password"
          name="currentPassword"
        />
        <Field
          autoComplete="new-password"
          label="New password"
          minLength={15}
          name="newPassword"
        />
        <Field
          autoComplete="new-password"
          label="Confirm new password"
          minLength={15}
          name="confirmPassword"
        />
      </div>
      <button
        className="mt-5 rounded-xl bg-blue-800 px-5 py-3 font-bold text-white disabled:opacity-70"
        disabled={submitting}
        type="submit"
      >
        {submitting
          ? "Changing password…"
          : temporaryPasswordExpiresAt
            ? "Save personal password"
            : "Change password"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  ...props
}: { label: string; name: string } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "name"
>) {
  return (
    <label className="block font-semibold text-slate-900">
      {label}
      <input
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
        name={name}
        required
        type="password"
        {...props}
      />
    </label>
  );
}
