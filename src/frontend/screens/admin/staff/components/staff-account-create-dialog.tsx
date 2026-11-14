"use client";

import { type ReactNode, useRef, useState } from "react";

import { createPasswordStaffAction } from "@/backend/actions/staff";
import { generateTemporaryPassword } from "@/frontend/lib/temporary-password";
import { roleOptions } from "@/shared/staff/roles";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100";

export function StaffAccountCreateDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  function openDialog() {
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function createTemporaryPassword() {
    setTemporaryPassword(generateTemporaryPassword());
    setIsPasswordVisible(true);
    setCopyMessage(
      "A 20-character temporary password is ready to share privately.",
    );
  }

  async function copyTemporaryPassword() {
    if (!temporaryPassword) return;

    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopyMessage(
        "Temporary password copied. Share it only in a verified private conversation.",
      );
    } catch {
      setCopyMessage(
        "Copy was unavailable. Select the password and share it privately.",
      );
    }
  }

  return (
    <>
      <button
        className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white shadow-sm transition-transform duration-150 ease-out active:scale-[0.97]"
        onClick={openDialog}
        type="button"
      >
        Add staff
      </button>
      <dialog
        aria-labelledby="add-staff-title"
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(100%-2rem,46rem)] rounded-3xl border border-slate-200 bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/55"
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        ref={dialogRef}
      >
        <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold tracking-[0.18em] text-blue-800 uppercase">
                Staff access
              </p>
              <h2 className="mt-2 text-2xl font-black" id="add-staff-title">
                Add staff account
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Create the account here, then give the temporary password to the
                person privately. It cannot be recovered from the website.
              </p>
            </div>
            <button
              aria-label="Close add staff form"
              className="rounded-lg px-3 py-2 font-bold text-slate-700 transition-colors hover:bg-slate-100 focus:ring-4 focus:ring-blue-100 focus:outline-none"
              onClick={closeDialog}
              type="button"
            >
              Close
            </button>
          </div>

          <form
            action={createPasswordStaffAction}
            className="mt-7 grid gap-5 sm:grid-cols-2"
          >
            <Field label="Display name">
              <input
                className={inputClass}
                maxLength={120}
                minLength={2}
                name="displayName"
                required
              />
            </Field>
            <Field label="Contact email">
              <input
                className={inputClass}
                maxLength={254}
                name="email"
                required
                type="email"
              />
            </Field>
            <Field label="Username">
              <input
                autoCapitalize="none"
                autoComplete="username"
                className={inputClass}
                maxLength={64}
                minLength={3}
                name="username"
                required
              />
            </Field>
            <div>
              <label
                className="block font-semibold text-slate-900"
                htmlFor="temporary-password"
              >
                Temporary password
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  autoComplete="new-password"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                  id="temporary-password"
                  minLength={15}
                  name="temporaryPassword"
                  onChange={(event) => {
                    setTemporaryPassword(event.target.value);
                    setCopyMessage("");
                  }}
                  required
                  type={isPasswordVisible ? "text" : "password"}
                  value={temporaryPassword}
                />
                <button
                  className="rounded-xl border border-blue-800 px-4 py-3 font-bold text-blue-800 transition-transform duration-150 ease-out active:scale-[0.97]"
                  onClick={createTemporaryPassword}
                  type="button"
                >
                  Generate
                </button>
                <button
                  aria-pressed={isPasswordVisible}
                  className="rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-800 transition-transform duration-150 ease-out active:scale-[0.97]"
                  onClick={() => setIsPasswordVisible((visible) => !visible)}
                  type="button"
                >
                  {isPasswordVisible ? "Hide" : "Show"}
                </button>
              </div>
              {temporaryPassword ? (
                <button
                  className="mt-2 text-sm font-semibold text-blue-800 underline underline-offset-4"
                  onClick={copyTemporaryPassword}
                  type="button"
                >
                  Copy temporary password
                </button>
              ) : null}
              <p
                aria-live="polite"
                className="mt-2 text-sm leading-6 text-slate-600"
              >
                {copyMessage || "Use Generate for a 20-character password."}
              </p>
            </div>
            <Field label="Church role or title (optional)">
              <input className={inputClass} maxLength={120} name="jobTitle" />
            </Field>
            <Field label="Phone (optional)">
              <input
                className={inputClass}
                maxLength={40}
                name="phone"
                type="tel"
              />
            </Field>
            <Field label="Access role">
              <select className={inputClass} name="roleCode" required>
                {roleOptions.map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assignment reason">
              <input
                className={inputClass}
                maxLength={500}
                name="reason"
                placeholder="Required for System Administrator or Core Leader"
              />
            </Field>
            <Field label="Confirm with your password">
              <input
                autoComplete="current-password"
                className={inputClass}
                minLength={15}
                name="adminPassword"
                required
                type="password"
              />
            </Field>
            <p className="self-end text-sm leading-6 text-slate-600">
              This confirmation protects staff creation if an administrator’s
              device is left unattended.
            </p>
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <button
                className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white transition-transform duration-150 ease-out active:scale-[0.97]"
                type="submit"
              >
                Create staff account
              </button>
              <button
                className="rounded-xl px-5 py-3 font-bold text-slate-700 transition-colors hover:bg-slate-100"
                onClick={closeDialog}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block font-semibold text-slate-900">
      {label}
      {children}
    </label>
  );
}
