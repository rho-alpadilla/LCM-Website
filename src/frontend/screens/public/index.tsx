import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import { PublicPage } from "@/frontend/components/public/public-page";
import { siteConfig } from "@/shared/config/site";

export default function HomePage() {
  return (
    <PublicPage headerVariant="hero">
      <section className="relative isolate flex min-h-[42rem] overflow-hidden bg-slate-950 text-white sm:min-h-[44rem]">
        <Image
          alt="Lifechangers Ministry church family gathered together."
          className="object-cover object-center"
          fill
          priority
          sizes="100vw"
          src="/images/home/lcm-church-family.jpg"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.48)_0%,rgba(2,6,23,0.15)_35%,rgba(2,6,23,0.82)_100%)]"
        />
        <div className="relative mx-auto flex w-full max-w-7xl items-end px-4 pt-32 pb-14 sm:px-6 sm:pt-36 sm:pb-20">
          <div className="max-w-3xl">
            <p className="text-xs font-black tracking-[0.2em] text-white/80 uppercase">
              Lifechangers Ministry · Baguio City
            </p>
            <h1 className="mt-5 text-5xl leading-[0.94] font-black tracking-[-0.055em] text-balance sm:text-7xl lg:text-8xl">
              Love God.
              <br />
              Love people.
            </h1>
            <p className="font-script mt-3 text-4xl leading-none text-white/90 sm:text-5xl">
              Church without walls
            </p>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/90 sm:text-xl">
              {siteConfig.description}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                className="border border-white bg-white px-5 py-3 font-black text-slate-950 transition-[background-color,transform] duration-150 ease-out hover:bg-white/85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:scale-[0.98]"
                href={"/sermons" as Route}
              >
                Watch a sermon
              </Link>
              <Link
                className="border border-white/80 bg-slate-950/10 px-5 py-3 font-black text-white transition-[background-color,transform] duration-150 ease-out hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:scale-[0.98]"
                href={"/activities" as Route}
              >
                See what’s happening
              </Link>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-white/90">
              {quickLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    className="underline decoration-white/50 underline-offset-4 transition-colors duration-150 ease-out hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                    href={item.href as Route}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24"
        aria-labelledby="connect-title"
      >
        <div className="grid gap-8 border-b border-slate-300 pb-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-blue-800 uppercase">
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
        <ol className="mt-2 grid sm:grid-cols-2 lg:grid-cols-3">
          {publicDestinations.map((item) => (
            <li className="border-b border-slate-300" key={item.href}>
              <Link
                className="group flex h-full items-start justify-between gap-4 py-6 pr-4 transition-colors duration-150 ease-out hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-800 sm:py-7 lg:pr-7"
                href={item.href as Route}
              >
                <span>
                  <span className="block text-2xl font-black tracking-[-0.035em]">
                    {item.label}
                  </span>
                  <span className="mt-2 block max-w-xs text-sm leading-6 text-slate-600 transition-colors duration-150 ease-out group-hover:text-slate-700">
                    {item.description}
                  </span>
                </span>
                <span aria-hidden="true" className="mt-1 text-xl">
                  ↗
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            className="border border-slate-950 bg-slate-950 px-5 py-3 font-black text-white transition-[background-color,transform] duration-150 ease-out hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-800 active:scale-[0.98]"
            href={"/contact" as Route}
          >
            Contact the church
          </Link>
          <Link
            className="border border-slate-950 bg-transparent px-5 py-3 font-black text-slate-950 transition-[background-color,transform] duration-150 ease-out hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-800 active:scale-[0.98]"
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
  },
  {
    href: "/ministries",
    label: "Ministries",
    description: "Discover places to connect, grow, and serve.",
  },
  {
    href: "/activities",
    label: "Church calendar",
    description: "See services and upcoming church gatherings by month.",
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
  {
    href: "/about",
    label: "About LCM",
    description: "Read our vision, mission, goals, passion, and values.",
  },
] as const;

const quickLinks = [
  { href: "/prayer", label: "Request prayer" },
  { href: "/join", label: "Join a ministry" },
  { href: "/contact", label: "Contact the church" },
] as const;
