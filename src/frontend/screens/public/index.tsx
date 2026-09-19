import type { Route } from "next";
import Link from "next/link";

import { PublicPage } from "@/frontend/components/public/public-page";
import { siteConfig } from "@/shared/config/site";

export default function HomePage() {
  return (
    <PublicPage>
      <section className="border-b border-slate-950 bg-[#fffdf8]">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
          <div className="px-4 py-16 sm:px-6 sm:py-24 lg:border-r lg:border-slate-950">
            <p className="text-xs font-black tracking-[0.2em] text-green-700 uppercase">
              Lifechangers Ministry · Baguio City
            </p>
            <h1 className="mt-6 max-w-3xl text-5xl font-black tracking-[-0.06em] text-slate-950 sm:text-7xl lg:text-8xl">
              Love God.
              <br />
              Love people.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-700 sm:text-xl">
              {siteConfig.description}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                className="border border-slate-950 bg-[#1111a8] px-5 py-3 font-black text-white transition-[background-color,transform] duration-150 ease-out hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-800 active:scale-[0.98]"
                href={"/sermons" as Route}
              >
                Watch a sermon
              </Link>
              <Link
                className="border border-slate-950 bg-yellow-300 px-5 py-3 font-black text-slate-950 transition-[background-color,transform] duration-150 ease-out hover:bg-yellow-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-800 active:scale-[0.98]"
                href={"/activities" as Route}
              >
                See what’s happening
              </Link>
            </div>
            <div className="mt-12 grid max-w-xl grid-cols-3 gap-3 border-t border-slate-950 pt-5 text-sm font-bold text-slate-700">
              <Link
                className="hover:text-blue-800 hover:underline"
                href="/prayer"
              >
                Prayer
              </Link>
              <Link
                className="hover:text-blue-800 hover:underline"
                href="/join"
              >
                Join a ministry
              </Link>
              <Link
                className="hover:text-blue-800 hover:underline"
                href="/contact"
              >
                Contact us
              </Link>
            </div>
          </div>
          <figure className="relative min-h-[26rem] border-t border-slate-950 bg-[#1111a8] p-4 sm:p-6 lg:min-h-full lg:border-t-0">
            <div className="flex h-full min-h-[23rem] flex-col justify-between border border-white/70 p-6 text-white sm:p-8">
              <p className="w-fit bg-yellow-300 px-3 py-1 text-xs font-black tracking-[0.16em] text-slate-950 uppercase">
                Church photography
              </p>
              <div>
                <p className="text-xs font-black tracking-[0.16em] text-blue-100 uppercase">
                  Temporary visual placeholder
                </p>
                <h2 className="mt-3 max-w-md text-3xl leading-10 font-black tracking-[-0.035em]">
                  This space is for the real people and life of LCM.
                </h2>
                <p className="mt-4 max-w-sm leading-7 text-blue-100">
                  Official church photos will replace this temporary visual.
                </p>
              </div>
            </div>
            <figcaption className="sr-only">
              Temporary church photography placeholder. Official church photos
              will replace this visual.
            </figcaption>
          </figure>
        </div>
      </section>

      <section
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24"
        aria-labelledby="connect-title"
      >
        <div className="grid gap-8 border-b border-slate-950 pb-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-red-700 uppercase">
              Start here
            </p>
            <h2
              className="mt-3 max-w-md text-4xl font-black tracking-[-0.045em] text-slate-950 sm:text-5xl"
              id="connect-title"
            >
              Church life is meant to be shared.
            </h2>
          </div>
          <p className="max-w-xl text-lg leading-8 text-slate-700">
            Find a message to watch, a ministry to join, a gathering to attend,
            or a way to connect with the church.
          </p>
        </div>
        <ol className="grid border-l border-slate-950 sm:grid-cols-2 lg:grid-cols-3">
          {publicDestinations.map((item) => (
            <li className="border-r border-b border-slate-950" key={item.href}>
              <Link
                className="group block h-full bg-[#fffdf8] p-6 transition-colors duration-150 ease-out hover:bg-slate-950 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-800 sm:p-7"
                href={item.href as Route}
              >
                <span className={`block h-1 w-10 ${item.accentClass}`} />
                <span className="mt-8 flex items-start justify-between gap-4 text-2xl font-black tracking-[-0.035em]">
                  {item.label}
                  <span aria-hidden="true" className="text-xl">
                    ↗
                  </span>
                </span>
                <span className="mt-3 block max-w-xs text-sm leading-6 text-slate-600 transition-colors duration-150 ease-out group-hover:text-slate-300">
                  {item.description}
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            className="border border-slate-950 bg-green-700 px-5 py-3 font-black text-white transition-[background-color,transform] duration-150 ease-out hover:bg-green-800 active:scale-[0.98]"
            href={"/contact" as Route}
          >
            Contact the church
          </Link>
          <Link
            className="border border-slate-950 bg-[#fffdf8] px-5 py-3 font-black text-slate-950 transition-[background-color,transform] duration-150 ease-out hover:bg-yellow-300 active:scale-[0.98]"
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
