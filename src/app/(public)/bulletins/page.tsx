import type { Metadata } from "next";

import { ContentCover } from "@/components/public/content-cover";
import {
  EmptyContent,
  PageIntro,
  PublicPage,
} from "@/components/public/public-page";
import {
  publicMediaUrl,
} from "@/lib/public-content";
import { getPublicBulletins } from "@/lib/public-content-cache";
import { formatPublicDate } from "@/lib/public-format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bulletins" };

export default async function BulletinsPage() {
  const bulletins = await getPublicBulletins();
  return (
    <PublicPage>
      <PageIntro
        description="Download published church bulletins and keep up with ministry life."
        eyebrow="Church resources"
        title="Bulletins"
      />
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {bulletins.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {bulletins.map((bulletin) => (
              <article
                className="overflow-hidden rounded-2xl border border-slate-200"
                key={bulletin.id}
              >
                <ContentCover image={bulletin.coverImage} />
                <div className="p-5">
                  <p className="text-sm font-bold text-blue-800">
                    {formatPublicDate(bulletin.issueDate)}
                  </p>
                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    {bulletin.title}
                  </h2>
                  {bulletin.editionLabel ? (
                    <p className="mt-2 text-slate-600">
                      {bulletin.editionLabel}
                    </p>
                  ) : null}
                  <a
                    className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-3 font-bold text-white"
                    href={publicMediaUrl(bulletin.fileMediaId)}
                  >
                    Download PDF
                    <span className="sr-only">: {bulletin.title}</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyContent>No published bulletins are available yet.</EmptyContent>
        )}
      </section>
    </PublicPage>
  );
}
