import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/shared/config/site";

export type PublicHeaderVariant = "default" | "hero";

const navigationGroups = [
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
      { href: "/join", label: "Join a ministry" },
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
] as const;

const directNavigation = [
  { href: "/sermons", label: "Messages" },
  { href: "/prayer", label: "Prayer" },
  { href: "/give", label: "Give" },
] as const;

export function PublicHeader({
  variant = "default",
}: {
  variant?: PublicHeaderVariant;
}) {
  return (
    <header className="public-header" data-variant={variant}>
      <div className="public-container public-header-inner">
        <Link className="public-brand" href="/" aria-label={siteConfig.name}>
          <Image
            alt=""
            src="/brand/lcm-mark.webp"
            width={40}
            height={40}
            className="public-brand-mark"
          />
          <span>
            <span className="public-brand-name">Lifechangers</span>
            <span className="public-brand-caption">Ministry Incorporated</span>
          </span>
        </Link>
        <nav aria-label="Main navigation" className="public-desktop-nav">
          {navigationGroups.map((group) => (
            <details
              className="public-nav-group"
              name="public-navigation"
              key={group.label}
            >
              <summary>
                {group.label}
                <ChevronDown />
              </summary>
              <ul className="public-dropdown">
                {group.links.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href as Route}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
          {directNavigation.map((item) => (
            <Link
              className={
                item.href === "/give"
                  ? "public-button public-button-dark public-nav-give"
                  : "public-nav-link"
              }
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <details className="public-mobile-nav">
          <summary>
            Menu
            <ChevronDown />
          </summary>
          <nav aria-label="Mobile navigation" className="public-mobile-panel">
            {navigationGroups.map((group) => (
              <div key={group.label}>
                <p className="public-eyebrow">{group.label}</p>
                <ul>
                  {group.links.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href as Route}>{item.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="public-mobile-actions">
              {directNavigation.map((item) => (
                <Link href={item.href} key={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </details>
      </div>
    </header>
  );
}

function ChevronDown() {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
