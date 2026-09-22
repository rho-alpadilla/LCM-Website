import Link from "next/link";
import type { Route } from "next";

import { logoutAction } from "@/backend/actions/auth";
import { manageableContentTypes } from "@/shared/content/options";
import type { AdminNotificationSummary } from "@/shared/admin/notifications";
import type { StaffContext } from "@/shared/staff/types";
import { NotificationBell } from "./notification-bell";

type NavigationItem = {
  href: Route;
  label: string;
  description: string;
};

export function AdminHeader({
  context,
  notifications,
}: {
  context: StaffContext;
  notifications: AdminNotificationSummary;
}) {
  const navigation = getNavigation(context);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Brand compact />
          <div className="flex items-center gap-2">
            <NotificationBell {...notifications} />
            <details className="relative">
              <summary className="cursor-pointer rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800 [&::-webkit-details-marker]:hidden">
                Menu
              </summary>
              <div className="absolute right-0 z-30 mt-3 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                <Navigation items={navigation} />
                <div className="mt-2 border-t border-slate-100 pt-2">
                  <AccountMenu context={context} />
                </div>
              </div>
            </details>
          </div>
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r border-slate-200 bg-white px-4 py-6 lg:flex">
        <div className="flex items-center justify-between gap-3">
          <Brand />
          <NotificationBell {...notifications} />
        </div>
        <nav aria-label="Administration" className="mt-10 space-y-1">
          <Navigation items={navigation} />
        </nav>
        <div className="mt-auto border-t border-slate-100 pt-4">
          <AccountMenu context={context} />
        </div>
      </aside>
    </>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      className="group inline-flex min-w-0 items-center gap-3"
      href="/admin"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-800 font-black text-white shadow-sm">
        L
      </span>
      <span className={compact ? "sr-only" : "min-w-0"}>
        <span className="block truncate font-black text-slate-950">
          Lifechangers
        </span>
        <span className="block text-xs font-bold tracking-[0.18em] text-slate-500 uppercase">
          Admin workspace
        </span>
      </span>
    </Link>
  );
}

function Navigation({ items }: { items: NavigationItem[] }) {
  return (
    <>
      {items.map((item) => (
        <Link
          className="group flex items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-blue-50 focus-visible:outline-offset-[-2px]"
          href={item.href}
          key={item.href}
        >
          <span className="mt-1 size-2 shrink-0 rounded-full bg-blue-700 transition group-hover:scale-125" />
          <span>
            <span className="block font-bold text-slate-900">{item.label}</span>
            <span className="mt-0.5 block text-xs leading-5 text-slate-500">
              {item.description}
            </span>
          </span>
        </Link>
      ))}
    </>
  );
}

function AccountMenu({ context }: { context: StaffContext }) {
  return (
    <details className="group relative">
      <summary className="flex w-full cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block truncate font-bold text-slate-950">
            {context.displayName}
          </span>
          <span className="block truncate text-sm text-slate-500">
            {context.email}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="text-slate-500 group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg lg:absolute lg:bottom-full lg:left-0 lg:mb-2 lg:w-full">
        <Link
          className="block rounded-lg px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50"
          href={"/admin/profile" as Route}
        >
          My account
        </Link>
        <form action={logoutAction}>
          <button
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-red-800 hover:bg-red-50"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}

function getNavigation(context: StaffContext): NavigationItem[] {
  const items: NavigationItem[] = [
    {
      href: "/admin",
      label: "Dashboard",
      description: "Your role and current work",
    },
  ];

  if (manageableContentTypes(context.permissions).length) {
    items.push({
      href: "/admin/content",
      label: "Content",
      description: "Draft, review, and publish",
    });
  }
  if (context.permissions.includes("content.media.manage")) {
    items.push({
      href: "/admin/media",
      label: "Media library",
      description: "Images and bulletin files",
    });
  }
  if (context.permissions.includes("prayer.read_team")) {
    items.push({
      href: "/admin/prayer",
      label: "Prayer care",
      description: "Approved prayer requests only",
    });
  }
  if (
    context.permissions.includes("contact.read") ||
    context.permissions.includes("ministry_interest.read")
  ) {
    items.push({
      href: "/admin/inquiries",
      label: "Inquiries",
      description: "Contact and ministry interest",
    });
  }
  if (context.permissions.includes("staff.read")) {
    items.push({
      href: "/admin/staff",
      label: "Staff & access",
      description: "People, roles, and sign-in setup",
    });
  }
  return items;
}
