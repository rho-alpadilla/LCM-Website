"use client";

import Script from "next/script";
import { FormEvent, useRef, useState } from "react";

import { startGivingCheckout } from "@/frontend/api/giving";

type Status = {
  kind: "idle" | "submitting" | "error";
  message: string;
};

export function GivingForm({ siteKey }: { siteKey: string | null }) {
  const idempotencyKey = useRef<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!siteKey || status.kind === "submitting") return;
    idempotencyKey.current ??= crypto.randomUUID();
    setStatus({ kind: "submitting", message: "Opening secure checkout…" });

    const form = new FormData(event.currentTarget);
    try {
      const checkoutUrl = await startGivingCheckout(
        form,
        idempotencyKey.current,
      );
      window.location.assign(checkoutUrl);
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "The secure checkout could not be started.",
      });
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
        className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
        onSubmit={submit}
      >
        <label className="font-bold text-slate-900">
          Amount in Philippine pesos
          <input
            className={inputClass}
            inputMode="decimal"
            max="100000"
            min="1"
            name="amount"
            placeholder="0.00"
            required
            step="0.01"
            type="number"
          />
          <span className="mt-2 block text-sm leading-6 font-normal text-slate-600">
            Enter ₱1.00 to ₱100,000.00. A ₱0 payment cannot be processed.
          </span>
        </label>

        <fieldset>
          <legend className="font-bold text-slate-900">Giving purpose</legend>
          <label className="mt-3 flex gap-3">
            <input
              defaultChecked
              name="purpose"
              type="radio"
              value="general_church"
            />
            Tithes &amp; Offerings
          </label>
          <label className="mt-3 flex gap-3">
            <input name="purpose" type="radio" value="church_building" />
            Church Building Fund
          </label>
          <label className="mt-3 flex gap-3">
            <input name="purpose" type="radio" value="love_gift" />
            Love Gift
          </label>
        </fieldset>

        <aside className="rounded-xl bg-slate-100 p-4 text-sm leading-6 text-slate-700">
          PayMongo will show any payment-method fee before you confirm. Love
          Gift is a church-managed fund at launch. Please contact the church
          directly for questions about a specific person; do not enter a
          recipient name here.
        </aside>

        {siteKey ? (
          <div
            className="cf-turnstile"
            data-action="giving_checkout"
            data-sitekey={siteKey}
          />
        ) : (
          <p
            className="rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-950"
            role="status"
          >
            Online giving is not configured in this environment yet.
          </p>
        )}

        <button
          className="rounded-xl bg-[#244d3d] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!siteKey || status.kind === "submitting"}
          type="submit"
        >
          {status.kind === "submitting"
            ? "Opening secure checkout…"
            : "Give securely"}
        </button>
        {status.message ? (
          <p className="text-red-800" role="status" aria-live="polite">
            {status.message}
          </p>
        ) : null}
      </form>
    </>
  );
}
