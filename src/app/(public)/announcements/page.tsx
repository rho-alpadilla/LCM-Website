import type { Metadata, Route } from "next";
import Link from "next/link";

import { ContentCover } from "@/components/public/content-cover";
import {
  EmptyContent,
  PageIntro,
  PublicPage,
} from "@/components/public/public-page";
import { getPublicAnnouncements } from "@/lib/public-content-cache";
import { formatPublicDate } from "@/lib/public-format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const announcements = await getPublicAnnouncements();
  return (
    <PublicPage>
      <PageIntro
        description="Current church news and important community updates."
        eyebrow="Stay informed"
        title="Announcements"
      />
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {announcements.length ? (
          <div className="grid gap-6 md:grid-cols-2">
            {announcements.map((announcement) => (
              <article
                className="overflow-hidden rounded-2xl border border-slate-200"
                key={announcement.id}
              >
                <ContentCover image={announcement.coverImage} />
                <div className="p-5">
                  <p className="text-sm font-bold text-red-700">
                    Posted {formatPublicDate(announcement.publishedAt)}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    <Link href={`/announcements/${announcement.slug}` as Route}>
                      {announcement.title}
                    </Link>
                  </h2>
                  {announcement.summary ? (
                    <p className="mt-3 leading-7 text-slate-600">
                      {announcement.summary}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyContent>There are no current announcements.</EmptyContent>
        )}
      </section>
    </PublicPage>
  );
}
