import Link from "next/link";

import {
  PageIntro,
  PublicPage,
} from "@/frontend/components/public/public-page";

export default function GivingSuccessPage() {
  return (
    <PublicPage>
      <PageIntro
        eyebrow="Thank you"
        title="Your giving is being confirmed"
        description="A return to this page does not by itself confirm payment. The church records a giving result only after PayMongo’s verified notification arrives."
      />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="rounded-2xl border border-slate-200 bg-slate-50 p-6 leading-7 text-slate-700">
          PayMongo may send a payment receipt to the email entered during
          checkout. If you need help, please contact the church with the
          PayMongo reference.
        </p>
        <Link
          className="mt-6 inline-flex rounded-xl bg-blue-800 px-5 py-3 font-bold text-white"
          href="/"
        >
          Return to home
        </Link>
      </div>
    </PublicPage>
  );
}
