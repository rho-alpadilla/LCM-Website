import type { Route } from "next";
import Link from "next/link";

import { PublicPage } from "@/components/public/public-page";
import { siteConfig } from "@/lib/config/site";

export default function HomePage() {
  return (
    <PublicPage>
      <section className="bg-slate-950 text-white">
        <div className="mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-sm font-bold tracking-[0.2em] text-yellow-300 uppercase">
            Love God. Love people.
          </p>
          <h1 className="mt-5 max-w-5xl text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl">
            {siteConfig.name}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
            {siteConfig.description}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              className="rounded-xl bg-yellow-300 px-5 py-3 font-black text-slate-950"
              href={"/sermons" as Route}
            >
              Watch a sermon
            </Link>
            <Link
              className="rounded-xl border border-white/40 px-5 py-3 font-bold text-white"
              href={"/activities" as Route}
            >
              View daily activities
            </Link>
            <Link
              className="rounded-xl border border-white/40 px-5 py-3 font-bold text-white"
              href={"/prayer" as Route}
            >
              Request prayer
            </Link>
          </div>
        </div>
      </section>

      <section
        className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20"
        aria-labelledby="connect-title"
      >
        <p className="text-sm font-bold tracking-[0.2em] text-blue-800 uppercase">
          Explore
        </p>
        <h2
          className="mt-2 text-3xl font-black text-slate-950"
          id="connect-title"
        >
          Connect with church life
        </h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {publicDestinations.map((item) => (
            <Link
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-blue-300 hover:bg-white"
              href={item.href as Route}
              key={item.href}
            >
              <span className="font-black text-slate-950">{item.label}</span>
              <span className="mt-2 block text-sm leading-6 text-slate-600">
                {item.description}
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-8 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
          Contact forms, ministry-interest forms, and online giving remain
          planned Phase 5 features and are not connected yet.
        </p>
      </section>
    </PublicPage>
  );
}

const publicDestinations = [
  {
    href: "/sermons",
    label: "Sermons",
    description: "Watch published messages from the church.",
  },
  {
    href: "/ministries",
    label: "Ministries",
    description: "Discover places to connect, grow, and serve.",
  },
  {
    href: "/activities",
    label: "Daily activities",
    description: "See services and upcoming church gatherings.",
  },
  {
    href: "/announcements",
    label: "Announcements",
    description: "Read current news and important updates.",
  },
  {
    href: "/bulletins",
    label: "Bulletins",
    description: "Download approved church bulletins.",
  },
] as const;
