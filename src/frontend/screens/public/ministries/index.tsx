import type { Route } from "next";
import Link from "next/link";

import { ContentCover } from "@/frontend/components/public/content-cover";
import {
  EmptyContent,
  PageIntro,
  PublicPage,
} from "@/frontend/components/public/public-page";
import { getPublicMinistries } from "@/backend/queries/public-content-cache";


export default async function MinistriesPage() {
  const ministries = await getPublicMinistries();
  return (
    <PublicPage>
      <PageIntro
        description="Find a ministry where you can connect, grow, serve, and help change lives."
        eyebrow="Get connected"
        title="Ministries"
      />
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {ministries.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {ministries.map((ministry) => (
              <article
                className="overflow-hidden rounded-2xl border border-slate-200"
                key={ministry.id}
              >
                <ContentCover image={ministry.coverImage} />
                <div className="p-5">
                  {ministry.shortName ? (
                    <p className="text-sm font-bold text-green-700">
                      {ministry.shortName}
                    </p>
                  ) : null}
                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    <Link href={`/ministries/${ministry.slug}` as Route}>
                      {ministry.title}
                    </Link>
                  </h2>
                  {ministry.summary ? (
                    <p className="mt-3 leading-7 text-slate-600">
                      {ministry.summary}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyContent>
            No published ministries are available yet.
          </EmptyContent>
        )}
      </section>
    </PublicPage>
  );
}
