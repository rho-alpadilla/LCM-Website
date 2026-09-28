"use client";

import Link from "next/link";
import { useState } from "react";

export function TemporaryPasswordReminder({
  expiresAt,
}: {
  expiresAt: string;
}) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  const deadline = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(expiresAt));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-5">
      <section
        aria-describedby="temporary-password-description"
        aria-labelledby="temporary-password-title"
        aria-modal="true"
        className="w-full max-w-md rounded-3xl border border-blue-100 bg-white p-6 shadow-2xl sm:p-8"
        role="dialog"
      >
        <p className="text-xs font-black tracking-[0.18em] text-blue-800 uppercase">
          Password setup
        </p>
        <h2
          className="mt-3 text-2xl font-black text-slate-950"
          id="temporary-password-title"
        >
          Choose your personal password
        </h2>
        <p
          className="mt-3 leading-7 text-slate-600"
          id="temporary-password-description"
        >
          Your temporary password expires on {deadline}. You can continue for
          now, but this account will be temporarily disabled after the deadline
          until a System Administrator reactivates it.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white transition hover:bg-blue-900"
            href="/admin/profile#change-password"
          >
            Set personal password
          </Link>
          <button
            autoFocus
            className="rounded-xl px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-100"
            onClick={() => setOpen(false)}
            type="button"
          >
            Do this later
          </button>
        </div>
      </section>
    </div>
  );
}
