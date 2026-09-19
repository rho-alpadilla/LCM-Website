import { VisitorInquiryForm } from "@/frontend/components/public/inquiries/visitor-inquiry-form";
import {
  PageIntro,
  PublicPage,
} from "@/frontend/components/public/public-page";
import { siteConfig } from "@/shared/config/site";

export default function ContactPage() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;
  return (
    <PublicPage>
      <PageIntro
        description="Questions, a need for connection, or a message for the church? We would love to hear from you."
        eyebrow="Connect"
        title="Contact the church"
      />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.75fr_1.25fr]">
        <aside className="rounded-3xl bg-slate-950 p-6 text-slate-200 sm:p-8">
          <h2 className="text-2xl font-black text-white">
            Lifechangers Ministry Incorporated
          </h2>
          <dl className="mt-6 grid gap-5 text-sm leading-6">
            <div>
              <dt className="font-bold text-yellow-300">Address</dt>
              <dd className="mt-1">{siteConfig.contact.address}</dd>
            </div>
            <div>
              <dt className="font-bold text-yellow-300">Phone</dt>
              <dd className="mt-1">
                <a
                  className="underline"
                  href={`tel:${siteConfig.contact.phone}`}
                >
                  {siteConfig.contact.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-bold text-yellow-300">Email</dt>
              <dd className="mt-1">
                <a
                  className="underline"
                  href={`mailto:${siteConfig.contact.email}`}
                >
                  {siteConfig.contact.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-bold text-yellow-300">Facebook</dt>
              <dd className="mt-1">
                <a
                  className="underline"
                  href={siteConfig.contact.facebookUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  LCM Agents of Change
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </dd>
            </div>
          </dl>
          <p className="mt-8 rounded-2xl bg-white/10 p-4 text-sm leading-6">
            Service schedules are published in the church calendar once
            confirmed.
          </p>
        </aside>
        <VisitorInquiryForm inquiryType="contact" siteKey={siteKey} />
      </div>
    </PublicPage>
  );
}
