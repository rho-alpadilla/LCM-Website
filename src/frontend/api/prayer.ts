export type PrayerContact = {
  name: string | null;
  email: string | null;
  phone: string | null;
  preferredContact: "none" | "email" | "phone";
  followUpConsent: boolean;
};

export async function submitPrayerRequest(form: FormData) {
  const response = await fetch("/api/prayer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestText: form.get("requestText"),
      privacyScope: form.get("privacyScope"),
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      preferredContact: form.get("preferredContact"),
      followUpConsent: form.get("followUpConsent") === "on",
      privacyAcknowledged: form.get("privacyAcknowledged") === "on",
      turnstileToken: form.get("cf-turnstile-response"),
    }),
  });
  const result = (await response.json()) as { message?: string };
  if (!response.ok) throw new Error(result.message || "Submission failed.");
  return result.message || "Your request was submitted.";
}

export async function revealPrayerContact(requestId: string) {
  const response = await fetch(
    `/api/admin/prayer/${encodeURIComponent(requestId)}/contact`,
    {
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error("Contact details could not be revealed.");
  const result = (await response.json()) as { contact: PrayerContact | null };
  return result.contact;
}
