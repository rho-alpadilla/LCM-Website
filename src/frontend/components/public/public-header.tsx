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
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:py-4">
        <Link
          className="group flex min-w-0 items-center gap-3 text-slate-950"
          href="/"
        >
          <Image
            alt=""
            className="h-10 w-10 shrink-0 rounded-xl bg-slate-950 object-cover shadow-sm ring-1 ring-slate-900/10 transition group-hover:scale-[1.03]"
            height={40}
            priority
            src="/brand/lcm-mark.webp"
            width={40}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-black tracking-tight sm:text-base">
              {siteConfig.name}
            </span>
            <span className="block text-xs font-bold tracking-wide text-slate-500 uppercase">
              Church without walls
            </span>
          </span>
        </Link>
        <PublicDesktopNavigation />
        <PublicMobileNavigation />
      </div>
    </header>
  );
}

function PublicDesktopNavigation() {
  return (
    <nav aria-label="Main navigation" className="hidden lg:block">
      <ul className="flex items-center gap-1 text-sm font-bold text-slate-700">
        {navigationGroups.map((group) => (
          <li className="relative" key={group.label}>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg px-2 py-2 transition hover:bg-slate-100 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 [&::-webkit-details-marker]:hidden">
                {group.label}
                <ChevronDown />
              </summary>
              <ul className="absolute left-0 z-50 mt-3 grid min-w-48 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-950/10">
                {group.links.map((item) => (
                  <li key={item.href}>
                    <Link
                      className="block rounded-xl px-3 py-2 text-slate-800 transition hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
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
              className={
                item.href === "/give"
                  ? "ml-1 rounded-xl bg-yellow-300 px-3 py-2 text-slate-950 shadow-sm transition hover:bg-yellow-200"
                  : "rounded-lg px-2 py-2 transition hover:bg-slate-100 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
              }
              href={item.href}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function PublicMobileNavigation() {
  return (
    <details className="group relative lg:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-900 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 [&::-webkit-details-marker]:hidden">
        Menu
        <ChevronDown />
      </summary>
      <nav
        aria-label="Mobile navigation"
        className="absolute right-0 z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/15"
      >
        <div className="grid gap-4">
          {navigationGroups.map((group) => (
            <div key={group.label}>
              <p className="px-2 text-xs font-black tracking-[0.16em] text-slate-500 uppercase">
                {group.label}
              </p>
              <ul className="mt-1 grid grid-cols-2 gap-1">
                {group.links.map((item) => (
                  <li key={item.href}>
                    <Link
                      className="block rounded-xl px-2 py-2 text-sm font-bold text-slate-800 transition hover:bg-blue-50 hover:text-blue-800"
                      href={item.href}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <ul className="grid grid-cols-3 gap-2 border-t border-slate-200 pt-4">
            {directNavigation.map((item) => (
              <li key={item.href}>
                <Link
                  className={
                    item.href === "/give"
                      ? "block rounded-xl bg-yellow-300 px-2 py-2 text-center text-sm font-black text-slate-950"
                      : "block rounded-xl bg-slate-100 px-2 py-2 text-center text-sm font-bold text-slate-800"
                  }
                  href={item.href}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </details>
  );
}

function ChevronDown() {
  return (
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
  );
}
