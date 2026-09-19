import { notFound } from "next/navigation";

import { ContentCover } from "@/frontend/components/public/content-cover";
import { PublicPage } from "@/frontend/components/public/public-page";
import { getPublicAnnouncement } from "@/backend/queries/public-content-cache";
import { formatPublicDate } from "@/frontend/lib/public-format";

export default async function AnnouncementPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const announcement = await getPublicAnnouncement(slug);
  if (!announcement) notFound();
  return (
    <PublicPage>
      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="overflow-hidden rounded-3xl border border-slate-200">
          <ContentCover image={announcement.coverImage} priority />
          <div className="p-6 sm:p-10">
            <p className="font-bold text-red-700">
              Posted {formatPublicDate(announcement.publishedAt)}
            </p>
            <h1 className="mt-3 text-4xl font-black text-slate-950 sm:text-5xl">
              {announcement.title}
            </h1>
            <div className="mt-7 leading-8 whitespace-pre-line text-slate-700">
              {announcement.body.text}
            </div>
          </div>
        </div>
      </article>
    </PublicPage>
  );
}
