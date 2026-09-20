import { notFound } from "next/navigation";

import { ContentCover } from "@/frontend/components/public/content-cover";
import { PublicPage } from "@/frontend/components/public/public-page";
import { getPublicSermon } from "@/backend/queries/content/public-cache";
import { formatDuration, formatPublicDate } from "@/frontend/lib/public-format";

export default async function SermonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sermon = await getPublicSermon(slug);
  if (!sermon) notFound();

  return (
    <PublicPage>
      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <ContentCover image={sermon.coverImage} priority />
          <div className="p-6 sm:p-10">
            <p className="font-bold text-[#244d3d]">
              {formatPublicDate(sermon.preachedAt)}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              {sermon.title}
            </h1>
            <dl className="mt-6 grid gap-3 text-slate-600 sm:grid-cols-2">
              {sermon.speakerName ? (
                <div>
                  <dt className="font-bold text-slate-950">Speaker</dt>
                  <dd>{sermon.speakerName}</dd>
                </div>
              ) : null}
              {sermon.seriesTitle ? (
                <div>
                  <dt className="font-bold text-slate-950">Series</dt>
                  <dd>{sermon.seriesTitle}</dd>
                </div>
              ) : null}
              {sermon.scriptureReference ? (
                <div>
                  <dt className="font-bold text-slate-950">Scripture</dt>
                  <dd>{sermon.scriptureReference}</dd>
                </div>
              ) : null}
              {sermon.durationSeconds ? (
                <div>
                  <dt className="font-bold text-slate-950">Length</dt>
                  <dd>{formatDuration(sermon.durationSeconds)}</dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-8 leading-8 whitespace-pre-line text-slate-700">
              {sermon.body.text}
            </div>
            <a
              className="mt-9 inline-flex rounded-xl bg-[#244d3d] px-5 py-3 font-bold text-white"
              href={sermon.videoUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              Watch on{" "}
              {sermon.videoProvider === "youtube" ? "YouTube" : "Facebook"}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </div>
      </article>
    </PublicPage>
  );
}
