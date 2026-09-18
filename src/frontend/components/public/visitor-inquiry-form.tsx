"use client";

import Script from "next/script";
import { type FormEvent, useRef, useState } from "react";

import { submitVisitorInquiry } from "@/frontend/api/inquiries";
import type { InquiryType } from "@/shared/inquiries/types";

type MinistryOption = {
  id: string;
  title: string;
};

type Status = {
  kind: "idle" | "submitting" | "success" | "error";
  message: string;
};

export function VisitorInquiryForm({
  inquiryType,
  ministries = [],
  selectedMinistryId = null,
  siteKey,
}: {
  inquiryType: InquiryType;
  ministries?: MinistryOption[];
  selectedMinistryId?: string | null;
  siteKey: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });
  const isMinistryInterest = inquiryType === "ministry_interest";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!siteKey || status.kind === "submitting") return;
    setStatus({ kind: "submitting", message: "Sending your message…" });
    try {
      const message = await submitVisitorInquiry(
        new FormData(event.currentTarget),
        inquiryType,
      );
      formRef.current?.reset();
      setStatus({ kind: "success", message });
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error ? error.message : "The message could not be submitted.",
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
        className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
        onSubmit={submit}
        ref={formRef}
      >
        {isMinistryInterest ? (
          <label className="font-bold text-slate-900">
            Ministry you are interested in (optional)
            <select
              className={inputClass}
              defaultValue={selectedMinistryId || ""}
              name="ministryContentId"
            >
              <option value="">Help me find a ministry</option>
              {ministries.map((ministry) => (
                <option key={ministry.id} value={ministry.id}>
                  {ministry.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="font-bold text-slate-900">
            Name
            <input className={inputClass} maxLength={120} name="name" required />
          </label>
          <label className="font-bold text-slate-900">
            Preferred follow-up
            <select className={inputClass} defaultValue="email" name="preferredContact">
              <option value="email">Email</option>
              <option value="phone">Phone</option>
            </select>
          </label>
          <label className="font-bold text-slate-900">
            Email
            <input className={inputClass} maxLength={254} name="email" type="email" />
          </label>
          <label className="font-bold text-slate-900">
            Phone
            <input className={inputClass} maxLength={40} name="phone" type="tel" />
          </label>
        </div>

        <label className="font-bold text-slate-900">
          {isMinistryInterest
            ? "Anything you would like us to know? (optional)"
            : "How can we help?"}
          <textarea
            className={`${inputClass} min-h-40`}
            maxLength={2000}
            name="message"
            required={!isMinistryInterest}
          />
          <span className="mt-2 block text-sm font-normal leading-6 text-slate-600">
            Please avoid sharing unnecessary private details about yourself or another person.
          </span>
        </label>

        <label className="flex items-start gap-3 leading-6">
          <input className="mt-1" name="followUpConsent" required type="checkbox" />
          I consent to the church contacting me using my selected method about this message.
        </label>
        <p className="-mt-3 text-sm leading-6 text-slate-600">
          Only Pastors and approved Core Leaders can access these submissions.
          Once an inquiry is closed, its details are automatically redacted after 90 days.
        </p>

        {siteKey ? (
          <div
            className="cf-turnstile"
            data-action="visitor_inquiry"
            data-sitekey={siteKey}
          />
        ) : (
          <p className="rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-950" role="status">
            Secure message submission will be enabled when the church Turnstile setup is complete.
          </p>
        )}

        <button
          className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!siteKey || status.kind === "submitting"}
          type="submit"
        >
          {status.kind === "submitting" ? "Sending…" : "Send message"}
        </button>
        {status.message ? (
          <p
            className={status.kind === "error" ? "text-red-800" : "text-green-800"}
            aria-live="polite"
            role="status"
          >
            {status.message}
          </p>
        ) : null}
      </form>
    </>
  );
}
