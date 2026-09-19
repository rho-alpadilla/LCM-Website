import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/shared/config/site";

type NavigationLink = { href: Route; label: string };
export type PublicHeaderVariant = "default" | "hero";

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

export function PublicHeader({
  variant = "default",
}: {
  variant?: PublicHeaderVariant;
}) {
  const isHero = variant === "hero";

  return (
    <header
      className={
        isHero
          ? "absolute inset-x-0 top-0 z-40 border-b border-white/20 bg-slate-950/20 text-white backdrop-blur-[2px]"
          : "sticky top-0 z-40 border-b border-slate-950 bg-[#f7f4ed]"
      }
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          className={`flex min-w-0 items-center gap-3 ${
            isHero ? "text-white" : "text-slate-950"
          }`}
          href="/"
        >
          <Image
            alt=""
            className="h-10 w-10 shrink-0 bg-slate-950 object-cover"
            height={40}
            priority
            src="/brand/lcm-mark.webp"
            width={40}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-black tracking-[-0.025em] sm:text-base">
              {siteConfig.name}
            </span>
            <span
              className={`block text-[0.65rem] font-black tracking-[0.18em] uppercase ${
                isHero ? "text-white/75" : "text-slate-600"
              }`}
            >
              Church without walls
            </span>
          </span>
        </Link>
        <PublicDesktopNavigation isHero={isHero} />
        <PublicMobileNavigation isHero={isHero} />
      </div>
    </header>
  );
}

function PublicDesktopNavigation({ isHero }: { isHero: boolean }) {
  return (
    <nav aria-label="Main navigation" className="hidden lg:block">
      <ul
        className={`flex items-center gap-1 text-xs font-black tracking-[0.08em] uppercase ${
          isHero ? "text-white" : "text-slate-800"
        }`}
      >
        {navigationGroups.map((group) => (
          <li className="relative" key={group.label}>
            <details className="group">
              <summary
                className={`flex cursor-pointer list-none items-center gap-1 px-3 py-2 transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden ${
                  isHero
                    ? "hover:bg-white/10 focus-visible:outline-white"
                    : "hover:text-blue-800 focus-visible:outline-blue-800"
                }`}
              >
                {group.label}
                <ChevronDown />
              </summary>
              <ul className="absolute left-0 z-50 mt-3 grid min-w-52 gap-1 border border-slate-950 bg-[#fffdf8] p-2 shadow-[5px_5px_0_#1111a8]">
                {group.links.map((item) => (
                  <li key={item.href}>
                    <Link
                      className="block px-3 py-2 text-slate-800 transition-colors duration-150 ease-out hover:bg-yellow-300 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
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
                  ? isHero
                    ? "ml-2 border border-white/70 bg-white/10 px-3 py-2 text-white transition-[background-color,transform] duration-150 ease-out hover:bg-white hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.98]"
                    : "ml-2 border border-slate-950 bg-red-700 px-3 py-2 text-white transition-[background-color,transform] duration-150 ease-out hover:bg-red-800 active:scale-[0.98]"
                  : isHero
                    ? "px-3 py-2 transition-colors duration-150 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    : "px-3 py-2 transition-colors duration-150 ease-out hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
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

function PublicMobileNavigation({ isHero }: { isHero: boolean }) {
  return (
    <details className="group relative lg:hidden">
      <summary
        className={`flex cursor-pointer list-none items-center gap-2 border px-3 py-2 text-xs font-black tracking-[0.08em] uppercase transition-[background-color,transform] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] [&::-webkit-details-marker]:hidden ${
          isHero
            ? "border-white/70 bg-slate-950/20 text-white hover:bg-white/10 focus-visible:outline-white"
            : "border-slate-950 bg-[#fffdf8] text-slate-900 hover:bg-yellow-300 focus-visible:outline-blue-800"
        }`}
      >
        Menu
        <ChevronDown />
      </summary>
      <nav
        aria-label="Mobile navigation"
        className="absolute right-0 z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] border border-slate-950 bg-[#fffdf8] p-4 shadow-[5px_5px_0_#1111a8]"
      >
        <div className="grid gap-4">
          {navigationGroups.map((group) => (
            <div key={group.label}>
              <p className="px-2 text-[0.65rem] font-black tracking-[0.16em] text-slate-600 uppercase">
                {group.label}
              </p>
              <ul className="mt-1 grid grid-cols-2 gap-1">
                {group.links.map((item) => (
                  <li key={item.href}>
                    <Link
                      className="block px-2 py-2 text-sm font-bold text-slate-800 transition-colors duration-150 ease-out hover:bg-yellow-300 hover:text-slate-950"
                      href={item.href}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <ul className="grid grid-cols-3 gap-2 border-t border-slate-950 pt-4">
            {directNavigation.map((item) => (
              <li key={item.href}>
                <Link
                  className={
                    item.href === "/give"
                      ? "block border border-slate-950 bg-red-700 px-2 py-2 text-center text-sm font-black text-white active:scale-[0.98]"
                      : "block border border-slate-300 bg-[#f1eee6] px-2 py-2 text-center text-sm font-bold text-slate-800 active:scale-[0.98]"
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
