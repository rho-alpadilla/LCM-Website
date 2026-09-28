import {
  EmptyContent,
  PageIntro,
  PublicPage,
} from "@/frontend/components/public/public-page";

export default function ResourcesPage() {
  return (
    <PublicPage>
      <PageIntro
        description="Church learning materials will be shared here as they become available."
        eyebrow="Resources"
        title="Learn and grow"
      />
      <section className="public-container public-resources-section">
        <EmptyContent>
          <strong>Coming soon.</strong> Bible studies, church guides, and other
          ministry resources are being prepared.
        </EmptyContent>
      </section>
    </PublicPage>
  );
}
