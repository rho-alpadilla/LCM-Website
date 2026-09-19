import { VisitorInquiryForm } from "@/frontend/components/public/visitor-inquiry-form";
import {
  PageIntro,
  PublicPage,
} from "@/frontend/components/public/public-page";
import { getPublicMinistries } from "@/backend/queries/public-content-cache";

export default async function JoinMinistryPage({
  selectedMinistrySlug,
}: {
  selectedMinistrySlug: string | null;
}) {
  const ministries = await getPublicMinistries();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;
  const selectedMinistry = ministries.find(
    (ministry) => ministry.slug === selectedMinistrySlug,
  );

  return (
    <PublicPage>
      <PageIntro
        description="Find a place to grow, serve, and help transform lives, families, campuses, and barangays."
        eyebrow="Get connected"
        title="Join a ministry"
      />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        {!ministries.length ? (
          <p className="mb-6 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            Published ministry details will appear here soon. Once secure form
            submission is enabled, you can also tell us what kind of connection
            or service opportunity you are looking for.
          </p>
        ) : null}
        <VisitorInquiryForm
          inquiryType="ministry_interest"
          ministries={ministries.map((ministry) => ({
            id: ministry.id,
            title: ministry.title,
          }))}
          selectedMinistryId={selectedMinistry?.id ?? null}
          siteKey={siteKey}
        />
      </div>
    </PublicPage>
  );
}
