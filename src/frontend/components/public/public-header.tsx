import type { Route } from "next";
import Link from "next/link";

import { siteConfig } from "@/shared/config/site";

const navigation = [
  { href: "/sermons", label: "Sermons" },
  { href: "/ministries", label: "Ministries" },
  { href: "/activities", label: "Daily activities" },
  { href: "/announcements", label: "Announcements" },
  { href: "/bulletins", label: "Bulletins" },
  { href: "/prayer", label: "Request prayer" },
  { href: "/give", label: "Give" },
] as const;

export function PublicHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <Link className="text-lg font-black text-slate-950" href="/">
          {siteConfig.name}
        </Link>
        <nav aria-label="Main navigation">
          <ul className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-bold text-slate-700">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link className="hover:text-blue-800" href={item.href as Route}>
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
