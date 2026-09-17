"use client";

import { useState } from "react";

import { revealPrayerContact, type PrayerContact } from "@/frontend/api/prayer";

export function PrayerContactReveal({ requestId }: { requestId: string }) {
  const [contact, setContact] = useState<PrayerContact | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function reveal() {
    setLoading(true);
    setError("");
    try {
      setContact(await revealPrayerContact(requestId));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Contact details could not be revealed.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (contact !== undefined) {
    return contact ? (
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-bold text-slate-600">Name</dt>
          <dd>{contact.name || "Not provided"}</dd>
        </div>
        <div>
          <dt className="font-bold text-slate-600">Follow-up consent</dt>
          <dd>{contact.followUpConsent ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="font-bold text-slate-600">Email</dt>
          <dd>{contact.email || "Not provided"}</dd>
        </div>
        <div>
          <dt className="font-bold text-slate-600">Phone</dt>
          <dd>{contact.phone || "Not provided"}</dd>
        </div>
      </dl>
    ) : (
      <p className="mt-3 text-sm text-slate-600">
        No contact details are available.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <button
        className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-800"
        disabled={loading}
        onClick={reveal}
        type="button"
      >
        {loading ? "Revealing…" : "Reveal contact details"}
      </button>
      <p className="mt-2 text-xs text-slate-500">
        This deliberate reveal is recorded in the audit log.
      </p>
      {error ? (
        <p className="mt-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
