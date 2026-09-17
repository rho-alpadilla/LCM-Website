import { PrayerRequestForm } from "@/components/public/prayer-request-form";
import { PageIntro, PublicPage } from "@/components/public/public-page";

export const metadata = { title: "Request Prayer" };

export default function PrayerPage() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;
  return (
    <PublicPage>
      <PageIntro
        eyebrow="Prayer care"
        title="How can we pray with you?"
        description="Share a request with the prayer team or choose pastoral-only privacy for a smaller group of church leaders."
      />
      <div className="mx-auto grid max-w-4xl gap-6 px-4 py-12 sm:px-6 sm:py-16">
        <aside
          className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-950"
          aria-labelledby="emergency-title"
        >
          <h2 className="font-black" id="emergency-title">
            This is not an emergency service
          </h2>
          <p className="mt-1">
            If someone is in immediate danger, contact local emergency services
            or a trusted person who can help right now. Do not submit emergency,
            abuse, or safeguarding reports through this form.
          </p>
        </aside>
        <PrayerRequestForm siteKey={siteKey} />
      </div>
    </PublicPage>
  );
}
