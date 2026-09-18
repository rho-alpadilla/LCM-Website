import type { InquiryType } from "@/shared/inquiries/types";

export async function submitVisitorInquiry(
  form: FormData,
  inquiryType: InquiryType,
) {
  const response = await fetch("/api/inquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inquiryType,
      ministryContentId: form.get("ministryContentId") || null,
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      preferredContact: form.get("preferredContact"),
      followUpConsent: form.get("followUpConsent") === "on",
      message: form.get("message"),
      turnstileToken: form.get("cf-turnstile-response"),
    }),
  });
  const result = (await response.json()) as { message?: string };
  if (!response.ok) {
    throw new Error(result.message || "The message could not be submitted.");
  }
  return result.message || "Your message was submitted.";
}
