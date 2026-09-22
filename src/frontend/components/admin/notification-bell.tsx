import Link from "next/link";
import type { Route } from "next";

import type { AdminNotification } from "@/shared/admin/notifications";

type Props = {
  unreadCount: number;
  notifications: AdminNotification[];
};

export function NotificationBell({ unreadCount, notifications }: Props) {
  const label = unreadCount
    ? `Notifications, ${unreadCount} unread`
    : "Notifications";

  return (
    <details className="group relative">
      <summary
        aria-label={label}
        className="relative flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-blue-300 hover:text-blue-800 [&::-webkit-details-marker]:hidden"
      >
        <BellIcon />
        {unreadCount ? (
          <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-blue-800 px-1 text-[11px] leading-5 font-black text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </summary>
      <div className="absolute right-0 z-30 mt-3 hidden w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl group-open:block">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="font-black text-slate-950">Notifications</p>
          <Link
            className="text-sm font-bold text-blue-800 hover:text-blue-950"
            href={"/admin/notifications" as Route}
          >
            View all
          </Link>
        </div>
        {notifications.length ? (
          <ul className="divide-y divide-slate-100">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <Link
                  className={`block px-4 py-3 transition hover:bg-slate-50 ${
                    notification.readAt ? "" : "bg-blue-50/60"
                  }`}
                  href={notification.href as Route}
                >
                  <p className="text-sm font-bold text-slate-900">
                    {notification.title}
                  </p>
                  {notification.body ? (
                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      {notification.body}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-8 text-sm leading-6 text-slate-600">
            You are all caught up. New work alerts will appear here.
          </p>
        )}
      </div>
    </details>
  );
}

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="19"
      viewBox="0 0 24 24"
      width="19"
    >
      <path
        d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
