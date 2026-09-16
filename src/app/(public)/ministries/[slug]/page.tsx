import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentCover } from "@/components/public/content-cover";
import { PublicPage } from "@/components/public/public-page";
import { getPublicMinistry } from "@/lib/public-content-cache";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ministry" };

export default async function MinistryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ministry = await getPublicMinistry(slug);
  if (!ministry) notFound();
  return (
    <PublicPage>
      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="overflow-hidden rounded-3xl border border-slate-200">
          <ContentCover image={ministry.coverImage} priority />
          <div className="p-6 sm:p-10">
            {ministry.shortName ? (
              <p className="font-bold text-green-700">{ministry.shortName}</p>
            ) : null}
            <h1 className="mt-2 text-4xl font-black text-slate-950 sm:text-5xl">
              {ministry.title}
            </h1>
            <div className="mt-7 leading-8 whitespace-pre-line text-slate-700">
              {ministry.body.text}
            </div>
            {ministry.contactEmail || ministry.contactPhone ? (
              <div className="mt-9 rounded-2xl bg-slate-100 p-5">
                <h2 className="font-black text-slate-950">
                  Connect with this ministry
                </h2>
                {ministry.contactEmail ? (
                  <a
                    className="mt-2 block text-blue-800 underline"
                    href={`mailto:${ministry.contactEmail}`}
                  >
                    {ministry.contactEmail}
                  </a>
                ) : null}
                {ministry.contactPhone ? (
                  <a
                    className="mt-2 block text-blue-800 underline"
                    href={`tel:${ministry.contactPhone}`}
                  >
                    {ministry.contactPhone}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </article>
    </PublicPage>
  );
}
