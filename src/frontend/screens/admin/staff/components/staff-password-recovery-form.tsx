"use client";

import { useState } from "react";

import { resetStaffPasswordAction } from "@/backend/actions/staff";
import { generateTemporaryPassword } from "@/frontend/lib/temporary-password";

type Props = {
  staffId: string;
  username: string;
};

export function StaffPasswordRecoveryForm({ staffId, username }: Props) {
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  function createTemporaryPassword() {
    setTemporaryPassword(generateTemporaryPassword());
    setIsPasswordVisible(true);
    setCopyMessage("A new temporary password is ready. Share it privately.");
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
    <form action={resetStaffPasswordAction} className="grid gap-4">
      <input name="staffId" type="hidden" value={staffId} />
      <div>
        <h4 className="font-black text-slate-950">Reset access</h4>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Reset <span className="font-semibold">@{username}</span> with a
          short-lived temporary password. This automatically signs the account
          out on every device.
        </p>
      </div>

      <label className="block font-semibold text-slate-900">
        Temporary password
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            autoComplete="new-password"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
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
            className="rounded-xl border border-blue-800 px-4 py-3 font-bold text-blue-800"
            onClick={createTemporaryPassword}
            type="button"
          >
            Generate
          </button>
          <button
            aria-pressed={isPasswordVisible}
            className="rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-800"
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            type="button"
          >
            {isPasswordVisible ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      {temporaryPassword ? (
        <button
          className="w-fit text-sm font-semibold text-blue-800 underline underline-offset-4"
          onClick={copyTemporaryPassword}
          type="button"
        >
          Copy temporary password
        </button>
      ) : null}
      <p aria-live="polite" className="text-sm leading-6 text-slate-600">
        {copyMessage ||
          "Generate a 20-character password instead of making one yourself."}
      </p>

      <label className="block font-semibold text-slate-900">
        Recovery reason
        <select
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
          defaultValue="Owner confirmed forgotten-password recovery."
          name="reason"
        >
          <option>Owner confirmed forgotten-password recovery.</option>
          <option>Staff identity confirmed in person.</option>
          <option>Possible account compromise was reported.</option>
          <option>Staff member requested access recovery.</option>
        </select>
      </label>

      <label className="block font-semibold text-slate-900">
        Confirm with your administrator password
        <input
          autoComplete="current-password"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
          minLength={15}
          name="adminPassword"
          required
          type="password"
        />
      </label>

      <button
        className="rounded-xl bg-blue-800 px-4 py-3 font-bold text-white"
        type="submit"
      >
        Reset access and sign out devices
      </button>
    </form>
  );
}
