import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/shared/config/site";

type NavigationLink = { href: Route; label: string };

const navigationGroups: Array<{
  label: string;
  links: NavigationLink[];
}> = [
  {
    label: "Our Church",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    label: "Get Connected",
    links: [
      { href: "/ministries", label: "Ministries" },
      { href: "/activities", label: "Calendar" },
    ],
  },
  {
    label: "Updates",
    links: [
      { href: "/announcements", label: "Announcements" },
      { href: "/bulletins", label: "Bulletins" },
    ],
  },
];

const directNavigation: NavigationLink[] = [
  { href: "/sermons", label: "Messages" },
  { href: "/prayer", label: "Prayer" },
  { href: "/give", label: "Give" },
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <Link className="flex items-center gap-3 text-slate-950" href="/">
          <Image
            alt=""
            className="h-10 w-10 rounded-xl bg-slate-950 object-cover shadow-sm"
            height={40}
            priority
            src="/brand/lcm-mark.png"
            width={40}
          />
          <span>
            <span className="block text-base font-black tracking-tight sm:text-lg">{siteConfig.name}</span>
            <span className="block text-xs font-bold tracking-wide text-slate-500 uppercase">Church without walls</span>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-bold text-slate-700 sm:gap-x-4">
            {navigationGroups.map((group) => (
              <li className="relative" key={group.label}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md px-1 py-2 transition hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 [&::-webkit-details-marker]:hidden">
                    {group.label}
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 transition group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </summary>
                  <ul className="absolute left-0 z-50 mt-2 grid min-w-48 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                    {group.links.map((item) => (
                      <li key={item.href}>
                        <Link
                          className="block rounded-lg px-3 py-2 text-slate-800 transition hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
                          href={item.href}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
            {directNavigation.map((item) => (
              <li key={item.href}>
                <Link
                  className="rounded-md px-1 py-2 transition hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
                  href={item.href}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
