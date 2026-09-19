import { GivingForm } from "@/frontend/components/public/giving/form";
import {
  PageIntro,
  PublicPage,
} from "@/frontend/components/public/public-page";

export default function GivePage() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;
  return (
    <PublicPage>
      <PageIntro
        eyebrow="Give"
        title="Give Tithes & Offerings"
        description="Choose a purpose and continue to PayMongo’s secure payment page. The church website does not collect your card or wallet credentials."
      />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <GivingForm siteKey={siteKey} />
      </div>
    </PublicPage>
  );
}
