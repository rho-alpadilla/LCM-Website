import type { Route } from "next";
import Link from "next/link";

import { ContentCover } from "@/frontend/components/public/content-cover";
import {
  EmptyContent,
  PageIntro,
  PublicPage,
} from "@/frontend/components/public/public-page";
import { getPublicSermons } from "@/backend/queries/public-content-cache";
import { formatDuration, formatPublicDate } from "@/frontend/lib/public-format";

export default async function SermonsPage() {
  const sermons = await getPublicSermons();
  return (
    <PublicPage>
      <PageIntro
        description="Watch messages shared by Lifechangers Ministry and continue growing in God’s Word."
        eyebrow="Messages"
        title="Sermons"
      />
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {sermons.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sermons.map((sermon) => (
              <article
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                key={sermon.id}
              >
                <ContentCover image={sermon.coverImage} />
                <div className="p-5">
                  <p className="text-sm font-bold text-blue-800">
                    {formatPublicDate(sermon.preachedAt)}
                  </p>
                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    <Link href={`/sermons/${sermon.slug}` as Route}>
                      {sermon.title}
                    </Link>
                  </h2>
                  {sermon.summary ? (
                    <p className="mt-3 line-clamp-3 leading-7 text-slate-600">
                      {sermon.summary}
                    </p>
                  ) : null}
                  <p className="mt-4 text-sm text-slate-500">
                    {[
                      sermon.speakerName,
                      formatDuration(sermon.durationSeconds),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyContent>No published sermons are available yet.</EmptyContent>
        )}
      </section>
    </PublicPage>
  );
}
