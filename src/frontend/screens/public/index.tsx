import type { Route } from "next";
import Link from "next/link";

import { PublicPage } from "@/frontend/components/public/public-page";
import { siteConfig } from "@/shared/config/site";

export default function HomePage() {
  return (
    <PublicPage>
      <section className="relative isolate overflow-hidden bg-[linear-gradient(120deg,#020617_0%,#1111a8_60%,#080c35_100%)] text-white">
        <div
          aria-hidden="true"
          className="absolute -top-32 -right-28 h-80 w-80 rounded-full bg-yellow-300/15 blur-3xl"
        />
        <div className="relative mx-auto grid min-h-[72vh] max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <p className="text-sm font-bold tracking-[0.2em] text-yellow-300 uppercase">
              Love God. Love people.
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-balance sm:text-6xl lg:text-7xl">
              {siteConfig.name}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
              {siteConfig.description}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                className="rounded-xl bg-yellow-300 px-5 py-3 font-black text-slate-950 shadow-lg shadow-yellow-300/10 transition hover:-translate-y-0.5 hover:bg-yellow-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow-300"
                href={"/sermons" as Route}
              >
                Watch a sermon
              </Link>
              <Link
                className="rounded-xl border border-white/40 bg-white/5 px-5 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                href={"/activities" as Route}
              >
                View calendar
              </Link>
              <Link
                className="rounded-xl border border-white/40 bg-white/5 px-5 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                href={"/prayer" as Route}
              >
                Request prayer
              </Link>
              <Link
                className="rounded-xl border border-white/40 bg-white/5 px-5 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                href={"/join" as Route}
              >
                Join a ministry
              </Link>
            </div>
          </div>
          <aside className="relative hidden overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl shadow-slate-950/30 backdrop-blur-sm lg:block">
            <div
              aria-hidden="true"
              className="absolute top-0 right-0 h-2 w-1/4 bg-yellow-300"
            />
            <p className="text-sm font-black tracking-[0.2em] text-yellow-300 uppercase">
              Church without walls
            </p>
            <p className="mt-6 text-3xl leading-10 font-black text-white">
              A family of Christ’s Lifechangers.
            </p>
            <p className="mt-5 leading-7 text-slate-200">
              Transforming lives, families, campuses, barangays, and nations
              through Family Cell Groups.
            </p>
            <div aria-hidden="true" className="mt-10 flex items-end gap-2">
              <span className="h-12 w-12 bg-blue-800" />
              <span className="h-20 w-12 bg-green-600" />
              <span className="h-28 w-12 bg-yellow-300" />
              <span className="h-36 w-12 bg-red-700" />
            </div>
          </aside>
        </div>
      </section>

      <section
        className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20"
        aria-labelledby="connect-title"
      >
        <p className="text-sm font-bold tracking-[0.2em] text-blue-800 uppercase">
          Explore
        </p>
        <h2
          className="mt-2 max-w-xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl"
          id="connect-title"
        >
          Connect with church life
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {publicDestinations.map((item) => (
            <Link
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-1 hover:border-blue-300 hover:bg-white hover:shadow-lg hover:shadow-blue-950/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-800"
              href={item.href as Route}
              key={item.href}
            >
              <span
                aria-hidden="true"
                className={`absolute top-0 left-0 h-1 w-full ${item.accentClass}`}
              />
              <span className="flex items-center justify-between gap-4 font-black text-slate-950">
                {item.label}
                <span className="text-xl text-blue-800 transition group-hover:translate-x-1">
                  →
                </span>
              </span>
              <span className="mt-2 block text-sm leading-6 text-slate-600">
                {item.description}
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white shadow-lg shadow-blue-950/10 transition hover:-translate-y-0.5 hover:bg-blue-900"
            href={"/contact" as Route}
          >
            Contact the church
          </Link>
          <Link
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-900 transition hover:-translate-y-0.5 hover:border-slate-950"
            href={"/give" as Route}
          >
            Give tithes &amp; offerings
          </Link>
        </div>
      </section>
    </PublicPage>
  );
}

const publicDestinations = [
  {
    href: "/sermons",
    label: "Sermons",
    description: "Watch published messages from the church.",
    accentClass: "bg-blue-800",
  },
  {
    href: "/ministries",
    label: "Ministries",
    description: "Discover places to connect, grow, and serve.",
    accentClass: "bg-green-600",
  },
  {
    href: "/activities",
    label: "Church calendar",
    description: "See services and upcoming church gatherings by month.",
    accentClass: "bg-yellow-300",
  },
  {
    href: "/announcements",
    label: "Announcements",
    description: "Read current news and important updates.",
    accentClass: "bg-red-700",
  },
  {
    href: "/bulletins",
    label: "Bulletins",
    description: "Download approved church bulletins.",
    accentClass: "bg-blue-800",
  },
  {
    href: "/about",
    label: "About LCM",
    description: "Read our vision, mission, goals, passion, and values.",
    accentClass: "bg-green-600",
  },
] as const;
