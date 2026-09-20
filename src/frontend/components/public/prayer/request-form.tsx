"use client";

import Script from "next/script";
import { FormEvent, useRef, useState } from "react";

import { submitPrayerRequest } from "@/frontend/api/prayer";

type Status = {
  kind: "idle" | "submitting" | "success" | "error";
  message: string;
};

export function PrayerRequestForm({ siteKey }: { siteKey: string | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!siteKey || status.kind === "submitting") return;
    setStatus({ kind: "submitting", message: "Submitting your request…" });
    const form = new FormData(event.currentTarget);
    try {
      const message = await submitPrayerRequest(form);
      formRef.current?.reset();
      setStatus({
        kind: "success",
        message,
      });
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "The request could not be submitted.",
      });
    } finally {
      window.turnstile?.reset();
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950";

  return (
    <>
      {siteKey ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
        />
      ) : null}
      <form
        ref={formRef}
        onSubmit={submit}
        className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
      >
        <label className="font-bold text-slate-900">
          Prayer request
          <textarea
            className={`${inputClass} min-h-40`}
            maxLength={5000}
            name="requestText"
            required
            aria-describedby="prayer-guidance"
          />
        </label>
        <p
          className="-mt-3 text-sm leading-6 text-slate-600"
          id="prayer-guidance"
        >
          Maximum 5,000 characters. Please avoid unnecessary medical, financial,
          child-identifying, or third-party details.
        </p>

        <fieldset>
          <legend className="font-bold text-slate-900">
            Who may read this request?
          </legend>
          <label className="mt-3 flex gap-3">
            <input
              defaultChecked
              name="privacyScope"
              type="radio"
              value="team"
            />{" "}
            Prayer team and pastoral leaders
          </label>
          <label className="mt-3 flex gap-3">
            <input name="privacyScope" type="radio" value="pastoral_only" />{" "}
            Pastoral leaders only
          </label>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="font-bold text-slate-900">
            Name (optional)
            <input className={inputClass} maxLength={120} name="name" />
          </label>
          <label className="font-bold text-slate-900">
            Preferred contact
            <select
              className={inputClass}
              defaultValue="none"
              name="preferredContact"
            >
              <option value="none">No follow-up</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
            </select>
          </label>
          <label className="font-bold text-slate-900">
            Email (optional)
            <input
              className={inputClass}
              maxLength={254}
              name="email"
              type="email"
            />
          </label>
          <label className="font-bold text-slate-900">
            Phone (optional)
            <input
              className={inputClass}
              maxLength={40}
              name="phone"
              type="tel"
            />
          </label>
        </div>

        <label className="flex items-start gap-3 leading-6">
          <input className="mt-1" name="followUpConsent" type="checkbox" /> I
          consent to being contacted using the details above.
        </label>
        <label className="flex items-start gap-3 leading-6">
          <input
            className="mt-1"
            name="privacyAcknowledged"
            required
            type="checkbox"
          />{" "}
          I understand who may read this request and that contact details and
          prayer text follow the church retention schedule.
        </label>

        {siteKey ? (
          <div
            className="cf-turnstile"
            data-action="prayer_request"
            data-sitekey={siteKey}
          />
        ) : (
          <p
            className="rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-950"
            role="status"
          >
            Prayer submission is not configured in this environment yet.
          </p>
        )}

        <button
          className="rounded-xl bg-[#244d3d] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!siteKey || status.kind === "submitting"}
          type="submit"
        >
          {status.kind === "submitting"
            ? "Submitting…"
            : "Submit prayer request"}
        </button>
        {status.message ? (
          <p
            className={
              status.kind === "error" ? "text-red-800" : "text-green-800"
            }
            role="status"
            aria-live="polite"
          >
            {status.message}
          </p>
        ) : null}
      </form>
    </>
  );
}
